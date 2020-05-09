const {
  performance
} = require('perf_hooks');

const computeEngine = require('../../compute/ethereum_engine');
const paymentEngine = require('../../payment/iota_engine');
const tools = require('./tools');

const NOTARY_BASE_URL = 'http://notary2.local:3002';
const PAYMENT_INFO_URL = NOTARY_BASE_URL + '/tx_hash';
const CAR_INFO_URL = NOTARY_BASE_URL + '/car_info';

// need to get the contract abi from the deployer (master node)
// FIXME: If we use notary 2 URL, the abi will not be the same and we cannot get events
const CONTRACT_ABI_URL = 'http://notary1.local:3002/contract_abi';

const CAR_BASE_URL = 'http://agent3.local:3000';
const ACCESS_CAR_URL = CAR_BASE_URL + '/access';

// compute params
const NETWORK_ID = '2020';
const RENTER_CREDS_PATH = '/home/vagrant/src/actors/rental_car/car_renter_credentials.json';
const RENTER_ADDRESS = computeEngine.convertToChecksumAddress(tools.readJsonFIle(RENTER_CREDS_PATH).address);
const RENTER_PRIVATE = tools.readJsonFIle(RENTER_CREDS_PATH).privateKey;

// performance params
const RESULT_DATA_PATH_GET_CAR = '/home/vagrant/result_car_renter_get_car.csv';
const RESULT_DATA_PATH_SEND_PAYMENT = '/home/vagrant/result_car_renter_send_payment.csv';
const RESULT_DATA_PATH_SEND_HASH = '/home/vagrant/result_car_renter_send_hash.csv';
const RESULT_DATA_PATH_ACCESS_CAR = '/home/vagrant/result_car_renter_access_car.csv';

// always begin with clean state
tools.clearFIle(RESULT_DATA_PATH_GET_CAR);
tools.clearFIle(RESULT_DATA_PATH_SEND_PAYMENT);
tools.clearFIle(RESULT_DATA_PATH_SEND_HASH);
tools.clearFIle(RESULT_DATA_PATH_ACCESS_CAR);

// the number of iteration for benchamrking
const ITERATION = parseInt(process.env.ITERATION) || 1;

async function getUnrentedCarInfo() {
  console.log('Getting One Unrented Car Info From Rental Car App..');
  const start = performance.now();

  const options = tools.formGetRequest(CAR_INFO_URL);
  const response = await tools.sendRequest(options);
  if (response instanceof Error) {
    tools.logAndExit(response);
  }

  const end = performance.now();
  tools.savingResult('Get Car Info From App', RESULT_DATA_PATH_GET_CAR, start, end);
  console.log(`${response.data.hash} car info obtained!`);

  return [
    response.data.hash,
    response.data.fee_amount,
    response.data.fee_address,
    response.data.fee_tag
  ];
}

async function sendPaymentToIota(carInfo) {
  console.log('Paying Car to IOTA..');
  const start = performance.now();

  const message = {
    amount: carInfo[1]
  };
  const feeInTrytes = paymentEngine.convertAsciiToTrytes(JSON.stringify(message));
  const transfers = [{
    value: 0,
    address: carInfo[2],
    message: feeInTrytes,
    tag: carInfo[3]
  }];

  const tailTxHash = await paymentEngine.sendTx(transfers);
  if (tailTxHash instanceof Error) {
    tools.logAndExit(tailTxHash);
  }

  const end = performance.now();
  tools.savingResult('Send Payment to IOTA', RESULT_DATA_PATH_SEND_PAYMENT, start, end);
  console.log(`${tailTxHash} tx hash obtained!`);

  return tailTxHash;
}

async function submitTxHashToNotary(carInfo, tailTxHash) {
  console.log('Sending Car Payment Hash to App..');
  const start = performance.now();

  const payload = {
    car_hash: carInfo[0],
    payment_hash: tailTxHash,
    renter_address: RENTER_ADDRESS
  };

  const options = tools.formPostRequest(PAYMENT_INFO_URL, payload);
  const response = await tools.sendRequest(options);
  if (response instanceof Error) {
    tools.logAndExit(response);
  }

  const end = performance.now();
  tools.savingResult('Send Tx Hash to App', RESULT_DATA_PATH_SEND_HASH, start, end);
  console.log(`${tailTxHash} is sent to Rental Car application`);
}

async function getContractAbi() {
  const options = tools.formGetRequest(CONTRACT_ABI_URL);
  const response = await tools.sendRequest(options);
  if (response instanceof Error) {
    tools.logAndExit(response);
  }

  return response.data;
}

async function sendAccessPayload(ipfsHash, signature) {
  const payload = {
    carHash: ipfsHash,
    signature: signature
  };

  const options = tools.formPostRequest(ACCESS_CAR_URL, payload);
  const response = await tools.sendRequest(options);
  if (response instanceof Error) {
    tools.logAndExit(response);
  }

  return response.data;
}

async function doRentalCarRentedEvent(bytes32Hash) {
  console.log('Accessing the rental car..');
  const start = performance.now();

  const ipfsHash = computeEngine.convertBytes32ToIpfsHash(bytes32Hash);
  const signature = computeEngine.signMessage(ipfsHash, RENTER_PRIVATE);

  await sendAccessPayload(ipfsHash, signature);

  const end = performance.now();
  tools.savingResult('Accessing Car', RESULT_DATA_PATH_ACCESS_CAR, start, end);
  console.log(`Successfully access the car with this signature: ${signature}`);
}

async function addRentalCarRentedEventListener() {
  const rawAbi = await getContractAbi();
  const carRental = computeEngine.constructSmartContract(rawAbi.abi, rawAbi.networks[NETWORK_ID].address);

  carRental.events.RentalCarRented({
    fromBlock: 0
  }, function (error, event) {
    if (error) console.log(error);

    const bytes32Hash = event.returnValues['ipfsHash'];
    const carRenter = event.returnValues['carRenter'];

    if (carRenter == RENTER_ADDRESS) {
      doRentalCarRentedEvent(bytes32Hash);
    }
  });
}

async function main() {
  await addRentalCarRentedEventListener();

  for (i = 0; i < ITERATION; i++) {
    const carInfo = await getUnrentedCarInfo();
    const tailTxHash = await sendPaymentToIota(carInfo);

    while (true) {
      // waiting until the payment is verified
      // it can take 60 seconds, depending on the `tick` parameter in
      // the COO node.
      const confirmed = await paymentEngine.isTxVerified(tailTxHash);
      if (confirmed instanceof Error) {
        tools.logAndExit(confirmed);
      }

      if (confirmed) {
        await submitTxHashToNotary(carInfo, tailTxHash);
        break;
      }
    }
  }

  console.log('Run complete!!!');
}

main();