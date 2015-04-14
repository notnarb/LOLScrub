var http = require('http');
var httpProxy = require('http-proxy');
var url = require('url');
var express = require('express');
var morgan = require('morgan');

var proxy = httpProxy.createProxyServer({});

proxy.on('error', function (error, req, res) {
	console.log('Proxy encountered error', error);
	res.writeHead(500, {'Content-Type':'application/json'});
	res.end(JSON.stringify(error));
});


var app = express();

app.use(morgan('combined'));

app.get('/champlist', function (req, res) {
	console.log('champlist');
	proxy.web(req, res, {target: 'http://staticgetter:8000'});
});
app.get('/itemlist', function (req, res) {
	console.log('itemlist');
	proxy.web(req, res, {target: 'http://staticgetter:8000'});
});
app.get('/summonerlookup/**', function (req, res) {
	console.log('summonerlookup');
	proxy.web(req, res, {target: 'http://summonerlookup:8000'});
});
app.get('/matchlookup/**', function (req, res) {
	console.log('matchlookup');
	proxy.web(req, res, {target: 'http://summonerlookup:8000'});
});
app.get('/SoloKillPercentageOdds/**', function (req, res) {
	console.log('solo kill percentage odds');
	proxy.web(req, res, {target: 'http://webserver:8000'});
});

app.get('/BestItemPerMatchup', function (req, res) {
	console.log('Best items per matchup');
	proxy.web(req, res, {target: 'http://webserver:8000'});
});

app.get('/ExpectedItems', function (req, res) {
	console.log('Expected items');
	proxy.web(req, res, {target: 'http://webserver:8000'});
});

app.get('/GetKsOdds', function (req, res) {
	console.log('KS odds');
	proxy.web(req, res, {target: 'http://webserver:8000'});
});


app.get('/', function (req, res) {
	console.log('/');
	res.writeHead(200, {'Content-Type': 'application/json'});
	res.end(rootResponse());
});


/**
 * Response to requests to '/'
 * @returns {String} response - the string representation of what to reply with
 */
function rootResponse () {
	// TODO: diagnostics could go here 
	return JSON.stringify({
		message: 'hello'
	});
}

var server = http.createServer(app);

server.listen(8000);
