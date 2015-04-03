var util = require('util');
var Promise = require('bluebird');
var request = require('request');
var mongodb = require('mongodb');
var http = require('http');


Promise.promisifyAll(request);
Promise.promisifyAll(mongodb.MongoClient);
Promise.promisifyAll(mongodb.Collection.prototype);

// List of Ids which have been checked
// Match id -> true (has been checked)
var idMap = {};

// List of Ids which need to be checked
// match id -> true (needs to be checked)
var idsToCheck = {};

// List of matchLists which have been added to either the idMap or the ids to check list
// Match list time -> true (has been added to id map)
var matchListMap = {};

var db;

var client = mongodb.MongoClient.connectAsync('mongodb://mongo:27017/urfday')
		.then(function (foundDb) {
			db = foundDb;
			// fill list of already obtained match ids
			return initializeIdMap(db.collection('matches'));
		}).then(function () {
			// populate idsToCheck
			return updateMatchListMap(db.collection('matchList'));
		}).then(function () {
			// iterate over idsToCheck
			lookupLoop(db);
		}).catch(function (error) {
			console.log('Found error', error, 'exiting');
		});


function RiotApiError (message, code) {
	Error.call(this);
	this.name = 'RiotApiError';
	this.message = message;
	this.code = code;
};

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
		throw new RiotApiError("Rate limit exceeded", statusCode); //TODO: convert to catchable error
	case 500:
		throw new RiotApiError('Internal server error', statusCode);
	case 503:
		throw new RiotApiError('Service unavailable', statusCode);
	default:
		console.log('Unknown code:', statusCode);
	}

}

/**
 * Given a mongodb collection, generate a list of obtained match Ids and store
 * them in the idMap so the api knows to not obtian them again.  This should be
 * used to pre-polulate the idmap on first run
 * @param {mongodb.Collection) collection - collection storing matches
 * @returns {Promise} - resolves when list has been filled
 */
function initializeIdMap (collection) {
	return new Promise (function (resolve, reject) {
		// get a list of matchIds in the currenct collection
		collection.find({}, {matchId: 1}).toArray(function (err, docs) {
			if (err) {
				reject(err);
			} else {
				resolve(docs);
			}
		});
	}).then(function (results) {
		results.forEach(function (result) {
			idMap[result.matchId] = true;
		});
	});
}

/**
 * Add a match ID to the list of match IDs to check.  Don't add the match ID if it already exists
 * @param {Interger} matchId - match ID to queue
 */
function queueMatchId (matchId) {
	if (idMap[matchId]) {
		console.log('Duplicate match', matchId, 'already has been checked');
		return;
	}
	if (idsToCheck[matchId]) {
		console.log('Duplicate match', matchId, 'already has been queued to be checked');
		return;
	}
	idsToCheck[matchId] = true;
}

/**
 * Iterate through the list of matchLists and queue all the ids inside
 * @param {mongodb.Collection} collection - location where matchLists are stored
 * @returns {Promise} - resolves once done obtaining match ids
 */
function updateMatchListMap (collection) {
	return new Promise (function (resolve, reject) {
		collection.find({}).toArray(function (err, docs) {
			if (err) {
				reject(err);
			} else {
				resolve(docs);
			}
		});
	}).then(function (results) {
		console.log(typeof results, results.length);
		// get list of matchList results
		if (!results) {
			throw "no results found";
		}
		results.filter(function (matchListResult) {
			// filter all matchLists which have already been checked
			return !matchListMap[matchListResult.time];
		}).forEach(function (matchListResult) {
			// mongo db id
			var id = matchListResult._id;
			// time the resultList is for
			var time = matchListResult.time;
			// list of ids
			var resultList = matchListResult.resultList;
			
			if (!time) {
				console.log('Missing time for matchList, skipping', id);
				return;
			}
			if (matchListMap[time]) {
				console.log('Match list', time, 'has already been checked, skipping.');
				return;
			}
			
			// for each match list
			if (!resultList || !resultList.length) {
				console.log("Missing resultList for", id, "skipping");
				return;
			}
			
			resultList.forEach(function (matchId) {
				// for each match within a match list
				queueMatchId(matchId);
			});
			
			matchListMap[time] = true;
			
		});

	});
}

function lookupLoop (db) {
	var keyList = Object.keys(idsToCheck);
	if (!keyList.length) {
		// if there aren't any keys, exit
		console.log('key list exhausted, pausing for 1 minute');
		setTimeout(function () {
			console.log('starting again');
			updateMatchListMap(db.collection('matchList')).then(function () {
				process.nextTick(lookupLoop.bind(null, db));
			});	
		}, 60 * 1000);
		return;
	}
	var matchId = keyList.pop();
	console.log('looking up', matchId);
	getMatch(matchId).then(function (results) {
		console.log('storing', matchId);
		return storeMatch(db.collection('matches'), results);
	}).then(function () {
		idMap[matchId] = true;
		delete idsToCheck[matchId];
	}).catch(RiotApiError, function (error) {
		// catch rate limit errors and handle them gracefully
		if (error.code === 429) {
			// wait 10 seconds if limit passed
			console.log('exceeded limit, waiting 5 seconds');
			return Promise.delay(5000);
		}
		throw (error);
	}).finally(function () {
		process.nextTick(lookupLoop.bind(null, db));
	});
};

/**
 * Makes a request to the riot api and retrieve information for a single match.
 * @param {String} matchId - the unique ID of the match to look up
 * @returns {Promise} - resolves with the parsed object response
 * @throws rejects promise if given a status code in the response
 */
function getMatch (matchId) {
	if (!matchId) {
		return null;
	}
	var requestUrl = [
		'http://riotambassador:8000/api/lol/na/v2.2/match/',
		matchId,
		'?includeTimeline=true'
	].join("");
	return request.getAsync(requestUrl, {json: true}).then(function (args) {
		var response = args[0];
		var body = args[1];
		if (body.status && body.status.status_code) {
			riotErrorHandler(body.status.status_code);
		}
		return body;
	});
}

/**
 * Given results from getMatch(), store them into mongo
 * @param {mongodb.Collection} collection - collection to insert the results into
 * @param {Object} resultBody - result of the getMatch request
 * @returns {Promise} - resolves once stored into the database
 */
function storeMatch (collection, resultBody) {
	// TODO: look up the performance impact of doing a search before each insert
	return collection.findOneAsync({matchId : resultBody.matchId})
		.then(function (result) {
			if (result) {
				console.log('Match ' + resultBody.matchId + ' already exists, skipping');
				return Promise.resolve();
			} else {
				return collection.insertAsync(resultBody);
			}
		});

}

http.createServer(function (req, res) {
	var response = String(Object.keys(idsToCheck).length);
	res.writeHead(200, {'Content-Type': 'application/json'});
	res.end(response);
}).listen(8001);
