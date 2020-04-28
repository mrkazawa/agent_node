const fs = require('fs');
const {
  performance
} = require('perf_hooks');
const rp = require('request-promise-native');

const storageEngine = require('../storage/ipfs_engine');
const computeEngine = require('../compute/ethereum_engine');

// payment params
const RECIPIENT_ADDRESS = 'OPWZTSFCTVNDYXFLCAJPOQAONK9THEHWZPDT9JMRPHXSJNXNM9PXARVBDUM9YTDG9YRYEPNJNIFZRWNZCZWDWBEGWY';
const TAG = createRandomIotaTag();
const RENT_FEE = 1;

// compute params
const CONTRACT_ABI_URL = `http://notary1.local:3002/contract_abi`;
const NETWORK_ID = '2020';
const OWNER_CREDS_PATH = '/home/vagrant/src/compute/car_owner_credentials.json';
const OWNER_ADDRESS = computeEngine.convertToChecksumAddress(readJsonFile(OWNER_CREDS_PATH).address);

// storage params
const CAR_DATA_PATH = '/home/vagrant/src/storage/car_data.json';
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

// performance params
const RESULT_DATA_PATH = '/home/vagrant/result_car_owner.csv';
fs.writeFileSync(RESULT_DATA_PATH, ""); // clear file

let ipfsHash; // the ipfs hash for the car information

async function storingCarDetail() {
  const startDetailCheckpoint = performance.now();

  console.log("Preparing car data...");
  const json = JSON.stringify(carDataTemplate);
  fs.writeFileSync(CAR_DATA_PATH, json, {
    encoding: 'utf8',
    flag: 'w'
  });

  console.log("Storing car data in IPFS...");
  ipfsHash = await storageEngine.storeJsonFromLocalFile(CAR_DATA_PATH);
  if (storageEngine.isValidIpfsHash(ipfsHash)) {
    console.log(`Car data stored in: ${ipfsHash}`);
  } else {
    return process.exit(69);
  }

  const endDetailCheckpoint = performance.now();
  savingResult('Storing Car Detail in IPFS', startDetailCheckpoint, endDetailCheckpoint);
}

async function storingCarMetadata() {
  const startMetadataCheckpoint = performance.now();

  let options = {
    method: 'GET',
    uri: CONTRACT_ABI_URL,
    resolveWithFullResponse: true,
    json: true
  };

  rp(options).then(async function (response) {
    try {
      console.log("Constructing smart contract...");
      const rawAbi = response.body;

      const carRental = computeEngine.constructSmartContract(rawAbi.abi, rawAbi.networks[NETWORK_ID].address);

      console.log("Storing car metadata to the smart contract...");

      const ipfsHashInBytes = computeEngine.getBytes32FromIpfsHash(ipfsHash);
      let tx = await carRental.methods.storeRentalCar(ipfsHashInBytes).send({
        from: OWNER_ADDRESS,
        gas: 1000000
      });

      const event = tx.events.NewRentalCarAdded; 
      if (typeof event !== 'undefined') {
        console.log('Tx stored in the block!');
        console.log('Car Owner: ', event.returnValues['carOwner']);
        console.log('Car Hash: ', event.returnValues['ipfsHash']);

        const endMetadataCheckpoint = performance.now();
        savingResult('Storing Car Metadata in ETH', startMetadataCheckpoint, endMetadataCheckpoint);
        process.exit();

      } else {
        console.log('ERROR! Tx not stored!');
      }

    } catch (err) {
      console.log(`Error setting up contract: ${err}`);
    }

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