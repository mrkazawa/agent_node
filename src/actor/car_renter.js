const fs = require('fs');
const {
  performance
} = require('perf_hooks');
const rp = require('request-promise-native');

const computeEngine = require('../compute/ethereum_engine');
const paymentEngine = require('../payment/iota_engine');

// payment params
const PAYMENT_INFO_URL = `http://notary1.local:3002/tx_hash`;
const RECIPIENT_ADDRESS = 'OPWZTSFCTVNDYXFLCAJPOQAONK9THEHWZPDT9JMRPHXSJNXNM9PXARVBDUM9YTDG9YRYEPNJNIFZRWNZCZWDWBEGWY';
const TAG = paymentEngine.createRandomIotaTag();
const RENT_FEE = 1;

// compute params
const CONTRACT_ABI_URL = `http://notary1.local:3002/contract_abi`;
const NETWORK_ID = '2020';
const RENTER_CREDS_PATH = '/home/vagrant/src/compute/car_renter_credentials.json';
const RENTER_ADDRESS = computeEngine.convertToChecksumAddress(readJsonFile(RENTER_CREDS_PATH).address);

// performance params
const RESULT_DATA_PATH = '/home/vagrant/result_car_renter.csv';
fs.writeFileSync(RESULT_DATA_PATH, ""); // clear file

async function main() {
  paymentEngine.printNodeInfo();
  await paymentEngine.getCurrentBalance(RECIPIENT_ADDRESS);
  const tailHash = await paymentEngine.sendTransaction(RECIPIENT_ADDRESS, RENT_FEE, TAG);
  const txResult = await paymentEngine.verifyTransaction(tailHash, RECIPIENT_ADDRESS, RENT_FEE, TAG);
  if (txResult) {
    console.log('Payment is verified');
  } else {
    console.log('Payment fails');
  }
}

main();

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