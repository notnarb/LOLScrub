var util = require('util');
var Promise = require('bluebird');
var request = require('request');
var mongodb = require('mongodb');
var http = require('http');
var url = require('url');
var express = require('express');
var morgan = require('morgan');

// url escape string
var queryString = require('querystring');
var escapeString = queryString.escape;
var unescapeString = queryString.unescape;


Promise.promisifyAll(request);
Promise.promisifyAll(mongodb.MongoClient);
Promise.promisifyAll(mongodb.Collection.prototype);

// Port to listen for requests on
var HTTP_PORT = 8000;

var db = null;

var app = express();

var stats = {
	variableHits: 0,			//number of times a name was found in the local name map
	databaseHits: 0,			//number of times a name was found in the database
	apiHits: 0					//number of times a name needed to hit the the riot api
};

// name => id.  Stored in memory to skip hitting the database
var nameMap = {
};


function InvalidRiotResponseError (name) {
	Error.call(this);
	this.name = 'InvalidRiotResponseError';
	this.message = "Invalid response from Riot api for summoner name: " + name;
}
util.inherits(InvalidRiotResponseError, Error);

function NameDoesNotExistError (name) {
	Error.call(this);
	this.name = 'NameDoesNotExistError';
	this.requestedName = name;
	this.message = "Requested name does not seem to be a summoner name riot recognizes";
}
util.inherits(NameDoesNotExistError, Error);

function RiotApiError (message, code) {
	Error.call(this);
	this.name = 'RiotApiError';
	this.message = message;
	this.code = code;
}

util.inherits(RiotApiError, Error);

/**
 * Handler for when the riot api sends back a body.status.status_code
 * @param {Integer} statusCode - the error code sent from riot
 */
function riotErrorHandler (statusCode) {
	switch(statusCode) {
	case 400:
		throw new RiotApiError('Bad request', statusCode);
	case 401:
		throw new RiotApiError("Access denied", statusCode);
	case 404:
		throw new RiotApiError("404 not found", statusCode);
	case 429:
		throw new RiotApiError("Rate limit exceeded", statusCode);
	case 500:
		throw new RiotApiError('Internal server error', statusCode);
	case 503:
		throw new RiotApiError('Service unavailable', statusCode);
	default:
		console.log('Unknown code:', statusCode);
	}
}

/**
 * Sanatize an incoming summoner name to what riot expects by its bySummonerName query
 * @param {String} name to escape
 */
function sanitizeName (name) {
	if (!((typeof name) === "string")) {
		throw "Name must be of type String";
	}
	// unescape the string since it was transported here somehow.  Also convert
	// to lowercase and remove spaces cause that's needed eventually anyways
	var unescaped = unescapeString(name.toLowerCase()).replace(/ /g, '');

	// // Finally, url escape the string and return the value of that
	// var escaped = escapeString(unescaped);

	// JUST KIDDING the riot api doesn't like url escaped strings, send it as-is unescaped.
	console.log("Sanitization", name, unescaped);
	
	return unescaped;
	
	
}

// Array of array of IDs to lookup
// E.g. [ [ {name:"bla", resolve: resolve, reject: reject},  {name:"bla2", resolve: resolve, reject: reject}] ...]
var queuedBatches = [];

// Current promise for tracking requests
var currentBatchQuery = Promise.resolve();

/**
 * Get the next batch of IDs queued, query for them, then resolve or reject each one.
 * @returns {Promise} resolves when batch has been processed
 */
function processNextBatch () {
	// if there aren't any batches, don't do anything
	if (!queuedBatches.length) {
		return Promise.resolve();
	}
	var nextBatch = queuedBatches.shift();
	var nameMap = {};
	nextBatch.forEach(function (nameEntry) {
		// name entry is an object cotnaing a name, a resolve funciton, and a reject functioni
		var name = nameEntry.name;
		if (!nameMap[name]) {
			// Create an array so multiple requests for the same name both get resolved.  Unlikely, but eh
			nameMap[name] = {
				resolveList: [nameEntry.resolve],
				rejectList: [nameEntry.reject]
			};
		} else {
			nameMap[name].resolveList.push(nameEntry.resolve);
			nameMap[name].rejectList.push(nameEntry.reject);
		}
	});
	var nameList = Object.keys(nameMap).join(",");
	var requestUrl = 'http://riotambassador:9000/api/lol/na/v1.4/summoner/by-name/' + nameList;

	var numRetries = 0;

	// Repeatable lookup for this url
	function doLookup () {
		console.log('requesting', requestUrl, nameMap);
		return request.getAsync(requestUrl, {json: true}).then(function (args) {
			var response = args[0];
			var body = args[1];
			if (body.status && body.status.status_code) {
				riotErrorHandler(body.status.status_code);
			}

			// Go through each name in the nameList, check if it's in the
			// response, resolve or reject accordingly
			Object.keys(nameMap).forEach(function (name) {
				if (body[name]) {
					nameMap[name].resolveList.forEach(function (resolve) {
						resolve(body[name]);
					});
				} else {
					nameMap[name].rejectList.forEach(function (reject) {
						reject(new NameDoesNotExistError(name));
					});
				}
			});
		}).catch(RiotApiError, function (error) {
			console.log('failed query', error);
			
			// if 3 retries have been performed, give up
			if (numRetries >= 3) {
				Object.keys(nameMap).forEach(function (key) {
					nameMap[key].rejectList.forEach(function (reject) {
						// unknown error
						reject(new InvalidRiotResponseError());
					});
				});
				return null;
			}
			// otherwise try again
			numRetries++;
			if (error.code === 429) {
				console.log('Exceeded rate limit, waiting 2 seconds');
				return Promise.resolve().delay(2000).then(doLookup);
			}
			return doLookup();
		}).catch(function () {
			// if it's failed this far make sure that each name gets rejected and this promise resolves
			Object.keys(nameMap).forEach(function (key) {
				nameMap[key].rejectList.forEach(function (reject) {
					// unknown error
					reject(new InvalidRiotResponseError());
				});
			});
		});
	}

	return doLookup().finally(function () {
		// call processNextBatch again once lookup is complete.
		// processNextBatch will stop if there are no items left
		process.nextTick(processNextBatch);
	});
}
	


