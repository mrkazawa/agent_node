const paymentEngine = require('../iota_engine');

const address = 'HEQLOWORLDHELLOWORLDHELLOWORLDHELLOWORLDHELLOWORLDHELLOWORLDHELLOWORLDHELLOWOR99D';

test('Getting Node Info', async () => {
  const nodeIndo = await paymentEngine.getNodeInfo();
  // In JavaScript, there are six falsy values:
  // false, 0, '', null, undefined, and NaN.
  // Everything else is truthy.
  expect(nodeIndo).toBeTruthy();
});

test('Sending Hello World Transaction', async () => {
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
});