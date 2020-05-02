const http = require('http');
const {
  performance
} = require('perf_hooks');

const storageEngine = require('../storage/ipfs_engine');
const computeEngine = require('../compute/ethereum_engine');
const paymentEngine = require('../payment/iota_engine');
const tools = require('./tools');

const NOTARY_BASE_URL = 'http://notary1.local:3002';
const CONTRACT_ABI_URL = NOTARY_BASE_URL + '/contract_abi';

// payment params
const RECIPIENT_ADDRESS = 'OPWZTSFCTVNDYXFLCAJPOQAONK9THEHWZPDT9JMRPHXSJNXNM9PXARVBDUM9YTDG9YRYEPNJNIFZRWNZCZWDWBEGWY';
const TAG = paymentEngine.createRandomIotaTag();
const RENT_FEE = 1;

// compute params
const NETWORK_ID = '2020';
const OWNER_CREDS_PATH = '/home/vagrant/src/compute/car_owner_credentials.json';
const OWNER_ADDRESS = computeEngine.convertToChecksumAddress(tools.readJsonFIle(OWNER_CREDS_PATH).address);

// storage params
const CAR_DATA_PATH = '/home/vagrant/src/storage/car_data.json';

// performance params
const RESULT_DATA_PATH = '/home/vagrant/result_car_owner.csv';
tools.clearFIle(RESULT_DATA_PATH);

async function storingCarDetail() {
  console.log("Storing car data in IPFS...");
  const start = performance.now();

  const carDataTemplate = {
    timestamp: Math.floor(new Date() / 1000), // get current timestmap in epoch
    manufacturer: "Hyundai",
    model: "M15",
    color: "black",
    license: "LOST 1234",
    year: 2017,
    paymentAddress: RECIPIENT_ADDRESS,
    paymentTag: TAG,
    paymentFee: RENT_FEE,
    owner: OWNER_ADDRESS
  };

  const json = JSON.stringify(carDataTemplate);
  tools.writeJsonFile(CAR_DATA_PATH, json);

  const ipfsHash = await storageEngine.storeJsonFromLocalFile(CAR_DATA_PATH);
  if (ipfsHash instanceof Error) {
    tools.logAndExit(ipfsHash);
  }

  const end = performance.now();
  tools.savingResult('Storing Car Detail in IPFS', RESULT_DATA_PATH, start, end);
  console.log(`Car data stored in: ${ipfsHash}`);

  return ipfsHash;
}

async function storingCarMetadata(ipfsHash) {
  console.log("Storing car metadaat in Ethereum...");
  const start = performance.now();

  let options = {
    method: 'get',
    url: CONTRACT_ABI_URL,
    httpAgent: new http.Agent({
      keepAlive: false
    })
  };

  const response = await tools.sendRequest(options);
  if (response instanceof Error) {
    tools.logAndExit(response);
  }

  try {
    const rawAbi = response.data;
    const carRental = computeEngine.constructSmartContract(rawAbi.abi, rawAbi.networks[NETWORK_ID].address);

    const ipfsHashInBytes = computeEngine.getBytes32FromIpfsHash(ipfsHash);
    const tx = await carRental.methods.storeRentalCar(ipfsHashInBytes).send({
      from: OWNER_ADDRESS,
      gas: 1000000
    });

    const event = tx.events.NewRentalCarAdded; 
    if (typeof event !== 'undefined') {
      const end = performance.now();
      tools.savingResult('Storing Car Metadata in ETH', RESULT_DATA_PATH, start, end);

      console.log('Tx stored in the block!');
      console.log('Car Owner: ', event.returnValues['carOwner']);
      console.log('Car Hash: ', event.returnValues['ipfsHash']);

    } else {
      console.log('Fail, not getting any event?');
    }

  } catch (err) {
    console.log(`Error sending hash to contract ${err}`);
  }
}

async function main() {
  const ipfsHash = await storingCarDetail();
  await storingCarMetadata(ipfsHash);
}

main();