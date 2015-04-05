var http = require('http');
var httpProxy = require('http-proxy');

// expected format: json array of strings
var secretKeyList = require('./secretKeyList.json');

if (!(secretKeyList instanceof Array)) {
	throw "secretKeyList.json must be an array";
}

var proxy = httpProxy.createProxyServer({});

var REQ600MAX = 500;
var REQ10MAX = 10;
var keyList = [];

// Number of times the low priority queue is allowed to be concurrently skipped in favor of the high priority queue
var SKIP_LOW_THRESHOLD = 5;

// Differnt ports to listen in on.  Note: outside the context of containers,
// it's pretty silly to hardcode these values
var LOW_PRIORITY_PORT = 8000;
var HIGH_PRIORITY_PORT = 9000;
var DIAGNOSTIC_PORT = 8001;

/**
 * @classdesc container for a riot api key plus the logic to determine how many
 * times it can be called
 * @param {String} keyString - riot api key string
 * @param {Integer} req10 - the number of times this key can be used per 10 seconds
 * @param {Integer} req600 - the number of times this key can be used per 600 seconds
 */
function Key (keyString, req10, req600) {
	if (!keyString || !req10 || !req600) {
		throw new Error("Missing required Key parameters");
	}
	this.apikey = keyString;

	// the average number of ms allowed for each request type
	var req10Interval = 10 / req10 * 1000;  /*s->ms*/
	var req600Interval = 600 / req600 * 1000; /*s->ms*/

	// Set the interval for this key to be whatever the slower average is
	this.interval = Math.max(req10Interval, req600Interval);

	// add 20ms as a fudge value to the interval.  There currently isn't a
	// response listener so add 20ms to the calculated interval time. (don't
	// know if this wll increase the reliability of not hitting the limit or
	// not, operating on pure assumption)
	this.interval += 20;
	
	this.lowPriorityQueue = [];
	this.highPriorityQueue = [];

	// Number of concurrent times the low priority queue has been skipped in favor of the high priority queue
	this.numLowSkipped = 0;

	// assume that a request has been made as recently as now
	this.lastRequestTime = Date.now();

	// Start looping through the queue
	this.waitForNextTick();
}

/**
 * Calculate how long until the next request in milliseconds.  TODO: this could
 * interact with too many api requests events (e.g. if a too many request reply
 * came from the api, return that value instead)
 * @returns {Integer} time im MS until next request.  Can be negative (next request is overdue)
 */
Key.prototype.getNextRequestInterval = function () {
	return this.interval - (Date.now() - this.lastRequestTime);
};

/**
 * Calls consumeNextQueueItem after getNextRequestInterval() ms.  Calls
 * waitForNextTick recursively via timeout once the request has been sent
 */
Key.prototype.waitForNextTick = function () {
	var nextInterval = this.getNextRequestInterval();
	// wait a minimum of 1 ms
	if (nextInterval < 1) {
		nextInterval = 1;
	}
	setTimeout(function () {
		this.consumeNextQueueItem();
		this.lastRequestTime = Date.now();
		this.waitForNextTick();
	}.bind(this), nextInterval);
};

/**
 * Execute the next item in the queue FIFO.  Prioritize high priority queue
 * items over low priority queue itmes, but if it has been SKIP_LOW_THRESHOLD
 * times since the lowPriorityQueue has been accessed, instead run an item from
 * it.
 */
Key.prototype.consumeNextQueueItem = function () {
	if (!this.highPriorityQueue.length && !this.lowPriorityQueue.length) {
		console.log('Queue empty, wasted tick', Date.now());
		return;
	}
	var action;
	if (this.highPriorityQueue.length && this.numLowSkipped < SKIP_LOW_THRESHOLD) {
		action = this.highPriorityQueue.shift();
		if (this.lowPriorityQueue.length) {
			this.numLowSkipped += 1;
		}
	} else {
		this.numLowSkipped = 0;
		action = this.lowPriorityQueue.shift();
	}
	action();
};

/**
 * Return object containing stats about this key.  Omits private key
 * @returns {Object}
 */
Key.prototype.getStats = function () {
	return {
		interval: this.interval,
		highPriorityQueue: this.highPriorityQueue.length,
		lowPriorityQueue: this.lowPriorityQueue.length
	};
};

/**
 * Enqueue an action related to this key
 * @param {Function} action - action to perform.  Action is called with api key (String) as first parameter
 * @param {Boolean} [isHighPriority=false] - if true, queue this action as a higher priority than other actions
 */
Key.prototype.queue = function (action, isHighPriority) {
	if (!action || !((typeof action) === 'function')) {
		throw "can't queue action if action is not a function";
	}
	var callbackToExecute = action.bind(null, this.apikey);
	if (isHighPriority) {
		this.highPriorityQueue.push(callbackToExecute);
	} else {
		this.lowPriorityQueue.push(callbackToExecute);
	}
};

secretKeyList.forEach(function (apikey) {
	keyList.push(new Key(apikey, REQ10MAX, REQ600MAX));
});


// index of the last key accessed
var lastKeyUsed = 0;

/**
 * Choose a key from the keylist.  Current strategy is round robin but could be changed in the future
 */
function getKey () {
	lastKeyUsed += 1;
	if (lastKeyUsed >= keyList.length) {
		lastKeyUsed = 0;
	}
	return keyList[lastKeyUsed];
}

proxy.on('error', function (error) {
	console.log('Proxy encountered error', error);
});

/**
 * Given an api key, send a request to the riot API
 * @param {String} apiKey - apiKey as provided to the callback argument to Key#queue()
 * @param {HTTP.req} - http request object
 * @param {HTTP.res} - http response object
 */
function sendRequest (apiKey, req, res) {
	// add the apikey to the end of the url
	// if there is already a question mark in the url, assume that a query string has been started and use an & instead of a ?
	if (/\?/.test(req.url)) {
		req.url += '&api_key=' + apiKey;
	} else {
		req.url += '?api_key=' + apiKey;
	}
	proxy.web(req, res, {target: 'https://na.api.pvp.net'});
}

function genericServerErrorHandler (error) {
	console.log('Server recieved error', error);
};

// Low priority queue
var lowPriorityServer = http.createServer(function (req, res) {
	req.on('error', genericServerErrorHandler.bind(null));
	res.on('error', genericServerErrorHandler.bind(null));
	// pick a key
	var key = getKey();

	key.queue(function (apiKey) {
		sendRequest(apiKey, req, res);
	}, false);
 
});
lowPriorityServer.listen(LOW_PRIORITY_PORT);

// High priority queue
var highPriorityServer = http.createServer(function (req, res) {
	req.on('error', genericServerErrorHandler.bind(null));
	res.on('error', genericServerErrorHandler.bind(null));
	// pick a key
	var key = getKey();
	
	key.queue(function (apiKey) {
		sendRequest(apiKey, req, res);
	}, true); // <-- difference from low priority queue
});
highPriorityServer.listen(HIGH_PRIORITY_PORT);

console.log('listening');


/**
 * Open server to provide simple stats on keys
 */ 
var diagnosticServer = http.createServer(function (req, res) {
	var response = JSON.stringify(keyList.map(function (key) {
		return key.getStats();
	}));
	res.writeHead(200, {'Content-Type': 'application/json'});
	res.end(response);
});

console.log('listening on diagnostic server');
diagnosticServer.listen(DIAGNOSTIC_PORT);
