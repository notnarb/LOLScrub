/**
 * Operations pertaining to league champs
 */
var lolStatic = require('./lolStatic');
var champMap;

// name -> champ ID
var nameMap = null;

var initializationPromise = lolStatic.getChamps().then(function (foundChampMap) {
	champMap = foundChampMap;
});

module.exports.init = function () {
	return initializationPromise;
};

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
 * Get a map of lowercased names (to make searches easier) to champ IDs
 */
module.exports.getNameMap = function () {
	if (!champMap) {
		return [];
	}
	if (!nameMap) {
		nameMap = {};
		// Why am I not using lodash....
		Object.keys(champMap).forEach(function (champId) {
			if (champId && champMap[champId] && champMap[champId].name) {
				var name = champMap[champId].name.toLowerCase();
				nameMap[name] = champId;
			}
		});
	}
	return nameMap;
};


/**
 * Standardize strings to make searches easier
 */
function filterSearch (query) {
	// Ignore empty strings
	if (!query || !query.length) {
		return query;
	}
	return query.replace(/\W/,"").toLowerCase();
}

/**
 * Given a query for a champ name, return an Array of champ IDs that match that
 * name.  If query is blank, returns all champ IDs
 * @param {string} query - lookup string
 */
module.exports.lookup = function (query) {
	query = filterSearch(query);
	if (!query || !query.length) {
		return module.exports.getIdList();
	}
	
	var nameMap = module.exports.getNameMap();
	var retval = [];

	// seriously why don't I just include lodash... it'd probably take less time
	// than complaining in these comments
	Object.keys(nameMap).forEach(function (name) {
		// create a new regex each time because regex's are stateful.
		var regex = new RegExp(query, 'g'); //ignore case flag isn't needed since they're being converted to lowercase
		if (regex.test(name)) {
			retval.push(nameMap[name]);
		}
	});
	return retval;
};
