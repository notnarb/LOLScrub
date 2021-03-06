var util = require('util');
var Promise = require('bluebird');
var http = require('http');
var express = require('express');
var morgan = require('morgan');
var redis = require('redis');
var connectTimeout = require('connect-timeout');
var fs = require('fs');

var champStats = require('./champStats');

Promise.promisifyAll(redis);
Promise.promisifyAll(fs);

var redisClient = redis.createClient(6379, 'redis', {});

redisClient.on('error', function (error) {
	process.stderr.write('redis error, ' + error.message);
});

var HTTP_PORT = 8000;

var backendHost = process.env.BACKEND_HOST;
var backendPort = process.env.BACKEND_PORT;

if (!backendHost || !backendPort) {
	process.stderr.write("[Error]: Missing environment variable BACKEND_HOST and/or BACKEND_PORT: see readme\n");
	process.exit(1);
}

// default for requests
var request = require('request').defaults({
	//Note: using http not https.  https without a valid cert would still be
	//vulnerable to mitm and NO INFO PASSED TO BACKEND SHOULD BE CONSIDERED
	//SECURE.  If this changes in the future I will set up a trusted cert
	baseUrl: "http://" + backendHost + ":" + backendPort,
	json: true
});

Promise.promisifyAll(request);

var app = express();

// Probably uneccessary to duplicate what's going to be found in the nginx log
// but w/e, this is mostly to help debugging
app.use(morgan('combined'));

// Timeout requests after 10 seconds to avoid nginx timeouts
app.use(connectTimeout('10s'));

app.use(ErrorHandler);

app.use('/champstats', champStats.router);

/**
 * Checks the backend for the summoner info
 * @param {String} summonerName
 * @returns {Promise} resolves with summoner info
 * @throws UnknownServerError if no summoner is found
 * @throws UnknownSummonerError if there appears to be an invalid summoner name
 */ 
function lookupSummonerInfo (summonerName) {
	return request.getAsync('/summonerlookup/' + summonerName).then(function (results) {
		var response = results[0];
		var responseBody = results[1];
		// if (responseBody.id) {
		// 	return responseBody.id;
		// } else if (responseBody.error) {
		// 	throw new UnknownSummonerError(summonerName);
		// } else {
		// 	throw new UnknownServerError();
		// }
		if (responseBody.invalidName) {
			redisClient.hset("nameMap", summonerName, JSON.stringify(responseBody));
			throw new UnknownSummonerError(summonerName);
		} 
		if (responseBody.results) {
			return responseBody.results;
		}
		console.log('unknown server error', responseBody);
		throw new UnknownServerError();
	});
}

/**
 * Obtains the summoner Info.  First checks cache, then checks backend
 * @param {String} summonerName
 * @returns {Promise} - resolves with summoner Info
 */
function getSummonerInfo (summonerName) {
	return redisClient.hgetAsync("nameMap", summonerName)
		.then(function (result) {
			if (result) {
				console.dir(result);
				console.log('redis hit', summonerName, result);
				var parsedResult = JSON.parse(result);
				if (parsedResult.invalidName) {
					throw new UnknownSummonerError(summonerName);
				}
				return parsedResult;
			} else {
				console.log('redis miss', summonerName);
				return lookupSummonerInfo(summonerName).then(function (info) {
					// store id for future use
					console.log(info);
					redisClient.hset("nameMap", summonerName, JSON.stringify(info));
					return info;
				});
			}
		});
}

app.get('/getmyinfo/:summonerName', function (req, res, next) {
	var summonerName = req.params.summonerName;
	getSummonerInfo(summonerName).then(function (info) {
		var response = {
			name: info.name,
			profileIconId: info.profileIconId
		};
		res.writeHead(200, {'Content-Type': 'application/json'});
		res.end(JSON.stringify(response));
	}).catch(function (error) {
		ErrorHandler(error, req, res, next);
	});
});


/**
 * error handler for /getstatic requests that made it this far (it should be
 * served as a static file by nginx)
 */ 
app.get('/getstatic', function (req, res) {
	
	res.writeHead(503, {'Content-Type': 'application/json'});
	var response = {
		error: "static data not stored properly"
	};
	res.end(JSON.stringify(response));
});

/**
 * Error handler for /solokillodds requests that made it this far (it should be
 * caught by the try_files block in nginx)
 */
app.get('/solokillodds', function (req, res) {
	res.writeHead(503, {'Content-Type': 'application/json'});
	var response = {
		error: "solo kill odds not stored properly"
	};
	res.end(JSON.stringify(response));
});


/**
 * Handler for requests which fall through all other requests
 */
