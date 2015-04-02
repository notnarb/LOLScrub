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

/**
 * @classdesc container for a riot api key plus the logic to determine how many
 * times it can be called
 * @param {String} keyString - riot api key string
 * @param {Integer} req10 - the number of times this key can be used per 10 seconds
 * @param {Integer} req600 - the number of times this key can be used per 600 seconds
 */
function Key (keyString, req10, req600) {
	if (!keyString || !req10 || !req600) {
		throw new Error("Missing requrired Key parameters");
	}
	this.apikey = keyString;

	
	// number of requests allowed per 10 seconds
	this.req10 = req10;

	// number of requests allowed per 10 minutes
	this.req600 = req600;

	// the maximum number of requests allowed per 10 seconds/minutes
	this.req10Max = req10;
	this.req600Max = req600;
	
	
	// the average number of seconds between each call
	this.req10Interval = 10 / req10 * 1000;  /*s->ms*/
	this.req600Interval = 600 / req600 * 1000; /*s->ms*/

	this.req10Velocity = 0;
	this.req600Velocity = 0;
	
	// Set interval to increase the number of requests allowd per 10
	setInterval(function () {
		if (this.req10 <= this.req10Max) {
			this.req10 += 1;
		}
	}.bind(this), this.req10Interval);

	// Set interval to increase the nuimber of requests allowed per 600 seconds
	setInterval(function () {
		if (this.req600 <= this.req600Max) {
			this.req600 +=1;
		}
	}, this.req600Interval);
}

/**
 * Calculate the delay for the next request (and adjust future responses to
 * account for another access) TODO: in retrospect it would make more sense for
 * a key to emit some sort of async event rather than try to predict how many
 * seconds to take for the next request
 * @return {Integer} delay - the amount of time in milliseconds to delay this api key access
 */
Key.prototype.access = function () {
	this.req10--;
	this.req600--;
	// calculate what ratio of the max each limit is at
	var req10Ratio = this.req10 / this.req10Max;
	var req600Ratio = this.req600 / this.req600Max;
	var ratio, interval;
	if (req10Ratio < req600Ratio) {
		ratio = req10Ratio;
		interval = this.req10Interval;
	} else {
		ratio = req600Ratio;
		interval = this.req600Interval;
	}
	

	if (ratio > 0.8) {
		// Over 80% of limit, set wait time to 50% of the inteval refresh time
		return interval / 2;
	} else if (ratio > 0.5) {
		// > 50%, wait time = interval time
		return interval;
	} else if (ratio > 0.2) {
		// > 20%, wait time = 3x interval time
		return interval * 3;
	} else {
		// < 20%, wait time = 10x interval time
		return interval * 10;
	}

	// TODO: when it's not 1 in the morning, come up with a better algorithm/implementaion for exponential backoff
	// This should be good enough for now.  So long as each service only has one active request out at a time, it should allow for 10 concurrent services
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

var server = http.createServer(function (req, res) {
	// pick a key
	var key = getKey();
	// Calculate the delay for accessing the key right now
	var delay = key.access();

	// add the apikey to the end of the url
	// if there is already a question mark in the url, assume that a query string has been started and use an & instead of a ?
	if (/\?/.test(req.url)) {
		req.url += '&api_key=' + key.apikey;
	} else {
		req.url += '?api_key=' + key.apikey;
	}

	console.log('request!  Delay:',delay, "New url:", req.url);

	// Make the request afte rthe specified delay
	setTimeout(function () {
		proxy.web(req, res, {target: 'https://na.api.pvp.net'});
	}, delay);
});

console.log('listening');
server.listen(8000);
