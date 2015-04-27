/**
 * @module matchcollector/seedgetter
 * @desc Listens for new requests to get seed data, then populates the
 * new-match-data queue once the requests have been recieved
 */
var http = require('http');
var request = require('request');
var Promise = require('bluebird');
var rabbitWorker = require('rabbit-worker');
var morgan = require('morgan');

Promise.promisifyAll(request);

var RABBITSERVER = 'matchcollectorqueue';
var matchesToSaveRoutingKey = 'new-match-data';

var PORT = 8000;

var lookupInProgress = false;

var seedBaseUrl = 'https://s3-us-west-1.amazonaws.com/riot-api/seed_data/';
var matchLists = [
	'matches1.json',
	'matches2.json',
	'matches3.json',
	'matches4.json',
	'matches5.json',
	'matches6.json',
	'matches7.json',
	'matches8.json',
	'matches9.json',
	'matches10.json'];

var app = require('express')();

app.use(morgan('combined'));
app.use(function (err, req, res, next) {
	console.log('express error?', err);
	res.writeHead(500);
	res.end(JSON.stringify('unknown error'));
});

app.get('/getnewseed/', function (req, res) {
	// make sure there isn't a current lookup
	if (lookupInProgress) {
		res.writeHead(503);
		res.end(JSON.stringify({error: 'Lookup in progress'}));
		return;
	}
	lookupInProgress = true;
	// initialize a new lookup of the seed data
	getNewSeedData().then(function () {
		console.log('Successfully stored seed data');
	}).catch(function (error) {
		console.warn('Failed to store seed data', error);
	}).finally(function () {
		lookupInProgress = false;
	});
	// respond
	res.writeHead(200);
	res.end(JSON.stringify({result: 'new seed data grab initialized'}));
});

http.createServer(app).listen(PORT);
console.log('server initialized on port', PORT);


// Location to store the new match data
var matchDataTasker = new rabbitWorker.Tasker(RABBITSERVER, matchesToSaveRoutingKey);


/**
 * Download the 10 match sets from riot and store them in the new-match-data
 * queue.  Perform each match in order to not cripple bandwidth.
 * @returns {Promise} - resolves when all matches have been stored
 */
function getNewSeedData() {
	// current promise to chain the next response off of (so that each match one
	// after another)
	var currentLookup = Promise.resolve();
	// list of promises related to the successful storage of each found match list
	var storagePromiseList = [];
	
	matchLists.forEach(function (matchListName) {
		var url = seedBaseUrl + matchListName;
		currentLookup = currentLookup.then(requestList.bind(null, url));
		// parallel to the ordered lookups, store the response to each lookup performed
		storagePromiseList.push(currentLookup.then(storeResults));
	});
	
	// Resolve when all match storage actions resolves
	return Promise.all(storagePromiseList);
}

/**
 * Given a single url, request the match list
 * @param {String} url - the location of one of the match json files
 * @returns {Promise} - resolves with the match data (in object format) once found
 */
function requestList (url) {
	console.log('looking up', url);
	return request.getAsync(url, {json: true}).then(function (results) {
		var response = results[0];
		var body = results[1];
		if (response.statusCode === 200) {
			if (body instanceof Object) {
				return body;
			} else {
				throw new Error('Invalid response body', body);
			}
		} else {
			throw new Error('invalid response status code', response.statusCode);
		}
	});
}

/**
 * Given a response from riot, store the results as matches into the queue
 * @returns {Promise} - resolves when all matches have been stored
 */
function storeResults (response) {
	console.log('storing match list');
	if (!response.matches) {
		return Promise.reject(new Error('Invalid response format', response));
	}
	var matches = response.matches;
	return Promise.all(matches.map(function (match) {
		return storeMatch(match);
	}));
}

/**
 * Store an individual match
 * @param {Object} match - match in JSON format
 * @returns {Promise} - resolves once successfully stored in the queue
 */
function storeMatch(match) {
	console.log('storing match');
	return new Promise (function (resolve, reject) {
		var matchData = JSON.stringify(match);
		var store = function () {
			try {
				matchDataTasker.publish(matchData);
				resolve();
			} catch (error) {
				console.log('failed to store match', match, error, 'retrying in 1 second');
				setTimeout(store, 1000);
			}
		};
		store();
	});
}
