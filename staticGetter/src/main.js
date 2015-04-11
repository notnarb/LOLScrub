var util = require('util');
var Promise = require('bluebird');
var request = require('request');
var mongodb = require('mongodb');
var http = require('http');
var url = require('url');
var express = require('express');
var morgan = require('morgan');

Promise.promisifyAll(request);
Promise.promisifyAll(mongodb);
Promise.promisifyAll(mongodb.MongoClient);
Promise.promisifyAll(mongodb.Collection.prototype);

// Port to listen for requests on
var HTTP_PORT = 8000;

var db = null;

var app = express();

var champDbReady = false;

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


app.use(morgan('combined'));

app.get('/champlist', function (req, res, next) {
	if (!champDbReady) {
		// service unavailable
		res.writeHead(503, {'Content-Type': 'application/json'});
		res.end(JSON.stringify({error: 'Champ database not loaded'}));
		return;
	}
	db.collection('lolStaticData').find({'dataType':'champion'}).toArrayAsync().then(function (docs) {
		var retval = {};
		docs.forEach(function (champData) {
			delete champData._id; //frontend doesn't care about mongo ID
			retval[champData.id] = champData;
		});
		res.writeHead(200, {'Content-Type': 'application/json'});
		res.end(JSON.stringify(retval));
	}).catch(function (error) {
		res.writeHead(500, {'Content-Type': 'application/json'});
		res.end(JSON.stringify({error: error}));
	});
});


/**
 * Given a json blob from the api, create a list of champs and insert them all
 * into the database
 */
function saveChampData (jsonBlob) {
	var version = jsonBlob.version;
	console.log('saving champ data for version ', version);
	var promiseList = [];
	Object.keys(jsonBlob.data).forEach(function (champName) {
		var champData = jsonBlob.data[champName];
		champData.dataType = 'champion';
		champData.spriteUrl = [
			"ddragon.leagueoflegends.com/cdn/",
			version,
			"/img/champion/",
			champData.image.full //note: the 'full' image name is meant for
								 //their full splash art, it just happens to
								 //coincide with the sprite name too
		].join("");
		function insert () {
			return db.collection('lolStaticData').insertAsync(champData);
		}
		// Attempt to insert the champ data.  If it fails, retry once
		promiseList.push(insert().catch(function (error) {
			return insert();
		}));
	});
	// resolve once all of the inserts have completed
	return Promise.all(promiseList);
}

/**
 * Queries the riot api for the blob of json data containing champ info
 * @returns {Promise} - resolves with full response body
 */
function getChampData () {
	console.log('looking up champ data');
	var requestUrl = 'http://riotambassador:8000/api/lol/static-data/na/v1.2/champion?version=5.7.2&champData=altimages,image';
	return request.getAsync(requestUrl, {json:true}).then(function (args) {
		var response = args[0];
		var body = args[1];
		if (body.status && body.status.status_code) {
			riotErrorHandler(body.status.status_code);
		}
		return body;
	});
}



/**
 * Checks to see that the mongodb collection is intact.  If the collection is
 * missing, makes the necessary request to fill it.  TODO: this could be
 * modified to check to see if there is a newer set of data available rather
 * than hardcode the version.
 * @returns {Promise} - resolves once the collection has been verfied
 */
function checkChampCollection () {
	return db.collection('lolStaticData').find({'dataType':'champion'}).countAsync().then(function (size) {
		if (size < 124) {
			if (size > 0) {
				// champ data didn't get saved properly, clear database
				db.collection('lolStaticData').findAndRemoveAsync({'dataType':'champion'})
					.then(getChampData)
					.then(saveChampData);
			} else {
				return getChampData().then(saveChampData);
			}
		}
		// num champs is valid, continue
		return true;
	});
}


function init () {
	var client = mongodb.MongoClient.connectAsync('mongodb://mongo:27017/urfday').catch(function (error) {
		console.log('failed to connect to database, retrying in 3 seconds');
		setTimeout(function () {
			init();
		}, 3000);
	}).then(function (foundDb) {
		db = foundDb;
		http.createServer(app).listen(HTTP_PORT);
		console.log('Listening on port', HTTP_PORT);
		
		checkChampCollection().then(function () {
			console.log('champ collection up to date');
			champDbReady = true;
		}).catch(function (error) {
			console.log('failed to get champion data, exiting', error, error.stack);
			process.exit(2);
						
		});

	});
}

init();
