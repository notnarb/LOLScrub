/**
 * Operations pertaining to league champs
 */
var lolStatic = require('./lolStatic');
var champMap;

lolStatic.getChamps().then(function (foundChampMap) {
	champMap = foundChampMap;
});

/**
 * Get a single champion
 * @param id - id of the champ to look up
 * @REturns {Object} - champdata
 */
module.exports.get = function (id) {
	return champMap[id];
};

/**
 * @returns {Object} - map of ID -> champ data
 */
module.exports.getAll = function () {
	return champMap;
};

module.exports.getIdList = function () {
	return Object.keys(champMap);
};

/**
 * @returns {Promise} resolves once the champ data has been obtained
 */ 
module.exports.init = lolStatic.init;
