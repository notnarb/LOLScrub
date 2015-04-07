var util = require('util');
var Promise = require('bluebird');
var http = require('http');
var express = require('express');
var morgan = require('morgan');
var redis = require('redis');
var connectTimeout = require('connect-timeout');

Promise.promisifyAll(redis);

var redisClient = redis.createClient(6379, 'redis', {});

redisClient.on('error', function (error) {
	process.stderr.write('redis error, ' + error.message);
});

var HTTP_PORT = 8000;

var backendHost = process.env.BACKEND_HOST;
var backendPort = process.env.BACKEND_PORT;

if (!backendHost || !backendPort) {
	process.stderr.write("[Error]: Missing environment variable BACKEND_HOST and/or BACKEND_PORT: see readme\n");
	process.exit(1);
}

// default for requests
var request = require('request').defaults({
	//Note: using http not https.  https without a valid cert would still be
	//vulnerable to mitm and NO INFO PASSED TO BACKEND SHOULD BE CONSIDERED
	//SECURE.  If this changes in the future I will set up a trusted cert
	baseUrl: "http://" + backendHost + ":" + backendPort,
	json: true
});

Promise.promisifyAll(request);

var app = express();

// Probably uneccessary to duplicate what's going to be found in the nginx log
// but w/e, this is mostly to help debugging
app.use(morgan('combined'));

// Timeout requests after 10 seconds to avoid nginx timeouts
app.use(connectTimeout('10s'));

app.use(ErrorHandler);


/**
 * Checks the backend for the summoner ID
 * @param {String} summonerName
 * @returns {Promise} resolves with summoner ID
 * @throws UnknownServerError if no ID or error is found
 * @throws UnknownSummonerError if there appears to be an invalid summoner name
 */ 
function lookupSummonerId (summonerName) {
	return request.getAsync('/getid/' + summonerName).then(function (results) {
		var response = results[0];
		var responseBody = results[1];
		if (responseBody.id) {
			return responseBody.id;
		} else if (responseBody.error) {
			throw new UnknownSummonerError(summonerName);
		} else {
			throw new UnknownServerError();
		}
	});
}

/**
 * Obtains the summoner ID.  First checks cache, then checks backend
 * @param {String} summonerName
 * @returns {Promise} - resolves with summoner Id
 */
function getSummonerId (summonerName) {
	return redisClient.hgetAsync("nameMap", summonerName)
		.then(function (result) {
			if (result) {
				console.log('redis hit', summonerName);
				return parseInt(result, 10);
			} else {
				console.log('redis miss', summonerName);
				return lookupSummonerId(summonerName).then(function (id) {
					// store id for future use
					redisClient.hset("nameMap", summonerName, id);
					return id;
				});
			}
		});
}

app.get('/getmyinfo/:summonerName', function (req, res, next) {
	var summonerName = req.params.summonerName;
	getSummonerId(summonerName).then(function (id) {
		var response = {
			id: id
		};
		res.writeHead(200, {'Content-Type': 'application/json'});
		res.end(JSON.stringify(response));
	}).catch(function (error) {
		ErrorHandler(error, req, res, next);
	});;
});

/**
 * Handler for requests which fall through all other requests
 */
app.use(function baseHandler (req, res) {
	var response = {"hello":"how are you?"};
	res.writeHead(200, {'Content-Type': 'application/json'});
	res.end(JSON.stringify(response));		

});


function ErrorHandler (err, req, res, next) {
	res.writeHead(500, {'Content-Type': 'application/json'});
	res.end(JSON.stringify({
		error: err
	}));
}

http.createServer(app).listen(HTTP_PORT);

console.log('listening on port', HTTP_PORT);



// TODO: these should probably get moved to their own module

/**
 * @classdesc An error that I haven't accounted for
 * @param {Error} [error] - thrown error that rose this error
 */
function UnknownServerError (error) {
	Error.call(this);
	this.name = 'UnknownServerError';
	this.message = "Unhandled server error";
	console.log('UnknownServerError', error);

	this.code = 500;
}

util.inherits(UnknownServerError, Error);

/**
 * @classdesc error to be thrown when a summoner name appears to be invalid
 */
function UnknownSummonerError (summonerName) {
	Error.call(this);
	this.name = 'UnknownSummonerError';
	this.message = "There does not appear to be a summoner with name: " + summonerName;

	this.code = 404;
}
