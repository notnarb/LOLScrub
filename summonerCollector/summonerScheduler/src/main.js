/**
 * @module summonerCollector/summonerStorer
 * @desc Consumes summoner ID's and (optionally) the matchIDs those summoners are in
 */

var Promise = require('bluebird');
var rabbitWorker = require('rabbit-worker');
var mongodb = require('mongodb');

Promise.promisifyAll(mongodb.MongoClient);
Promise.promisifyAll(mongodb.Collection.prototype);

var SUMMONER_RABBIT_SERVER = 'summonercollectorqueue';
var summonersToScheduleRoutingKey = 'summoner-lookup-scheduler';
var schedulerTasker;

var DBSTRING = 'mongodb://mongo:27017/summonercollector';
var COLLECTION_NAME = 'summoner';

var db;

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
 * @desc Creates the rabbit tasker
 */
function initSchedulerTasker() {
	schedulerTasker = new rabbitWorker.Tasker(SUMMONER_RABBIT_SERVER, summonersToScheduleRoutingKey);
}

/**
 * @desc Updates the lastLookup timestamp for a summoner which has been looked
 * up.  Note: provides no write or journal guarentees
 */
function updateSummonerLastLookup (summoner) {
	return db.collection(COLLECTION_NAME).updateAsync({_id : summoner._id}, {'$set': {lastLookup: Date.now()}});
}

/**
 * @desc Queues a summoner ID (as a string) into the summoner-lookup-scheduler queue
 */
function queueSummoner (summoner) {
	if (!schedulerTasker) {
		return Promise.reject(new Error('schedulerTasker not initialized'));
	}
	return new Promise(function (resolve, reject) {
		var summonerId = summoner.summonerId;
		if (!summonerId) {
			console.dir(summoner);
			reject(new Error('Summoner has no summoner ID'));
		}
		var attempt = function () {
			try {
				schedulerTasker.publish(String(summonerId));
				resolve();
			} catch (error) {
				console.log("Failed to publish summoner ID, retrying in 3 seconds");
				setTimeout(attempt, 3000);
			}
		};
		attempt();
	});
}

/**
 * @desc Queues a summoner and updates their lastLookup property
 * @returns {Promise} - resolves once queued and updated
 */
function scheduleSummoner(summoner) {
	console.log('queueing summoner', summoner);
	return queueSummoner(summoner).then(function () {
		return updateSummonerLastLookup(summoner);
	}).then(function () {
		console.log('queued');
	});
}

/**
 * @desc Gets all un-looked up summoners and saves them to the summoner-lookup-scheduler queue
 * @returns {Promise} - resolves when all new summoners (at the time of
 * initiation) ahve been stored
 */
function getNewSummoners () {
	var cursor = db.collection(COLLECTION_NAME).find({lastLookup:0});
	return new Promise (function (resolve, reject) {
		var processSummoner = function (error, summoner) {
			if (!summoner) {
				console.log('all new summoners found');
				resolve();
				return;
			}
			scheduleSummoner(summoner).then(function () {
				process.nextTick(cursor.next.bind(cursor, processSummoner));
			});
		};
		cursor.next(processSummoner);
	});
}

/**
 * @desc Orchestrates the initialization of database and mq connections
 */
function main () {
	initSchedulerTasker();
	initDb().then(function (foundDb) {
		db = foundDb;
		var checkForNewSummoners = function () {
			getNewSummoners().then(function () {
				console.log('Summoner list exhausted, checking again in 1 minute');
				setTimeout(checkForNewSummoners, 60000);
			});
		};
		checkForNewSummoners();
		// TODO: set up listener to allow the scheduling of summoners newer that ____
	});
}

main();
