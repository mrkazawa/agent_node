const fs = require('fs');
const {
  performance
} = require('perf_hooks');

const ipfs_engine = require('./storage/ipfs_engine');

// payment params
const RECIPIENT_ADDRESS = 'OPWZTSFCTVNDYXFLCAJPOQAONK9THEHWZPDT9JMRPHXSJNXNM9PXARVBDUM9YTDG9YRYEPNJNIFZRWNZCZWDWBEGWY';
const TAG = createRandomIotaTag();
const RENT_FEE = 1;

// storage params
const CAR_DATA_PATH = '/home/vagrant/src/car_data.json';
var carDataTemplate = {
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

// performance params
const RESULT_DATA_PATH = '/home/vagrant/result.csv';

// initialize checkpoints for performance module
let startDetailCheckpoint = 0;
let endDetailCheckpoint = 0;
let startMetadataCheckpoint = 0;
let endMetadataCheckpoint = 0;

async function storingCarDetail() {
  startDetailCheckpoint = performance.now();

  console.log("Car owner preparing car data...");
  const json = JSON.stringify(carDataTemplate);
  fs.writeFileSync(CAR_DATA_PATH, json, {
    encoding: 'utf8',
    flag: 'w'
  });

  console.log("Car owner storing car data in IPFS...");
  const ipfsHash = await ipfs_engine.storeJsonFromLocalFile(CAR_DATA_PATH);
  if (ipfs_engine.isValidIpfsHash(ipfsHash)) {
    console.log(`Car data stored in: ${ipfsHash}`);
  } else {
    return process.exit(69);
  }

  endDetailCheckpoint = performance.now();
}

/**
 * Appending checkpoint delta results to file.
 */
function savingResult() {
  const detailDelta = endDetailCheckpoint - startDetailCheckpoint;
  const metadataDelta = endMetadataCheckpoint - startMetadataCheckpoint;
  const row = detailDelta + "," +
    metadataDelta + "," +
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

storingCarDetail();
savingResult()