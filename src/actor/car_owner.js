const fs = require('fs');
const {
  performance
} = require('perf_hooks');
const rp = require('request-promise-native');

const ipfs_engine = require('../storage/ipfs_engine');

// payment params
const RECIPIENT_ADDRESS = 'OPWZTSFCTVNDYXFLCAJPOQAONK9THEHWZPDT9JMRPHXSJNXNM9PXARVBDUM9YTDG9YRYEPNJNIFZRWNZCZWDWBEGWY';
const TAG = createRandomIotaTag();
const RENT_FEE = 1;

// storage params
const CAR_DATA_PATH = '/home/vagrant/src/car_data.json';
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
};

// compute params
const CONTRACT_ABI_URL = `http://notary1.local:3002/contract_abi`;

const CONTRACT_CREDS_PATH = '/home/vagrant/src/compute/contract_credentials.json';
const OWNER_CREDS_PATH = '/home/vagrant/src/compute/car_owner_credentials.json';

// performance params
const RESULT_DATA_PATH = '/home/vagrant/result_car_owner.csv';

async function storingCarDetail() {
  const startDetailCheckpoint = performance.now();

  console.log("Preparing car data...");
  const json = JSON.stringify(carDataTemplate);
  fs.writeFileSync(CAR_DATA_PATH, json, {
    encoding: 'utf8',
    flag: 'w'
  });

  console.log("Storing car data in IPFS...");
  const ipfsHash = await ipfs_engine.storeJsonFromLocalFile(CAR_DATA_PATH);
  if (ipfs_engine.isValidIpfsHash(ipfsHash)) {
    console.log(`Car data stored in: ${ipfsHash}`);
  } else {
    return process.exit(69);
  }

  const endDetailCheckpoint = performance.now();
  savingResult('Storing Car Detail in IPFS', startDetailCheckpoint, endDetailCheckpoint);
}

async function storingCarMetadata() {
  let options = {
    method: 'GET',
    uri: CONTRACT_ABI_URL,
    resolveWithFullResponse: true,
    json: true
  };

  rp(options).then(function (response) {
    console.log("Constructing smart contract...");
    const contractAbi = response.body;
    const json = readJsonFile(CONTRACT_CREDS_PATH);
    
    console.log(contractAbi);
    console.log(json);


    /*const carRental = eth_engine.constructSmartContract(contractAbi, contractAddress);

    console.log("Car owner storing rental car to the smart contract...");
    const carOwnerAddress = eth_engine.getEthereumAddressFromJsonFile(OWNER_DATA_PATH);
    const ipfsHashInBytes = eth_engine.getBytes32FromIpfsHash(ipfsHash);
    let tx = await carRental.methods.storeRentalCar(ipfsHashInBytes).send({
      from: carOwnerAddress,
      gas: 1000000
    });*/

  }).catch(function (err) {
    console.log(`Error when getting contract abi: ${err}`);
  });
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

/**
 * Create a random IOTA tag for transactions.
 */
function createRandomIotaTag() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ9';
  const charactersLength = characters.length;
  const length = 27; // IOTA tag length is 27 trytes

  var result = '';
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
}

async function main() {
  await storingCarDetail();
  await storingCarMetadata();
}

main();