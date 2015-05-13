/**
 * @module matchCollector/matchLookup
 * @desc listens to requests from the new-match-id queue to get new matchIds to
 * lookup.  Outputs found matches to the new-match-data queue.
 */
var util = require('util');
var Promise = require('bluebird');
var request = require('request');
var mongodb = require('mongodb');

Promise.promisifyAll(mongodb.MongoClient);
Promise.promisifyAll(mongodb.Collection.prototype);
Promise.promisifyAll(request);

var DBSTRING = 'mongodb://mongo:27017/matchcollector';
var COLLECTION_NAME = 'matchData';
var db;

var NUM_WORKERS = process.env.NUM_WORKERS || 1;

var rabbitWorker = require('rabbit-worker');
var RABBITSERVER = 'matchcollectorqueue';

var matchIdRoutingKey = 'new-match-id';
var matchesToSaveRoutingKey = 'new-match-data';
var matchIdWorkers = [];

var RIOT_API_SERVER = 'http://riotambassador:8000';

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
var matchDataTasker = new rabbitWorker.Tasker(RABBITSERVER, matchesToSaveRoutingKey);

/**
 * @desc Stores the info for one match into the new-match-data queue.  Retries
 * when it fails until it succeeds
 * @returns {Promise} - resolves once match has been stored in the queue
 */
function storeMatch (matchInfo) {
	return new Promise(function (resolve, reject) {
		var attemptStore = function () {
			try {
				console.log('Storing match');
				matchDataTasker.publish(JSON.stringify(matchInfo));
				resolve();
				console.log('match stored');
			} catch (error) {
				console.log('failed to store match, retrying in 1 second');
				setTimeout(attemptStore, 1000);
			}
		};
		attemptStore();
	});
}

/**
 * Handler for new matches in the new-match-id queue
 * @param {string} msg - the message sent from the queue
 * @param {funciton} ack - the function to call to signify that this match has been processed
 */
function lookupMatch (msg, ack) {
	var matchId = msg;
	console.log('processing match', matchId);
	var requestUrl = [
		RIOT_API_SERVER,
		'/api/lol/na/v2.2/match/',
		matchId,
		'?includeTimeline=true'
	].join("");
	isNewMatchId(matchId).then(function (isNew) {
		if (!isNew) {
			ack();
		} else {
			request.getAsync(requestUrl, {json: true}).then(function (args) {
				var response = args[0];
				var body = args[1];
				if (body.status && body.status.status_code) {
					riotErrorHandler(body.status.status_code);
				}
				if (response.statusCode !== 200) {
					riotErrorHandler(response.statusCode);
				}
				storeMatch(body).then(function (){
					ack();
				});
			}).catch(RiotApiError, function (error) {
				if (error.code === 404) {
					// ignore matches which give 404 responses
					console.warn('matchId 404:', matchId, '. Ignoring.');
					ack();
				} else if (error.code === 429) {
					console.log('rate limit exceeded, retrying in 3 seconds');
					setTimeout(function () {
						lookupMatch(msg, ack);
					}, 3000);
				} else {
					console.warn('unkown error', error, 'retrying in 10 seconds');
					setTimeout(function () {
						lookupMatch(msg, ack);
					}, 10000);
				}
			}).catch(function (error) {
				console.warn('Failed to perform request', error, 'retrying in 10 seconds');
				setTimeout(function () {
					lookupMatch(msg, ack);
				}, 10000);
			});
		}
	});

}
function initWorker () {
	var i;
	for (i = 0; i < NUM_WORKERS; i++) {
		console.log('created worker');
		matchIdWorkers.push(new rabbitWorker.Worker(RABBITSERVER, matchIdRoutingKey, lookupMatch));
	}
	console.log('created', i, 'workers');
}

/**
 * Connect to the database, retrying on failures.  Uses setTimeout instead of recursive promises to prevent infinitely growing stack trace
 * @returns {Promise} - resolves with database object once connected to database
 */
function initDb() {
	return new Promise(function (resolve, reject) {
		var attempt = function () {
			console.log('Connecting to database');
			mongodb.MongoClient.connect(DBSTRING, function (err, foundDb) {
				if (err) {
					console.warn("Failed to connect to database, retrying in 3 seconds");
					setTimeout(attempt, 3000);
				} else {
					console.log('connected to database');
					resolve(foundDb);
				}
			});
		};
		attempt();
	});
}

/**
 * @desc Determines whether or not a match ID is stored or not
 * @param {String} matchId - the match to check
 * @returns {Promise} - resolves with a boolean of true if it IS a new match ID, false otherwise
 */
function isNewMatchId (matchId) {
	return db.collection(COLLECTION_NAME).findOneAsync({matchId: parseInt(matchId, 10)}).then(function (doc) {
		if (doc) {
			// already exists, false, not a new match ID
			return false;
		} else {
			return true;
		}
	});
}

function main () {
	initDb().then(function (foundDb) {
		db = foundDb;
		initWorker();
	});
}

main();
