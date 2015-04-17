/**
 * @module appserver/champStats
 * @desc handler for requests relat
 */
var Promise = require('bluebird');

var router = require('express').Router();

var backendHost = process.env.BACKEND_HOST;
var backendPort = process.env.BACKEND_PORT;

var request = require('request').defaults({
	baseUrl: "http://" + backendHost + ":" + backendPort,
	json: true
});

Promise.promisifyAll(request);

// Mem store of champ data keyed by champ ID.  The value to the champ ID key is the return result to /:champId
var champData = {};

router.get('/:champId', function (req, res) {
	var champId = req.params.champId;
	if (!champId) {
		throw new Error('Missing champId paramater');
	}
	if (!champData[champId]){
		throw new Error("No info for champ " + champId);
	}
	var response = champData[champId];
	res.writeHead(200, {'Content-Type': 'application/json'});
	res.end(JSON.stringify(response));
});

router.get('/', function (req, res) {
	var response = champData;
	res.writeHead(200, {'Content-Type': 'application/json'});
	res.end(JSON.stringify(response));
});

/**
 * Given a path on the backend, call resultHandler on the response.  Repeats the
 * request in 10 seconds on failures
 * @param {String} path - e.g. '/multikills' - the path to request from teh backend
 * @param {Function} resultHandler - function called with the results on success.
 */
function getData (path, resultHandler) {
	request.getAsync(path).then(function (results) {
		var response = results[0];
		var responseBody = results[1];
		if (response.statusCode === 200) {
			resultHandler(responseBody);
		} else {
			throw new Error("Invalid status code (" + response.statusCode + ") when requesting " + path);
		}
	}).catch(function (error) {
		console.log("Failed to request", path, " Retrying in 10 seconds", error);
		setTimeout(getData.bind(null, path, resultHandler), 10000);
	});
}

// function getMultiKillData () {
// 	request.getAsync('/Multikills').then(function (results) {
// 		var response = results[0];
// 		var responseBody = results[1];
// 		if (response.statusCode === 200) {
// 			// Get each champ
// 			Object.keys(responseBody).forEach(function (champId) {
// 				// get each property associated with that champ
// 				Object.keys(responseBody[champId]).forEach(function (propName) {
// 					// Save the various properties
// 					if (!champData[champId]) {
// 						champData[champId] = {};
// 					}
// 					champData[champId][propName] = responseBody[champId][propName];
// 				});
// 			});
// 		} else {
// 			throw new Error("Invalid status code (" + response.statusCode + ") when obtaining multikill data");
// 		}
// 	}).catch(function (error) {
// 		console.log("Failed to get Multikill data", error, "trying again in 10 seconds");
// 		setTimeout(getMultiKillData, 10000);
// 	});
// }


// getMultiKillData();

getData('/MultiKills', function (responseBody) {
	if (!Object.keys(responseBody).length) {
		throw "No results for multikills";
	}
	Object.keys(responseBody).forEach(function (champId) {
		// get each property associated with that champ
		Object.keys(responseBody[champId]).forEach(function (propName) {
			// Save the various properties
			if (!champData[champId]) {
				champData[champId] = {};
			}
			champData[champId][propName] = responseBody[champId][propName];
		});
	});
	console.log('Obtained multikill data');
});

// ks chance per champ per opposing champ
getData('/KSOddsOverall', function (responseBody) {
	if (!Object.keys(responseBody).length) {
		throw "No results for KS odds overall";
	}
	Object.keys(responseBody).forEach(function (champPair) {
		var keys = champPair.split("-");
		var champId = keys[0];
		var againstId = keys[1];
		// convert decimal to whole percentage
		var value = Math.round(responseBody[champPair] * 100);
		if (!champData[champId]) {
			champData[champId] = {};
		}
		if (!champData[champId].ksOddsTotal) {
			champData[champId].ksOddsTotal = {};
		}
		champData[champId].ksOddsTotal[againstId] = value;
	});
	console.log("Obtained  KS odds overall");
});

// Single number representing how good this champ is at getting solo kills
getData('/OverallSoloKillRate', function (responseBody) {
	if (!Object.keys(responseBody).length) {
		throw "No results for overall solo kill rate overall";
	}
	Object.keys(responseBody).forEach(function (champId) {
		if (!champData[champId]) {
			champData[champId] = {};
		}
		champData[champId].overallSoloKillRating = responseBody[champId];
	});
	console.log("Obtained overallsolokillrate");
});

// Total chance of winning a 1v1 champ-champ
getData('/SoloKillOddsOverall', function (responseBody) {
	if (!Object.keys(responseBody).length) {
		throw "No results for overall solo kill rate overall";
	}
	Object.keys(responseBody).forEach(function (champPair) {
		var keys = champPair.split("-");
		var champId = keys[0];
		var againstId = keys[1];
		// already converted to whole number
		var value = responseBody[champPair];
		if (!champData[champId]) {
			champData[champId] = {};
		}
		if (!champData[champId].totalVsSolo) {
			champData[champId].totalVsSolo = {};
		}
		champData[champId].totalVsSolo[againstId] = value;
	});
	console.log("Obtained solo kill odds overall");
});

module.exports.router = router;