app.use(function baseHandler (req, res) {
	var response = {"hello":"how are you?"};
	res.writeHead(200, {'Content-Type': 'application/json'});
	res.end(JSON.stringify(response));		

});

var itemMap = null;

/**
 * Eventually populates itemMap with the static item data from the backend
 */
function getItemData () {
	return request.getAsync('/itemlist').then(function (results) {
		var response = results[0];
		var responseBody = results[1];
		if (response.statusCode === 200 && Object.keys(responseBody)) {
			// assume item data was found
			Object.keys(responseBody).forEach(function (itemId) {
				// delete all data not used by front end currently since this is passed as-is to the client
				delete responseBody[itemId].plainText;
				delete responseBody[itemId].description;
				delete responseBody[itemId].image;
			});
			return responseBody;
		} else {
			throw new Error("Invalid status code (" + response.statusCode + ") or body " + JSON.stringify(responseBody) + 'when looking up items');
		}
	}).catch(function (error) {
		console.log("Failed to get itemlist", error, "trying again in 10 seconds");
		return Promise.delay(10000, getItemData);
	});
}

var champMap = null;
/**
 * Eventually populates champMap with the static item data from the backend
 */
function getChampData () {
	return request.getAsync('/champlist').then(function (results) {
		var response = results[0];
		var responseBody = results[1];
		if (response.statusCode === 200 && Object.keys(responseBody)) {
			// assume champ data was found
			Object.keys(responseBody).forEach(function (champId) {
				// Delete data not used by front end js
				delete responseBody[champId].image;
				delete responseBody[champId].title;
			});
			return responseBody;
		} else {
			throw new Error("Invalid status code (" + response.statusCode + ") or body " + JSON.stringify(responseBody) + 'when looking up items');
		}
	}).catch(function (error) {
		console.log("Failed to get champlist", error, "trying again in 10 seconds");
		return Promise.delay(10000).then(getChampData);
	});
}

/**
 * Obtains solo kill percentage odds from the backend 
 */
function getSoloKillOddsData () {
	request.getAsync('/SoloKillOddsAgainstOverall/').then(function (results) {
		var response = results[0];
		var responseBody = results[1];
		if (response.statusCode === 200) {
			fs.writeFileAsync('/var/www/cache/solokillodds', JSON.stringify(responseBody)).then(function () {
				console.log('wrote solo kill data');
			}); 
		} else {
			throw new Error("Invalid status code (" + response.statusCode + ") when obtaining solo kill odds");
		}
	}).catch(function (error) {
		console.log("Failed to get Solo kill odds", error, "trying again in 10 seconds");
		setTimeout(getSoloKillOddsData, 10000);
	});
}

function getKsOddsData () {
	request.getAsync('/KsOddsAgainst').then(function (results) {
		var response = results[0];
		var responseBody = results[1];
		if (response.statusCode === 200) {
			fs.writeFileAsync('/var/www/cache/ksoddsagainst', JSON.stringify(responseBody)).then(function () {
				console.log('wrote kill steal data');
			}); 
		} else {
			throw new Error("Invalid status code (" + response.statusCode + ") when obtaining solo kill odds");
		}
	}).catch(function (error) {
		console.log("Failed to get KS odds", error, "trying again in 10 seconds");
		setTimeout(getKsOddsData, 10000);
	});
}


function ErrorHandler (err, req, res, next) {
	var errorCode = 500;
	if (err.code) {
		errorCode = err.code;
	}
	res.writeHead(errorCode, {'Content-Type': 'application/json'});
	res.end(JSON.stringify({
		error: err
	}));
}

http.createServer(app).listen(HTTP_PORT);

console.log('listening on port', HTTP_PORT);

Promise.props({itemMap: getItemData(), champMap: getChampData()}).then(function (props) {
	// props with = itemMap : itemMap, champMap: champMap
	console.log('writing static data', props);
	fs.writeFileAsync('/var/www/cache/getstatic', JSON.stringify(props)).then(function () {
		console.log('Wrote static data');
	});
});
getSoloKillOddsData();
getKsOddsData();

// TODO: these should probably get moved to their own module

/**
 * @classdesc An error that I haven't accounted for
 * @param {Error} [error] - thrown error that rose this error
 */
function UnknownServerError (error) {
	Error.call(this);
	this.name = 'UnknownServerError';
	this.message = "Unhandled server error";
	console.log('UnknownServerError', error);

	this.code = 500;
}

util.inherits(UnknownServerError, Error);

/**
 * @classdesc error to be thrown when a summoner name appears to be invalid
 */
function UnknownSummonerError (summonerName) {
	Error.call(this);
	this.name = 'UnknownSummonerError';
	this.message = "There does not appear to be a summoner with name: " + summonerName;

	this.code = 404;
}
