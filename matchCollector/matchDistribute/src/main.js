/**
 * @module matchcollector/matchDistribute
 * @desc Obtains match data, filters it, and distributes it to other queues
 */

var Promise = require('bluebird');
var rabbitWorker = require('rabbit-worker');
var request = require('request');

Promise.promisifyAll(request);

var LIVE_DATA_RABBIT_SERVER = 'livedataqueue';

var MATCH_RABBIT_SERVER = 'matchcollectorqueue';
var incomingMatchDataRoutingKey = 'new-match-data';
var storeMatchRoutingKey = 'match-data-to-store';
var matchStoreTasker;

var liveMatchDataRoutingKey = 'live-match-data';
var liveMatchTasker;

var SUMMONER_RABBIT_SERVER = 'summonercollectorqueue';
var summonersToSaveRoutingKey = 'new-summoner';
var summonerTasker;

/**
 * Handler for match data from the match data queue.  Triggers a storage in the
 * database and summoner ID queue
 * @param {String} msg - the message sent from the queue
 * @param {function} ack - the callback to signify that the work was successful
 */
function storeMatch (msg, ack) {
	var matchData;
	// Let it die without recovery if parsing the message fails
	try {
		matchData = JSON.parse(msg);
	} catch (error) {
		console.log('Error parsing match data, quitting', msg, error);
		process.exit(1);
	}
	// discard urf matches
	if (matchData.queueType !== "RANKED_SOLO_5x5") {
		console.log('Found non-5x5 ranked solo game, skipping');
		ack();
		return;
	}
	if (matchData.matchCreation < 1430553656013) {
		console.log('Skipping old match', matchData.matchCreation, 1430553656013);
		ack();
		return;
	}

	console.log('storing match', matchData.matchId);
	Promise.all([saveMatchToDbQueue(matchData, msg), saveParticipants(matchData), saveMatchToLiveDataQueue(matchData, msg)])
		.then(function () {
			console.log('match', matchData.matchID, 'saved successfully');
			ack();
		})
		.catch(function (error) {
			console.warn('[Error]: fatal error, failed to store match data');
			console.dir(error);
			console.dir(matchData);
			process.exit(1);
		});
}

/**
 * @desc Saves a single match to the database queue
 * @param {Object} matchData - parsed match data (to filter the data)
 * @param {String} matchDataString - the match Data as a string (since it was stringified before being sent here)
 * @returns {Promise} - resolves once match has been stored
 */
function saveMatchToDbQueue (matchData, matchDataString) {
	// TODO: filter new match data to get rid of now-irrelevant data
	if (!matchStoreTasker) {
		return Promise.reject(new Error('Missing matchStoreTasker'));
	}
	return new Promise(function (resolve, reject) {
		var attempt = function () {
			try {
				matchStoreTasker.publish(matchDataString);
				resolve();
			} catch(error) {
				console.log('Failed to store match data to matchStore queue, retrying in 1 second');
				setTimeout(attempt, 1000);
			}
		};
		attempt();
	});
}

/**
 * @desc Saves a single match to the LIVE MATCH data queue
 * @param {Object} matchData - parsed match data (to filter the data)
 * @param {String} matchDataString - the match Data as a string (since it was stringified before being sent here)
 * @returns {Promise} - resolves once match has been stored
 */
function saveMatchToLiveDataQueue (matchData, matchDataString) {
	// TODO: filter new match data to get rid of now-irrelevant data
	if (!liveMatchTasker) {
		return Promise.reject(new Error('Missing liveMatchTasker'));
	}
	return new Promise(function (resolve, reject) {
		var attempt = function () {
			try {
				liveMatchTasker.publish(matchDataString);
				resolve();
			} catch(error) {
				console.log('Failed to store match data to live match queue, retrying in 1 second');
				setTimeout(attempt, 1000);
			}
		};
		attempt();
	});	
}

/**
 * @desc Send the list of participants in a match to a summoner consumer
 * @param {Object{ matchData - parsed match data
 * @returns {Promise} - resolves once summoner data has been stored
 */
function saveParticipants(matchData) {
	var foundPlayers = [];
	matchData.participantIdentities.forEach(function (participant) {
		// console.log(participant.player);
		if (participant.player) {
			foundPlayers.push({
				summonerId: participant.player.summonerId,
				matchId: matchData.matchId
			});
		} else {
			console.warn('Missing player information for participant', participant);
		}
	});

	if (!foundPlayers.length) {
		return Promise.resolve();
	}

	return Promise.all(foundPlayers.map(storeParticipant));
}

/**
 * @desc Stores a single participant, retrying if it fails to save.
 * @param {Object} participantInfo
 * @param {Integer} participantInfo.summonerId - the summoner ID to store
 * @param {Integer} participantInfo.matchId - the match ID of the match the summoner participated in
 * @returns {Promise} - resolves once the participant has been stored
 */
function storeParticipant (participantInfo) {
	if (!summonerTasker) {
		return Promise.reject(new Error('Missing summonerTasker'));
	}
	return new Promise(function (resolve, reject) {
		var payload = JSON.stringify(participantInfo);
		var attempt = function () {
			try {
				summonerTasker.publish(payload);
				resolve();
			} catch(error) {
				console.log('Failed to store participant info, retrying in 1 second');
				setTimeout(attempt, 1000);
			}
		};
		attempt();
	});
}

/**
 * @desc Creates a rabbit worker to start consuming matches from the new match queue
 */
function initWorker() {
	var matchDataTasker = new rabbitWorker.Worker(MATCH_RABBIT_SERVER, incomingMatchDataRoutingKey, storeMatch);
}

function initSummonerTasker() {
	summonerTasker = new rabbitWorker.Tasker(SUMMONER_RABBIT_SERVER, summonersToSaveRoutingKey);
}

function initStorerTasker() {
	matchStoreTasker = new rabbitWorker.Tasker(MATCH_RABBIT_SERVER, storeMatchRoutingKey);
}

function initLiveDataTasker() {
	liveMatchTasker = new rabbitWorker.Tasker(LIVE_DATA_RABBIT_SERVER, liveMatchDataRoutingKey);
}


/**
 * @desc Orchestrates the initialization of database and mq connections
 */
function main () {
	initSummonerTasker();
	initStorerTasker();
	initLiveDataTasker();
	initWorker();
}

main();
