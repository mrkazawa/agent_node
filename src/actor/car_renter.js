const http = require('http');
const {
  performance
} = require('perf_hooks');

const computeEngine = require('../compute/ethereum_engine');
const paymentEngine = require('../payment/iota_engine');
const tools = require('./tools');

const NOTARY_BASE_URL = 'http://notary2.local:3002';
const PAYMENT_INFO_URL = NOTARY_BASE_URL + '/tx_hash';
const CAR_INFO_URL = NOTARY_BASE_URL + '/car_info';
const CONTRACT_ABI_URL = NOTARY_BASE_URL + '/contract_abi';

// compute params
const NETWORK_ID = '2020';
const RENTER_CREDS_PATH = '/home/vagrant/src/compute/car_renter_credentials.json';
const RENTER_ADDRESS = computeEngine.convertToChecksumAddress(tools.readJsonFIle(RENTER_CREDS_PATH).address);

// performance params
const RESULT_DATA_PATH = '/home/vagrant/result_car_renter.csv';
tools.clearFIle(RESULT_DATA_PATH);

async function getCarInfo() {
  console.log('Getting Car Info From Rental Car App..');
  const start = performance.now();

  const options = {
    method: 'get',
    url: CAR_INFO_URL,
    httpAgent: new http.Agent({
      keepAlive: false
    })
  };

  const response = await tools.sendRequest(options);
  if (response instanceof Error) {
    tools.logAndExit(response);
  }

  const end = performance.now();
  tools.savingResult('Get Car Info From App', RESULT_DATA_PATH, start, end);
  console.log(`${response.data.hash} car info obtained!`);

  return [
    response.data.hash,
    response.data.fee_amount,
    response.data.fee_address,
    response.data.fee_tag
  ];
}

async function sendPayment(carInfo) {
  console.log('Paying Car to IOTA..');
  const start = performance.now();

  const transfers = [{
    value: carInfo[1],
    address: carInfo[2],
    tag: carInfo[3]
  }];

  const tailTxHash = await paymentEngine.sendTx(transfers);
  if (tailTxHash instanceof Error) {
    tools.logAndExit(tailTxHash);
  }

  const end = performance.now();
  tools.savingResult('Send Payment to IOTA', RESULT_DATA_PATH, start, end);
  console.log(`${tailTxHash} tx hash obtained!`);

  return tailTxHash;
}

async function sendTxHash(carInfo, tailTxHash) {
  console.log('Sending Car Payment Hash to App..');
  const start = performance.now();

  const payload = {
    car_hash: carInfo[0],
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

  const response = await tools.sendRequest(options);
  if (response instanceof Error) {
    tools.logAndExit(response);
  }

  const end = performance.now();
  tools.savingResult('Send Tx Hash to App', RESULT_DATA_PATH, start, end);
  console.log(`${tailTxHash} is sent to Rental Car application`);
}

async function main() {
  const carInfo = await getCarInfo();
  const tailTxHash = await sendPayment(carInfo);

  while (true) {
    // waiting until the payment is verified
    // it can take 60 seconds, depending on the `tick` parameter in
    // the COO node.
    const confirmed = await paymentEngine.isTxVerified(tailTxHash);
    if (confirmed instanceof Error) {
      tools.logAndExit(confirmed);
    }

    if (confirmed) {
      await sendTxHash(carInfo, tailTxHash);
      break;
    }
  }
}

main();