var http = require('http');
var httpProxy = require('http-proxy');
var url = require('url');

var proxy = httpProxy.createProxyServer({});

proxy.on('error', function (error, req, res) {
	console.log('Proxy encountered error', error);
	res.writeHead(500, {'Content-Type':'application/json'});
	res.end(JSON.stringify(error));
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

var server = http.createServer(function (req, res) {
	var parsedUrl = url.parse(req.url).path;
	var urlPieces = parsedUrl.split('/');
	console.log('request!', parsedUrl);	
	if (!parsedUrl || urlPieces.length <= 1) {
		console.log('/');
		res.writeHead(200, {'Content-Type': 'application/json'});
		res.end(rootResponse());
		return;
	} else {
		// TODO: this should bind to an actual location other than 'not "/"'
		console.log('userLookup');
		proxy.web(req, res, {target: 'http://summonerlookup:8000'});
	}
});

server.listen(8000);
