/**
 *
 */
var userInfo = require('./userInfo');
var champs = require('./champs.js');
var stats = require('./stats.js');
var champStats = require('../tmpl/champStats.hbs');
var champFilter = require('../tmpl/champStats/champFilter.hbs');
var champListTemplate = require('../tmpl/champStats/champList.hbs');

var container = null;

var previousSearch = "";

var champNameMap = null;

champs.init().then(function () {
	champNameMap = champs.getNameMap();
});

$('body').on('keyup paste', '#champStatsFilter', function (event) {
	var element = $(event.target);
	// ignore keyups and pastes into non-inputs
	if (!element.is('input')) {
		return;
	}
	var query = filterSearch(element.val());
	if (query !== previousSearch) {
		renderList(query);
		previousSearch = query;
	}
});

function render () {
	if (!container) {
		container = $(champStats({}));
		container.find('#champStatsFilter').replaceWith(champFilter({}));
		renderList();
	}
	return container;
}

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
 * Render the search results
 * @param {String} [query=""] - query to look up.  Leave blank to ignore
 */
function renderList (query) {
	var lookupList = champs.lookup(query);
	container.find('#champStatsResults').replaceWith(champListTemplate({
		champList: lookupList
	}));
}

module.exports.render = render;
