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
app.get('/SoloKillOddsAgainstLead', function (req, res) {
	console.log('Solo kill odds vs specific enemy with Gold lead info over time');
	proxy.web(req, res, {target: 'http://webserver:8000'});
});
app.get('/SoloKillOddsAgainstOverall', function (req, res) {
	console.log('Overall Solo Kill odds vs specific enemy over time');
	proxy.web(req, res, {target: 'http://webserver:8000'});
});
app.get('/Multikills', function (req, res) {
	console.log('Rate per game of multikills (Data * 10000) ');
	proxy.web(req, res, {target: 'http://webserver:8000'});
});

app.get('/SnowballValue/**', function (req, res) {
	console.log('Rating of champ Postitive snowball impact');
	proxy.web(req, res, {target: 'http://webserver:8000'});
});

app.get('/OverallKSRate', function (req, res) {
	console.log('Single number representing Champ KS rate');
	proxy.web(req, res, {target: 'http://webserver:8000'});
});

app.get('/SoloKillOddsOverall', function (req, res) {
	console.log('Champions overall chance to win 1v1 over time');
	proxy.web(req, res, {target: 'http://webserver:8000'});
});

app.get('/KSOddsOverall', function (req, res) {
	console.log('Champions KS rate over time');
	proxy.web(req, res, {target: 'http://webserver:8000'});
});

app.get('/OverallSoloKillRate', function (req, res) {
	console.log('Single number representing champ 1v1 rate in all situations');
	proxy.web(req, res, {target: 'http://webserver:8000'});
});

app.get('/BestItemsAgainst', function (req, res) {
	console.log('Best items per matchup over time');
	proxy.web(req, res, {target: 'http://webserver:8000'});
});

app.get('/ExpectedItems', function (req, res) {
	console.log('Expected items per champ over time');
	proxy.web(req, res, {target: 'http://webserver:8000'});
});

app.get('/KsOddsAgainst', function (req, res) {
	console.log('Ks odds of each Champ with ally over time');
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
