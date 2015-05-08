/**
 * @module matchCollector/matchLookup
 * @desc listens to requests from the new-match-id queue to get new matchIds to
 * lookup.  Outputs found matches to the new-match-data queue.
 */
var util = require('util');
var Promise = require('bluebird');
var request = require('request');

Promise.promisifyAll(request);

var rabbitWorker = require('rabbit-worker');

var SUMMONER_RABBIT_SERVER = 'summonercollectorqueue';
var summonersToScheduleRoutingKey = 'summoner-lookup-scheduler';
var schedulerWorker;

var MATCH_ID_ENDPOINT = "http://matchcollectorgetter:8000/newmatches/";
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

/**
 * Sends list of new matches to internal newMatchId endpoint
 * @param {Array} matchIdList - array of match ID's to send
 * @returns {Promise} - resolves once the request has been made
 */
function sendMatchList (matchIdList) {
	var requestUrl = MATCH_ID_ENDPOINT + matchIdList.join(",");
	console.log('sending match list', requestUrl);
	return new Promise(function (resolve, reject) {
		var attempt = function () {
			return request.getAsync(requestUrl, {json: true}).then(function (result) {
				var response = result[0];
				var body = result[1];
				if (response.statusCode === 200) {
					resolve();
				} else {
					throw new Error('Invalid status code', response.statusCode);
				}
			}).catch(function (error) {
				console.log('sendMatchList failed', error, 'retrying in 5 seconds');
				setTimeout(attempt, 5000);
			});
		};
		attempt();
	});
}

/**
 * @desc Processes the history returned from a matchHistory call
 */
function processHistory (data) {
	var matchList = data.matches;
	if (!matchList || !matchList.length) {
		console.log('no matches for summoner, skipping');
		return Promise.resolve();
	}

	var idList = matchList.map(function (match) {
		return match.matchId;
	});
	return sendMatchList(idList);
}

/**
 * Handler for new summoners in the summoner-lookup-scheduler queue
 * @param {string} msg - the message sent from the queue
 * @param {funciton} ack - the function to call to signify that this summoner has been processed
 */
function lookupHistory (msg, ack) {
	var summonerId = msg;
	if (!summonerId) {
		throw new Error('no summoner id to look up');
	}
	console.log('processing summoner', summonerId);
	var requestUrl = [
		RIOT_API_SERVER,
		'/api/lol/na/v2.2/matchhistory/',
		summonerId
	].join("");
	request.getAsync(requestUrl, {json: true}).then(function (args) {
		var response = args[0];
		var body = args[1];
		if (body.status && body.status.status_code) {
			riotErrorHandler(body.status.status_code);
		}
		if (response.statusCode !== 200) {
			riotErrorHandler(response.statusCode);
		}
		processHistory(body).then(function (){
			ack();
		});
	}).catch(RiotApiError, function (error) {
		if (error.code === 404) {
			// ignore summoners which give 404 responses
			console.warn('summonerId 404:', summonerId, '. Ignoring.');
			ack();
		} else if (error.code === 429) {
			console.log('rate limit exceeded, retrying in 3 seconds');
			setTimeout(function () {
				lookupHistory(msg, ack);
			}, 3000);
		} else {
			console.warn('unkown error', error, 'retrying in 10 seconds');
			setTimeout(function () {
				lookupHistory(msg, ack);
			}, 10000);
		}
	}).catch(function (error) {
		console.warn('Failed to perform request', error, 'retrying in 10 seconds');
		setTimeout(function () {
			lookupHistory(msg, ack);
		}, 10000);
	});
}

function initWorker () {
	schedulerWorker= new rabbitWorker.Worker(SUMMONER_RABBIT_SERVER, summonersToScheduleRoutingKey, lookupHistory);
}


function main () {
	initWorker();
}

main();
