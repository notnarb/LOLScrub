var util = require('util');
var Promise = require('bluebird');
var request = require('request');
var mongodb = require('mongodb');
var moment  = require('moment');

Promise.promisifyAll(request);
Promise.promisifyAll(mongodb.MongoClient);
Promise.promisifyAll(mongodb.Collection.prototype);

var secrets = require('./secrets.json');

var db;

var FORMAT_STRING = "YYYY-MM-DD HH:mm:ss";

// 0 indexed month.  start date = the first of april (4).
// april first at 4:30 am seems to be the first date
var startDate = moment([2015, 3, 1, 5]);

var currentDate = null;

/**
 * Add 5 minutes to the current date and return it
 * @returns {Moment} - copy of the date to lookup
 */
function getNextDate () {
	currentDate.add(5, 'minute');
	return currentDate.clone();
}

/**
 * Get the currentDate from the database then call startLoop
 * @param db - mongo database object
 */
function initLoop (db) {
	console.log('starting loop');
	db.collection('info').removeAsync().then(function () {
		return db.collection('info').findOneAsync({id: 'currentDate'})
		.then(function (result) {
			console.log('found current date: ', result);
			// if there isn't a result, insert the hard coded startDate, then resolve with it
			if (!result) {
				console.log('no current date, inserting now');
				console.log(startDate.format(FORMAT_STRING));
				var toInsert = startDate.valueOf();
				return db.collection('info').insertAsync({id: 'currentDate', currentDate: toInsert})
					.then(function () {
						return toInsert;
					});
			}
			return result.currentDate;
		}).then(function (result) {
			currentDate = moment(result);
			console.log('Starting with current date', currentDate.format(FORMAT_STRING));
		})
		.then(function () {
			startLoop(db);
			console.log('loop started');
		});
		;
	});
}

/**
 * Start the main loop
 * @param db - mongo database object
 */
function startLoop (db) {
	if (!currentDate) {
		throw "Startloop called when currentDate isn't set";
	}
	var currentPromise = Promise.resolve();
	setInterval (function ()  {
		var now = moment();
		// don't perform an operation if another is in progress TODO: I could do this better
		if (currentPromise.isPending()) {
			// if there is a current match lookup in progress, skip
			console.log('Lookup in progress, skipping');
			return;
		}
		// console.log('comparing date times', now.format(FORMAT_STRING), currentDate.format(FORMAT_STRING));
		// If it has been less than 10 minutes since the current date we are
		// searching for, skip
		if (now.diff(currentDate, 'minutes') < 10) {
			// console.log('has not been 5 minutes, skipping', now.diff(currentDate, 'minutes'));
			process.stdout.write('.');
			return;
		};

		var timestamp = currentDate.unix();
		currentPromise = matchListIsValid(db.collection('matchList'), timestamp).then(function (result) {
			// if a valid result exists, don't hit the api
			if (result) {
				process.stdout.write('~');
				getNextDate();
				return Promise.resolve();
			}
			return getMatchList(timestamp).then(function (results) {
				console.log('storing match list');
				return storeMatchList(db.collection('matchList'), results, timestamp).then(function () {
					console.log('stored match list');
					getNextDate();
					return;
				});
			});
		}).catch(RiotApiError, function (error) {
			if (error.code === 404) {
				console.log('404 for date, skipping');
				getNextDate();
				return Promise.resolve();
			};
			if (error.code === 429) {
				// wait for 1 minute if api replies with rate limit exceeded
				// TODO: alter error handlers to parse for wait header
				return Promise.delay(60000);
			}
			return Promise.reject(error);
		});
		// run every 1.2 seconds since that is how many requests you can do per
		// second over the course of 10 minutes
	}, 1200);
}


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
 * Given a date, get a list of match Ids from the riot api
 * @param {Integer} time - date time (epoch) to lookup
 * @returns {Promise} - resolves with array of match IDs
 * @throws rejects promise if given a status code in the response
 */
function getMatchList (time) {
	var requestUrl = [
		'https://na.api.pvp.net/api/lol/na/v4.1/game/ids',
		'?beginDate=' + time,
		'&api_key=' + secrets['api-key']
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
 * Makes a request to the riot api and retrieve information for a single match.
 * Expects 'secrets["api-key"]' to be available. Note: the region of 'na' is
 * hardcoded into this function
 * @param {String} matchId - the unique ID of the match to look up
 * @returns {Promise} - resolves with the parsed object response
 * @throws rejects promise if given a status code in the response
 */
function getMatch (matchId) {
	if (!matchId) {
		return null;
	}
	var requestUrl = [
		'https://na.api.pvp.net/api/lol/na/v2.2/match/',
		matchId,
		'?includeTimeline=true',
		'&api_key=' + secrets['api-key']
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

/**
 * Checks the database for a match list with the specified time exists. Resolves
 * with true if it does exist AND isn't empty.  Otherwise resolves with false
 * @param {mongodb.Collection} collection - collection to check
 * @param {Integery} time - timestamp of the collection to check
 * @returns {Promise} - resolves if a valid match list with that timestamp exists
 */
function matchListIsValid (collection, time) {
	if (!collection || !time) {
		return Promise.reject("Missing params for matchListIsValid");
	}
	return collection.findOneAsync({time: time})
		.then(function(results) {
			if (results && results.resultList && results.resultList.length) {
				return true;
			}
			return false;
		});
};
/**
 * Given results from getMatchList(), store them into mongo
 * @returns {Promise}
 */
function storeMatchList (collection, resultBody, time) {
	if (!collection || !resultBody || !time) {
		return Promise.reject("Missing params for storeMatchList");
	}
	
	return collection.findOneAsync({time: time})
		.then(function (result) {
			if (result) {
				console.log('results already exist for time', time);
				// TODO: see if the info is different
				return Promise.resolve();
			}
			return collection.insertAsync({
				time: time,
				resultList: resultBody	//resultBody should be an array
			});
		});

}
// getMatch(1778704162).then(function (responseBody) {
// 	console.log(responseBody);
// });

var client = mongodb.MongoClient.connectAsync('mongodb://mongo:27017/urfday')
		.then(function (foundDb) {
			db = foundDb;
			return initLoop(db);
		}).catch(function (error) {
			console.log('Found error', error, 'exiting');
		});
		// 	return getMatch(1778704162);
		// })
		// .then(function (results) {
		// 	return storeMatch(db.collection('matches'), results);
		// })
		// .then(function () {
		// 	console.log('done!');
		// });
