/**
 * @module summonerCollector/summonerStorer
 * @desc Consumes summoner ID's and (optionally) the matchIDs those summoners are in
 */

var Promise = require('bluebird');
var rabbitWorker = require('rabbit-worker');
var mongodb = require('mongodb');
var request = require('request');

Promise.promisifyAll(request);
Promise.promisifyAll(mongodb.MongoClient);
Promise.promisifyAll(mongodb.Collection.prototype);

var SUMMONER_RABBIT_SERVER = 'summonercollectorqueue';
var summonersToSaveRoutingKey = 'new-summoner';

var DBSTRING = 'mongodb://mongo:27017/summonercollector';
var COLLECTION_NAME = 'summoner';

var db;

/**
 * @desc Handler for new summoner id/matchID pairs
 */
function storeSummoner (msg, ack) {
	var summonerData = JSON.parse(msg);
	var summonerId = summonerData.summonerId;
	var matchId = summonerData.matchId;
	if (!summonerId) {
		throw new Error('Invalid summoner data:' + msg);
	}
	console.log('storing summonerId', summonerId);
	var command;
	// if there's a match ID, upsert the summoner AND add the match ID to the set of matches via a set insert
	if (matchId) {
		command = db.collection(COLLECTION_NAME).updateAsync({summonerId: summonerId}, {
			'$addToSet': {
				matches: matchId
			},
			$setOnInsert: {
				lastLookup: 0
			}
		}, {upsert: true, w: 1});
	} else {
		command = db.collection(COLLECTION_NAME).insertOneAsync({summonerId: summonerId, lastLookup: 0}, {w: 1});
	}

	command.catch(function (error) {
		// ignore duplicate entry errors, but throw on all other errors
		if (error.code === 11000) {
			console.log('duplicate entry', summonerId);
		} else {
			throw error;
		}
	}).then(function () {
		console.log('successfully stored summoner', summonerId);
		ack();
	}).catch(function (error) {
		console.log('Failed to insert summoner entry', summonerData);
		process.exit(1);
	});

}

/**
 * @desc Creates a rabbit worker to start consuming summoners from the new summoner queue
 */
function initWorker() {
	var matchDataTasker = new rabbitWorker.Worker(SUMMONER_RABBIT_SERVER, summonersToSaveRoutingKey, storeSummoner);
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
	return db.collection(COLLECTION_NAME).createIndexAsync('summonerId', {
		unique :true,
		sparse: true
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
