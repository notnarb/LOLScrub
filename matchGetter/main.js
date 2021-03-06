var util = require('util');
var Promise = require('bluebird');
var request = require('request');
var mongodb = require('mongodb');
var moment  = require('moment');

Promise.promisifyAll(request);
Promise.promisifyAll(mongodb.MongoClient);
Promise.promisifyAll(mongodb.Collection.prototype);

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
 * Get the currentDate from the database then calls loopOrWait
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
			console.log('loop started');
			loopOrWait(db);
		});
		;
	});
}

/**
 * Check if there should be new data, query if the new data exists, then call
 * loopOrWait again either via process.setTimeout() or process.nextTick depending on what the believed wait time for new data is
 */
function loopOrWait (db) {
	if (!currentDate) {
		throw "Startloop called when currentDate isn't set";
	}
	var now = moment();
	// If the current time isn't more than 10 minutes past the last checked
	// date, call this function again around when that should be
	var expectedTime = currentDate.clone().add(10, 'minutes');
	// if expected time - now > 0, wait however long that is
	var timeUntilNextCheck = expectedTime.diff(now);
	if (timeUntilNextCheck > 0) {
		console.log('waiting', timeUntilNextCheck);
		setTimeout(loopOrWait.bind(null, db), timeUntilNextCheck);
		return;
	}

	var timestamp = currentDate.unix();
	matchListIsValid(db.collection('matchList'), timestamp).then(function (result) {
		// if a valid result already exists, don't hit the api and increment the date
		if (result) {
			process.stdout.write('~');
			getNextDate();
			return Promise.resolve();
		}
		return getMatchList(timestamp).then(function (results) {
			console.log('storing match list', timestamp);
			return storeMatchList(db.collection('matchList'), results, timestamp).then(function () {
				console.log('stored match list', timestamp);
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
			console.log("Hit api limit, waiting for one minute");
			return Promise.delay(60000);
		}
		return Promise.reject(error);
	}).finally(function () {
		// trigger loopOrWait again, but add it to the event loop rather than
		// straight recursively calling it to prevent memory leaks
		process.nextTick(loopOrWait.bind(this, db));
	});
	
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
		'http://riotambassador:8000/api/lol/na/v4.1/game/ids',
		'?beginDate=' + time
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
				// if there is more results in this search result, replace the record
				if (resultBody.length > result.resultList.length) {
					console.log('More results found, updating record');
					return collection.updateAsync({_id: result._id}, {resultList: resultBody});
				}
				console.log('No results found, skipping');
				return Promise.resolve();
			}
			return collection.insertAsync({
				time: time,
				resultList: resultBody	//resultBody should be an array
			});
		});

}

var client = mongodb.MongoClient.connectAsync('mongodb://mongo:27017/urfday')
		.then(function (foundDb) {
			var db = foundDb;
			return initLoop(db);
		}).catch(function (error) {
			console.log('Found error', error, 'exiting');
		});
