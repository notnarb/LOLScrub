/**
 * Getter for various stats
 */


/**
 * Given a matchup between two champions and a timestamp, get the odds of winning a 1v1
 */
module.exports.getOddsByTimestamp = function (yourChampId, theirChampId, timestamp) {
	// lol, TODO:
	return Math.random() * 100;
};


/**
 * Returns an array containing the odds at each minute mark for a champ
 */
module.exports.getOddsArray = function (yourChampId, theirChampId) {
	// lol, TODO:
	var retval = [];
	while (retval.length < 50) {
		retval.push(Math.round(Math.random() * 100));
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
