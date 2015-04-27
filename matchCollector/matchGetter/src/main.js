var morgan = require('morgan');
var http = require('http');
var rabbitWorker = require('rabbit-worker');

var RABBITSERVER = 'matchcollectorqueue';
var routingKey = 'new-match-id';

var currentPublishSocket = null;

var app = require('express')();

var PORT = 8000;

var tasker = new rabbitWorker.Tasker(RABBITSERVER, routingKey);


// Create the http server to listen to match submissions
app.use(morgan('combined'));
app.use(function (err, req, res, next) {
	console.log('express error?', err);
	res.writeHead(500);
	res.end(JSON.stringify('unknown error'));
});

// expect requests like GET /newmatches/100,200,300,145 
app.get('/newmatches/:matchList', function (req, res) {
	var matchList = req.params.matchList;
	var matchArray = matchList.split(",");
	try {
		matchArray.forEach(function (match) {
			tasker.publish(match);
		});
	} catch (error) {
		res.writeHead(503);
		console.warn('failed to write to queue', error);
		res.end(JSON.stringify({error: 'failed to write to queue'}));
		return;
	}
	res.writeHead(200);
	res.end(JSON.stringify({result: 'success'}));
});

http.createServer(app).listen(PORT);
console.log('server initialized on port', PORT);
