const paymentEngine = require('../iota_engine');

const address = 'HEQLOWORLDHELLOWORLDHELLOWORLDHELLOWORLDHELLOWORLDHELLOWORLDHELLOWORLDHELLOWOR99D';

test('Getting node info', async () => {
  const nodeIndo = await paymentEngine.getNodeInfo();
  // In JavaScript, there are six falsy values:
  // false, 0, '', null, undefined, and NaN.
  // Everything else is truthy.
  expect(nodeIndo).toBeTruthy();
});

test('Sending and reading Hello World transaction', async () => {
  const message = JSON.stringify({
    "message": "Hello world"
  });
  const messageInTrytes = paymentEngine.convertAsciiToTrytes(message);

  const transfers = [{
    value: 0,
    address: address,
    message: messageInTrytes
  }];

  const tailTxHash = await paymentEngine.sendTx(transfers);
  expect(tailTxHash).toBeTruthy();

  const queriedMessage = await paymentEngine.readTxMessage(tailTxHash);
  expect(queriedMessage).toEqual({
    "message": "Hello world"
  });
});

test('Generating new address', async () => {
  const address = await paymentEngine.generateAddress();
  expect(address).toBeTruthy();
});

test('Sending iota in a transaction', async () => {
  const transfers = [{
    value: 1,
    address: address,
    tag: paymentEngine.createRandomIotaTag()
  }];

  const tailTxHash = await paymentEngine.sendTx(transfers);
  expect(tailTxHash).toBeTruthy();
});