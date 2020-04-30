const Iota = require('@iota/core');
const Converter = require('@iota/converter');
const Extract = require('@iota/extract-json');

// specify the location of the IRI node
const iota = Iota.composeAPI({
  provider: 'http://10.0.0.11:14265'
});

const DEPTH = 3;
const MINIMUM_WEIGHT_MAGNITUDE = 9;
const SECURITY_LEVEL = 0;
const SEED = 'SENDER99999999999999999999999999999999999999999999999999999999999999999999999999A';

var iota_engine = {
  getNodeInfo: async function () {
    try {
      return await iota.getNodeInfo();
    } catch (err) {
      console.log(`Error when getting node info: ${err}`);
    }
  },

  convertAsciiToTrytes: function (message) {
    return Converter.asciiToTrytes(message);
  },

  sendTx: async function (transfers) {
    try {
      const trytes = await iota.prepareTransfers(SEED, transfers);
      const bundle = await iota.sendTrytes(trytes, DEPTH, MINIMUM_WEIGHT_MAGNITUDE);
      const tailTxHash = bundle[0].hash;

      return tailTxHash;
    } catch (err) {
      console.log(`Error when sending Tx: ${err}`);
    }
  },

  readTxMessage: async function (tailTxHash) {
    try {
      const bundle = await iota.getBundle(tailTxHash);
      return JSON.parse(Extract.extractJson(bundle));
    } catch (err) {
      console.log(`Error when reading Tx: ${err}`);
    }
  },

  generateAddress: async function () {
    try {
      return await iota.getNewAddress(SEED, {
        index: 0,
        securityLevel: SECURITY_LEVEL,
        total: 1
      });
    } catch (err) {
      console.log(`Error when generating new address: ${err}`);
    }
  },

  attachToTangle: async function (address) {
    const transfers = [{
      value: 0, // attach to tangle is a zero transaction value
      address: address
    }];

    try {
      const trytes = await iota.prepareTransfers(SEED, transfers);
      const bundle = await iota.sendTrytes(trytes, DEPTH, MINIMUM_WEIGHT_MAGNITUDE);
      const tailTxHash = bundle[0].hash;

      return tailTxHash;
    } catch (err) {
      console.log(`Error when attaching to tangle: ${err}`);
    }
  },

  isTxVerified: async function (tailTxHash) {
    try {
      return await iota.getLatestInclusion([tailTxHash]);
    } catch (err) {
      console.log(`Error when checking tx: ${err}`);
    }
  },

  getBalances: async function (address) {
    try {
      const balance = await iota.getBalances([address], 100);
      return parseInt(balance.balances);
    } catch (err) {
      console.log(`Error when checking balances: ${err}`);
    }
  },

  createRandomIotaTag: function () {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ9';
    const charactersLength = characters.length;
    const length = 27; // IOTA tag length is 27 trytes

    var result = '';
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
  }
}

module.exports = iota_engine;