var crypto = require('crypto');
const {
  performance
} = require('perf_hooks');

const storageEngine = require('../../storage/ipfs_engine');
const computeEngine = require('../../compute/ethereum_engine');
const paymentEngine = require('../../payment/iota_engine');
const tools = require('./tools');

const NOTARY_BASE_URL = 'http://notary1.local:3002';
const CONTRACT_ABI_URL = NOTARY_BASE_URL + '/contract_abi';

// payment params
const RECIPIENT_ADDRESS = 'OPWZTSFCTVNDYXFLCAJPOQAONK9THEHWZPDT9JMRPHXSJNXNM9PXARVBDUM9YTDG9YRYEPNJNIFZRWNZCZWDWBEGWY';
const TAG = paymentEngine.createRandomIotaTag();
const RENT_FEE = 1;

// compute params
const NETWORK_ID = '2020';
const OWNER_CREDS_PATH = '/home/vagrant/src/actors/rental_car/car_owner_credentials.json';
const OWNER_ADDRESS = computeEngine.convertToChecksumAddress(tools.readJsonFIle(OWNER_CREDS_PATH).address);

// performance params
const RESULT_DATA_PATH_CAR_DETAIL = '/home/vagrant/result_car_owner_detail.csv';
const RESULT_DATA_PATH_CAR_METADATA = '/home/vagrant/result_car_owner_metadata.csv';

// always begin with clean state
tools.clearFIle(RESULT_DATA_PATH_CAR_DETAIL);
tools.clearFIle(RESULT_DATA_PATH_CAR_METADATA);

// the number of iteration for benchamrking
const ITERATION = parseInt(process.env.ITERATION) || 1;

function randomValueHex(len) {
  return crypto
    .randomBytes(Math.ceil(len / 2))
    .toString('hex') // convert to hexadecimal format
    .slice(0, len) // return required number of characters
}

function generateCarDetailInJson() {
  const carData = {
    timestamp: Math.floor(new Date() / 1000), // get current timestmap in epoch
    nonce: randomValueHex(36), // for unique-ness
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

  const jsonFilePath = '/home/vagrant/src/storage/car_data.json';
  const json = JSON.stringify(carData);
  tools.writeJsonFile(jsonFilePath, json);

  return jsonFilePath;
}

async function storingCarDetail() {
  console.log("Storing car data in IPFS..");
  const start = performance.now();

  const jsonFilePath = generateCarDetailInJson();
  const ipfsHash = await storageEngine.storeJsonFromLocalFile(jsonFilePath);
  if (ipfsHash instanceof Error) {
    tools.logAndExit(ipfsHash);
  }

  const end = performance.now();
  tools.savingResult('Storing Car Detail in IPFS', RESULT_DATA_PATH_CAR_DETAIL, start, end);
  console.log(`Car data stored in: ${ipfsHash}`);

  return ipfsHash;
}

async function getContractAbi() {
  const options = tools.formGetRequest(CONTRACT_ABI_URL);
  const response = await tools.sendRequest(options);
  if (response instanceof Error) {
    tools.logAndExit(response);
  }

  return response.data;
}

async function storingCarMetadata(ipfsHash) {
  console.log("Storing car metadata in Ethereum..");
  const start = performance.now();

  const rawAbi = await getContractAbi();
  const carRental = computeEngine.constructSmartContract(rawAbi.abi, rawAbi.networks[NETWORK_ID].address);

  const ipfsHashInBytes = computeEngine.convertIpfsHashToBytes32(ipfsHash);
  const tx = await carRental.methods.storeRentalCar(ipfsHashInBytes).send({
    from: OWNER_ADDRESS,
    gas: 1000000
  });

  const event = tx.events.NewRentalCarAdded;
  if (typeof event !== 'undefined') {
    const end = performance.now();
    tools.savingResult('Storing Car Metadata in ETH', RESULT_DATA_PATH_CAR_METADATA, start, end);

    console.log('Insert Rental Car Tx stored in the block!');
    console.log('Car Owner: ', event.returnValues['carOwner']);
    console.log('Car Hash: ', event.returnValues['ipfsHash']);

  } else {
    console.log('Fail, not getting any event?');
  }
}

async function main() {
  for (i = 0; i < ITERATION; i++) {
    const ipfsHash = await storingCarDetail();
    await storingCarMetadata(ipfsHash);
  }

  console.log('Run complete!!!');
}

main();