/**
 * Module for obtaining and storing LoL static data from app server
 */

var Promise = require('bluebird');

var helpers = require('./helpers');

var itemMap = null;
var champMap = null;

/**
 * Keep trying to look up the static data on a failure.  Note: the stack for
 * this will grow infinitely if the champ list isn't available... 
 */
var lookupPromise = lookupStatic().catch(function (error) {
	console.log('faled to get static data', error, 'retrying in 1 second');
	return Promise.delay(1000).then(lookupStatic);
});

/**
 * Query the app server for the static data.
 */
function lookupStatic () {
	return helpers.get('/app/getstatic').then(function (response) {
		itemMap = response.itemMap;
		champMap = response.champMap;
	});
}

/**
 * Get the list of champs
 * @returns {Promise} - resolves with champ map once data has obtained
 */
module.exports.getChamps = function () {
	return lookupPromise.then(function () {
		return champMap;
	});
};

/**
 * Get the list of items
 * @returns {Promise} - resolves with item map once data has obtained
 */
module.exports.getItems = function () {
	return lookupPromise.then(function () {
		return itemMap;
	});
};


/**
 * Resolves once the static data has been obtained
 * @returns {Promise}
 */
module.exports.init = function () {
	return lookupPromise;
};
