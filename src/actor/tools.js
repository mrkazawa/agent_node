const fs = require('fs');
const axios = require('axios').default;
const http = require('http');

/**
 * Clear (make it empty) the given file in the path.
 * 
 * @param {string} path   The path to the file
 */
const clearFIle = function (path) {
  fs.writeFileSync(path, "");
};

/**
 * Write given object to json file.
 * 
 * @param {string} path   The path to the JSON file
 * @param {object} json   The object to be stored in json
 */
const writeJsonFile = function (path, json) {
  fs.writeFileSync(path, json, {
    encoding: 'utf8',
    flag: 'w'
  });
};

/**
 * Get JSON file from given path.
 * 
 * @param {string} path     The path to the JSON file
 */
const readJsonFIle = function (path) {
  if (fs.existsSync(path)) {
    const rawdata = fs.readFileSync(path);
    return JSON.parse(rawdata);
  } else {
    return new Error(`${path} does not exist`);
  }
};

/**
 * Record the difference between start and end of the performance.now().
 * Then, save the result in the given path.
 * 
 * @param {string} scenario   The scenario description of this mesarument
 * @param {string} path       The path to the file
 * @param {number} start      The start point of performance.now()
 * @param {number} end        The end point of performance.now()
 */
const savingResult = function (scenario, path, start, end) {
  const delta = end - start;
  const row = scenario + "," +
    delta + "," +
    "\r\n";
  fs.appendFileSync(path, row);
};

/**
 * Form an axios GET request option object.
 * Run this method in conjuction with the sendRequest method.
 * 
 * @param {string} url    The string url of request
 */
const formGetRequest = function (url) {
  return {
    method: 'get',
    url: url,
    httpAgent: new http.Agent({
      keepAlive: false
    })
  };
};

/**
 * Form an axios POST request option object.
 * Run this method in conjuction with the sendRequest method.
 * 
 * @param {string} url        The string url of request
 * @param {object} payload    The json object of request body
 */
const formPostRequest = function (url, payload) {
  return {
    method: 'post',
    url: url,
    data: payload,
    httpAgent: new http.Agent({
      keepAlive: false
    })
  };
};

/**
 * Send HTTP request using axios module.
 * 
 * @param {object} options    The object containing parameters for the request
 */
const sendRequest = async function (options) {
  try {
    return await axios(options);
  } catch (err) {
    return new Error(`Error sending request ${err}`);
  }
};

/**
 * Print the given error to console and exit the program.
 * 
 * @param {object} error    The error object
 */
const logAndExit = function (error) {
  console.log(error);
  process.exit(69);
};

module.exports = {
  clearFIle,
  writeJsonFile,
  readJsonFIle,
  savingResult,
  formGetRequest,
  formPostRequest,
  sendRequest,
  logAndExit
};