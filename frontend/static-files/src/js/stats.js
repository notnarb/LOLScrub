/**
 * Getter for various stats
 */
var Promise = require('bluebird');
var helpers = require('./helpers');

var soloKillOddsMap = null;
var ksOddsMap = null;

// Array of promises that once all are resolved, should provide enough data for graphing
var oddsLoaded = [];

oddsLoaded.push(helpers.get('/app/solokillodds').then(function (response) {
	soloKillOddsMap = response;
}).catch(function (error) {
	alert('Failed to get solo kill odds data');
	console.log('Failed to get solo kill odds data', error);
}));

oddsLoaded.push(helpers.get('/app/ksoddsagainst').then(function (response) {
	ksOddsMap = response;
}).catch(function (error) {
	alert('Failed to get killsteal odds data from server');
	console.log('Failed to get kill steal odds', error);
}));

/**
 * Promise representation of the odds having been loaded
 */
module.exports.loadOdds = function () {
	return Promise.all(oddsLoaded);
};

/**
 * Given a matchup between two champions and a timestamp, get the odds of winning a 1v1
 * @param yourChampId
 * @param theirChampId
 * @param timestamp - Minute mark
 */
module.exports.getOddsByTimestamp = function (yourChampId, theirChampId, timestamp) {
	var key = [yourChampId, theirChampId].join("-");
	return soloKillOddsMap[key][timestamp];
};



/**
 * Returns an array containing the odds at each minute mark for a champ
 */
module.exports.getOddsArray = function (yourChampId, theirChampId) {
	var key = [yourChampId, theirChampId].join("-");
	var retval = [];
	for (var i = 0; i < 50; i++) {
		retval.push(soloKillOddsMap[key][i]);
	}
	return retval;

};



/**
 * Given a matchup between two champions and a timestamp, get the odds of them stealing your WELL DESERVED kills
 */
module.exports.getKsOddsByTimestamp = function (yourChampId, theirChampId, timestamp) {
	var key = [yourChampId, theirChampId].join("-");
	return ksOddsMap[key][timestamp];
};


/**
 * Returns an array containing the  killsteal odds at each minute mark for a champ
 */
module.exports.getKsOddsArray = function (yourChampId, theirChampId) {
	var key = [yourChampId, theirChampId].join("-");
	var retval = [];
	for (var i = 0; i < 50; i++) {
		retval.push(ksOddsMap[key][i]);
	}
	return retval;
};

window.getKsOddsArray = module.exports.getKsOddsArray;
