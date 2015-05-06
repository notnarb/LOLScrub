/**
 * @module matchcollector/matchstorer
 * @desc Consumes match data and saves it to the database.  Additionally sends participants off to a summoner consumer
 */

var Promise = require('bluebird');
var rabbitWorker = require('rabbit-worker');
var mongodb = require('mongodb');
var request = require('request');

Promise.promisifyAll(request);
Promise.promisifyAll(mongodb.MongoClient);
Promise.promisifyAll(mongodb.Collection.prototype);

var MATCH_RABBIT_SERVER = 'matchcollectorqueue';
var matchesToSaveRoutingKey = 'new-match-data';

var DBSTRING = 'mongodb://mongo:27017/matchcollector';
var COLLECTION_NAME = 'matchData';

var db;

/**
 * Handler for match data from the match data queue.  Triggers a storage in the
 * database and summoner ID queue
 * @param {String} msg - the message sent from the queue
 * @param {function} ack - the callback to signify that the work was successful
 */
function storeMatch (msg, ack) {
	// Let it die without recovery if parsing the message fails
	var matchData = JSON.parse(msg);
	// discard urf matches
	if (matchData.queueType === "URF_5x5") {
		console.log('Found urf match, skipping...');
		ack();
		return;
	}
	Promise.all([saveMatchToDb(matchData), saveParticipants(matchData)])
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
 * @desc Saves a single match to the database
 * @param {Object} matchData - parsed match data
 * @returns {Promise} - resolves once match has been stored
 */
function saveMatchToDb (matchData) {
	return db.collection(COLLECTION_NAME).insertOneAsync(matchData, {w: 1, j: true}).catch(function (error) {
		// Catch and ignore duplicate key errors
		if (error.code === 11000) { //duplicate key error
			console.log('duplicate entry', matchData.matchId);
		} else {
			// throw non-duplicate key errors
			throw error;
		}
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
			foundPlayers.push(participant.player.summonerId);
		} else {
			console.warn('Missing player information for participant', participant);
		}
	});

	if (!foundPlayers.length) {
		return Promise.resolve();
	}

	// TODO:
	return Promise.reject('Publishing participants not implemented yet');
}

/**
 * @desc Creates a rabbit worker to start consuming matches from the new match queue
 */
function initWorker() {
	var matchDataTasker = new rabbitWorker.Worker(MATCH_RABBIT_SERVER, matchesToSaveRoutingKey, storeMatch);
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
 * @desc Ensures that there is an index on the mongo collection
 */
function initCollection () {
	return db.collection(COLLECTION_NAME).createIndexAsync('matchId', {
		unique :true,
		sparse: true			//sparse indexes require that documents have this field
	});
}

/**
 * @desc Orchestrates the initialization of database and mq connections
 */
function main () {
	initDb().then(function (foundDb) {
		db = foundDb;
		return initCollection();
	}).then(function () {
		initWorker();
	});

}

main();
