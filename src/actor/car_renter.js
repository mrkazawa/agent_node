const fs = require('fs');
const http = require('http');
const {
  performance
} = require('perf_hooks');
const axios = require('axios').default;

const computeEngine = require('../compute/ethereum_engine');
const paymentEngine = require('../payment/iota_engine');

const NOTARY_BASE_URL = 'http://notary2.local:3002';
const PAYMENT_INFO_URL = NOTARY_BASE_URL + '/tx_hash';
const CAR_INFO_URL = NOTARY_BASE_URL + '/car_info';
const CONTRACT_ABI_URL = NOTARY_BASE_URL + '/contract_abi';

// compute params
const NETWORK_ID = '2020';
const RENTER_CREDS_PATH = '/home/vagrant/src/compute/car_renter_credentials.json';
const RENTER_ADDRESS = computeEngine.convertToChecksumAddress(readJsonFile(RENTER_CREDS_PATH).address);

// performance params
const RESULT_DATA_PATH = '/home/vagrant/result_car_renter.csv';
fs.writeFileSync(RESULT_DATA_PATH, ""); // clear file

// global temporary car information
let ipfsHash;
let feeAmount;
let feeAddress;
let feeTag;

async function getCarInfo() {
  console.log('Getting Car Info From Rental Car App..');
  const startGetCarInfo = performance.now();

  const options = {
    method: 'get',
    url: CAR_INFO_URL,
    httpAgent: new http.Agent({
      keepAlive: false
    })
  };

  const response = await sendRequest(options);
  if (response instanceof Error) {
    processError(response);
  }

  ipfsHash = response.data.hash;
  feeAmount = response.data.fee_amount;
  feeAddress = response.data.fee_address;
  feeTag = response.data.fee_tag;

  const endGetCarInfo = performance.now();
  savingResult('Get Car Info From App', startGetCarInfo, endGetCarInfo);
  console.log(`${ipfsHash} car info obtained!`);
}

async function sendPayment() {
  console.log('Paying Car to IOTA..');
  const startSendPayment = performance.now();

  const transfers = [{
    value: feeAmount,
    address: feeAddress,
    tag: feeTag
  }];

  const tailTxHash = await paymentEngine.sendTx(transfers);
  if (tailTxHash instanceof Error) {
    processError(tailTxHash);
  }

  const endSendPayment = performance.now();
  savingResult('Send Payment to IOTA', startSendPayment, endSendPayment);
  console.log(`${tailTxHash} tx hash obtained!`);

  return tailTxHash;
}

async function sendTxHash(tailTxHash) {
  console.log('Sending Car Payment Hash to App..');
  const startSendHash = performance.now();

  const payload = {
    car_hash: ipfsHash,
    payment_hash: tailTxHash,
    renter_address: RENTER_ADDRESS
  };

  const options = {
    method: 'post',
    url: PAYMENT_INFO_URL,
    data: payload,
    httpAgent: new http.Agent({
      keepAlive: false
    })
  };

  const response = await sendRequest(options);
  if (response instanceof Error) {
    processError(response);
  }

  const endSendHash = performance.now();
  savingResult('Send Tx Hash to App', startSendHash, endSendHash);
  console.log(`${tailTxHash} is sent to Rental Car application`);
}

async function sendRequest(options) {
  try {
    return await axios(options);
  } catch (err) {
    return new Error(`Error sending request ${err}`);
  }
}

function processError(error) {
  console.log(error);
  process.exit(69);
}

/**
 * Get JSON file from given path.
 * 
 * @param {string} path     The path to the JSON file
 */
function readJsonFile(path) {
  if (fs.existsSync(path)) {
    const rawdata = fs.readFileSync(path);
    return JSON.parse(rawdata);
  } else {
    throw new Error(`${path} does not exist`);
  }
}

/**
 * Appending delta of performance.now() checkpoint to file.
 * 
 * @param {string} scenario   The scenario description of this delta
 * @param {number} start      The start point of performance.now()
 * @param {number} end        The end point of performance.now()
 */
function savingResult(scenario, start, end) {
  const delta = end - start;
  const row = scenario + "," +
    delta + "," +
    "\r\n";
  fs.appendFileSync(RESULT_DATA_PATH, row);
}

async function main() {
  await getCarInfo();
  const tailTxHash = await sendPayment();

  while (true) {
    // waiting until the payment is verified
    // it can take 60 seconds, depending on the `tick` parameter in
    // the COO node.
    const confirmed = await paymentEngine.isTxVerified(tailTxHash);
    if (confirmed instanceof Error) {
      processError(confirmed);
    }

    if (confirmed) {
      await sendTxHash(tailTxHash);
      break;
    }
  }
}

main();