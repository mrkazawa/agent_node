const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');

const os = require("os");
const HOSTNAME = os.hostname();
const HTTP_PORT = process.env.HTTP_PORT || 3000;

const computeEngine = require('../compute/ethereum_engine');
const tools = require('./tools');

const NOTARY_BASE_URL = 'http://notary1.local:3002';
const CONTRACT_ABI_URL = NOTARY_BASE_URL + '/contract_abi';

const NETWORK_ID = '2020';
const CAR_CREDS_PATH = '/home/vagrant/src/compute/car_backend_credentials.json';
const CAR_ADDRESS = computeEngine.convertToChecksumAddress(tools.readJsonFIle(CAR_CREDS_PATH).address);

let carRental; // to store car rental smart contract object

const app = express();
app.use(bodyParser.json());

app.post('/access', async (req, res) => {
  const signature = req.body.signature;
  const carHash = req.body.carHash;

  try {
    const ipfsHashInBytes = computeEngine.convertIpfsHashToBytes32(carHash);

    const carObj = await carRental.methods.getRentalCarDetail(ipfsHashInBytes).call({
      from: CAR_ADDRESS
    });
    const carRenter = carObj[1];
    const isValue = carObj[2];
    const isRented = carObj[3];
  
    if (!isValue) {
      res.status(404).send('car hash is ot found!');
    }
    if (!isRented) {
      res.status(403).send('car is not being rented for now!');
    }
    if (!computeEngine.verifySignature(carHash, signature, carRenter)) {
      res.status(403).send('invalid signature!');
    }
  
    res.status(200).send('car access successful');

  } catch (err) {
    throw new Error(`There is an error ${error}`);
  }
});

app.listen(HTTP_PORT, () => {
  console.log(`Hit me up on ${HOSTNAME}.local:${HTTP_PORT}`);
});

async function getContractAbi() {
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

  return response.data;
}

async function deploySmartContract() {
  const rawAbi = await getContractAbi();
  carRental = computeEngine.constructSmartContract(rawAbi.abi, rawAbi.networks[NETWORK_ID].address);
}

deploySmartContract();