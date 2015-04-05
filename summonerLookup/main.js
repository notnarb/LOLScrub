var util = require('util');
var Promise = require('bluebird');
var request = require('request');
var mongodb = require('mongodb');
var http = require('http');
var url = require('url');
// url escape string
var escapeString = require('querystring').escape;


Promise.promisifyAll(request);
Promise.promisifyAll(mongodb.MongoClient);
Promise.promisifyAll(mongodb.Collection.prototype);

// Port to listen for requests on
var HTTP_PORT = 8000;

var db = null;

var stats = {
	variableHits: 0,			//number of times a name was found in the local name map
	databaseHits: 0,			//number of times a name was found in the database
	apiHits: 0					//number of times a name needed to hit the the riot api
};

// name => id.  Stored in memory to skip hitting the database
var nameMap = {
};


function InvalidRiotResponseError (name) {
	Error.call(this);
	this.name = 'InvalidRiotResponseError';
	this.message = "Invalid response from Riot api for summoner name: " + name;
};
util.inherits(InvalidRiotResponseError, Error);

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
 * Sanatize an incoming summoner name to what riot expects by its bySummonerName query
 * @param {String} name to escape
 */
function sanitizeName (name) {
	if (!((typeof name) === "string")) {
		throw "Name must be of type String";
	}
	// Ignore all spaces and lowercase the name.  Finally, url escape the string and return the value of that
	return escapeString(name.replace(/ /g, '').toLowerCase());
	
	
}

/**
 * Looks up the id for a parsed name TODO: logic for queueing requests could be incorperated here 
 */
function lookupName (name) {
	var requestUrl = [
		'http://riotambassador:9000/api/lol/na/v1.4/summoner/by-name/',
		name
	].join('');
	return request.getAsync(requestUrl, {json: true}).then(function (args) {
		var response = args[0];
		var body = args[1];
		if (body.status && body.status.status_code) {
			riotErrorHandler(body.status.status_code);
		}
		if (!body || !body[name] || !body[name].id) {
			throw new InvalidRiotResponseError(name);
		}
		return body[name].id;
	}).catch(RiotApiError, function (error) {
		if (error.code === 429) {
			console.log('Over api limit, retrying in 2 seconds');
			return Promise.delay(2000)
				.then(lookupName.bind(null, name));
			// Note: if for some reason error.code always returned 429, the call
			// stack on this is going to get ridiculously huge
		}
		throw error;
	});
}

/**
 * Gets ID for a given summoner name, querying the database if necessary
 * @param {String} summonerName - name of the summoner to look up
 * @returns {Promise} resolves with id once found
 */
function getSummonerId(summonerName) {
	if (!db) {
		return Promise.reject("Not connected to database");
	}
	// santize the name
	var name;
	try {
		name = sanitizeName(summonerName);
	} catch (error) {
		return Promise.reject(error);
	}
	// check if name is in local cache
	if (nameMap[name]) {
		console.log('variable hit', name);
		stats.variableHits += 1;
		return Promise.resolve(nameMap[name]);
	}
	// check if name is in local db
	return db.collection('summonerInfo').findOneAsync({name:name})
		.then(function (result) {
			// name is stored
			if (result && result.id) {
				console.log('database hit', name);
				stats.databaseHits += 1;
				return result.id;
			}
			// query riot for name
			return lookupName(name).then(function (id) {
				if (!id || ((typeof id) !== "number")) {
					throw "Invalid id response from lookupName";
				}
				console.log('api hit', name);
				stats.apiHits += 1;
				nameMap[name] = id;
				return db.collection('summonerInfo').insertAsync({name: name, id: id}).then(function () {
					return id;
				});
			});
		});
}

/**
 * Given an error and an http response object, respond to the request with a proper error message
 * @param {http.response} res - standard response object for an http server
 * @param {Error} error - json serializable error
 */
function errorResponse(res, error) {
	res.writeHead(500, {'Content-Type': 'application/json'});
	res.end(JSON.stringify({error: JSON.stringify(error)}));
};

var client = mongodb.MongoClient.connectAsync('mongodb://mongo:27017/urfday').then(function (foundDb) {
	db = foundDb;
	http.createServer(function (req, res) {
		var parsedUrl = url.parse(req.url).path;
		var urlPieces = parsedUrl.split('/');
		if (urlPieces.length <= 1) { // '/' request
			res.writeHead(200, {'Content-Type': 'application/json'});
			res.end(JSON.stringify(stats));
		} else if (urlPieces[1] === 'getid') {
			getSummonerId(urlPieces[2])
				.then(function (validId) {
					res.writeHead(200, {'Content-Type': 'application/json'});
					res.end(JSON.stringify({id: validId}));
				})
				.catch(errorResponse.bind(null, res));
			
		} else if (urlPieces[1] === 'currentmatch') {
			errorResponse(res, 'Current match not yet implemented');
		} else {
			errorResponse(res, 'Unknown request: ' + urlPieces[1]);
		}
		
	}).listen(HTTP_PORT);
	console.log('connected to database, listening for requests');
});