/**
 * Eventually looks up the requested name then resolves with the info pertaining to the name.
 * @returns {Promise} - resolves with object containing name, ID, etc once the lookup is processed
 * @throws {InvalidRiotResponseError} - the request to riot failed
 * @throws {NameDoesNotExistError} - the request did not yield any results
 */
function queueLookup (name) {
	return new Promise(function (resolve, reject) {
		var nameToQueue = {
			name: name,
			resolve: resolve,
			reject: reject
		};
		// if there aren't any batches currently, start up processNextBatch
		// again, otherwise assume it will start itself when done with its lookup
		if (!queuedBatches.length) {
			queuedBatches.push([nameToQueue]);
			processNextBatch();
		} else if (queuedBatches[queuedBatches.length - 1].length === 20) {
			// if the last queue is full, push a new array
			queuedBatches.push([nameToQueue]);
		} else {
			queuedBatches[queuedBatches.length - 1].push(nameToQueue);
		}
	});
}

/**
 * Gets ID for a given summoner name, querying the database if necessary
 * @param {String} summonerName - name of the summoner to look up
 * @returns {Promise} resolves with id once found
 */
function getSummonerInfo(summonerName) {
	if (!db) {
		return Promise.reject("Not connected to database");
	}
	// santize the name
	var name;
	try {
		name = sanitizeName(summonerName);
	} catch (error) {
		return Promise.reject(error);
	}
	// check if name is in local cache
	if (nameMap[name]) {
		console.log('variable hit', name);
		stats.variableHits += 1;
		return Promise.resolve(nameMap[name]);
	}
	// check if name is in local db
	return db.collection('summonerInfo').findOneAsync({lookup:name})
		.then(function (foundSummoner) {
			// check if name is stored and was successful
			if (foundSummoner && foundSummoner.results) {
				console.log('database hit', name);
				stats.databaseHits += 1;
				return foundSummoner;
			}
			// check if name does not exist
			if (foundSummoner && foundSummoner.invalid) {
				console.log('database hit', name);
				stats.databaseHits += 1;
				throw new NameDoesNotExistError(name);
			}
			// query riot for name
			console.log('api hit', name);
			stats.apiHits += 1;
			return queueLookup(name).then(function (results) {
				var newDbEntry = {lookup: name, results: results};
				return db.collection('summonerInfo').insertAsync(newDbEntry).then(function () {
					return newDbEntry;
				});
			}).catch(NameDoesNotExistError, function (error) {
				// If name does not exist, store it in the db as such
				var newDbEntry = {lookup: name, invalid: true};
				return db.collection('summonerInfo').insertAsync(newDbEntry).then(function () {
					throw error;
				});

			});
		});
}

/**
 * Given an error and an http response object, respond to the request with a proper error message
 * @param {http.response} res - standard response object for an http server
 * @param {Error} error - json serializable error
 */
function errorResponse(res, error) {
	if (error instanceof NameDoesNotExistError) {
		res.writeHead(200, {'Content-Type': 'application/json'});
		res.end(JSON.stringify({invalidName: true}));
		return;
	}
	res.writeHead(500, {'Content-Type': 'application/json'});
	console.log(error);
	if (error.stack) {
		console.log(error.stack);
	} else {
		console.log('no stack');
	}
	var renderedError;
	if (error && error.name) {
		renderedError = {
			name: error.name,
			message: error.message
		};
		if (error.requestedName) {
			renderedError.requestedName = error.requestedName;
		}
	} else {
		renderedError = error;
	}
		
	res.end(JSON.stringify({error: error}));
}


app.use(morgan('combined'));

app.use(function (err, req, res, next) {
	console.log('express error?', err);
	errorResponse(res, err);
});


app.get('/summonerlookup/:summonername', function (req, res) {
	var summonername = req.params.summonername;
	
	getSummonerInfo(summonername)
		.then(function (info) {
			res.writeHead(200, {'Content-Type': 'application/json'});
			res.end(JSON.stringify(info));
		})
		.catch(errorResponse.bind(null, res));
});


app.get('/currentmatch/:summonerid', function (req, res) {
	errorResponse(res, 'Current match not yet implemented');
	
});

app.get('/', function (req, res) {
	if (req.url !== '/') {
		errorResponse(res, 'Unknown request: ' + req.url);
		return;
	}
	res.writeHead(200, {'Content-Type': 'application/json'});
	res.end(JSON.stringify(stats));
});


function init () {
	var client = mongodb.MongoClient.connectAsync('mongodb://mongo:27017/urfday').catch(function (error) {
		console.log('failed to connect to database, retrying in 3 seconds');
		setTimeout(function () {
			init();
		}, 3000);
	}).then(function (foundDb) {
		db = foundDb;
		http.createServer(app).listen(HTTP_PORT);
		console.log('connected to database, listening for requests', 'balognaa');
	});
}

init();
