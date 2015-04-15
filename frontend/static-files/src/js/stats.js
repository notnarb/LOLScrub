/**
 * Getter for various stats
 */
var helpers = require('./helpers');

var soloKillOddsMap = null;

var oddsLoaded = helpers.get('/app/solokillodds').then(function (response) {
	soloKillOddsMap = response;
}).catch(function (error) {
	alert('Failed to get solo kill odds data');
	console.log('Failed to get solo kill odds data', error);
});

/**
 * Promise representation of the odds having been loaded
 */
module.exports.loadOdds = function () {
	return oddsLoaded;
};

/**
 * Given a matchup between two champions and a timestamp, get the odds of winning a 1v1
 * @param yourChampId
 * @param theirChampId
 * @param timestamp - Minute mark
 */
module.exports.getOddsByTimestamp = function (yourChampId, theirChampId, timestamp) {
	// lol, TODO:
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
	// lol, TODO:
	return Math.random() * 100;
};


/**
 * Returns an array containing the  killsteal odds at each minute mark for a champ
 */
module.exports.getKsOddsArray = function (yourChampId, theirChampId) {
	// lol, TODO:
	var retval = [];
	while (retval.length < 50) {
		retval.push(Math.round(Math.random() * 100));
	}
	return retval;
};
