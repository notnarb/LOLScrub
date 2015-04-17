/**
 *
 */
var userInfo = require('./userInfo');
var champs = require('./champs.js');
var stats = require('./stats.js');
var charts = require('./charts');

var champStats = require('../tmpl/champStats.hbs');
var champFilter = require('../tmpl/champStats/champFilter.hbs');
var champListTemplate = require('../tmpl/champStats/champList.hbs');
var champPopupTemplate = require('../tmpl/champPopup.hbs');

var onevoneTemplate = require('../tmpl/champPopup/onevone.hbs');
var ksTemplate = require('../tmpl/champPopup/ks.hbs');
var statsTemplate = require('../tmpl/champPopup/stats.hbs');

var container = null;
var previousSearch = "";

// Id of the currently open champ popup
var currentChampId = null;


$('body').on('click', '#champStats,.champPopup', function (event) {
	var target = $(event.target);

	var actionTarget = target.closest('[data-action]');

	// If you click outside of an action or you click a disabled action, don't do anything
	if (!actionTarget.length || actionTarget.hasClass('disabled')) {
		return;
	}
	var data = actionTarget.data();

	switch (data.action) {
	case 'profileCard':
		currentChampId = data.champId;
		$.magnificPopup.open({
			items: {
				src: champPopupTemplate({
					champId: currentChampId
				})
			},
			alignTop: true,
			showCloseBtn: false
		});
		renderStatsTab();
		break;
	case 'statsTab':
		renderStatsTab();
		break;
	case '1v1Tab':
		render1v1Tab();
		break;
	case 'ksTab':
		renderKsTab();
		break;
	case 'closePopup':
		$.magnificPopup.close();
		break;
	default:
		console.log('unknown action', data.action);
	}
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

/**
 * Style a tab to have the 'active' styling
 * @param {String} tab - one of 'stats', '1v1', and 'ks'
 */
function setActiveTab (tab) {
	if (['stats', '1v1', 'ks'].indexOf(tab) === -1) {
		throw "Invalid tab " + tab;
	}
	var tabs = $('.champPopup').find('.tabs');

	tabs.find('.active').removeClass('active');
	switch (tab) {
	case 'stats':
		tabs.find('[data-action="statsTab"]').addClass("active");
		break;
	case '1v1':
		tabs.find('[data-action="1v1Tab"]').addClass("active");
		break;
	case 'ks':
		tabs.find('[data-action="ksTab"]').addClass("active");
		break;
	default:
		console.log('unknown tab', tab);
	}
}
/**
 * Gets the jquery content element of the popup
 * @returns {jQuery} - the container to replaceWith content
 */
function getPopupContentArea () {
	return $("#champPopupContent");
}

function renderStatsTab () {
	setActiveTab('stats');
	var contentArea = getPopupContentArea();
	var newContentArea = $(statsTemplate({}));
	contentArea.replaceWith(newContentArea);
	stats.getChampStats(currentChampId).then(function (stats) {
		var overallSoloKillRatingCommentary = "GARBAGE";
		if (stats.overallSoloKillRating > 50) {
			overallSoloKillRatingCommentary = "Pssshh";
		}
		if (stats.overallSoloKillRating > 63) {
			overallSoloKillRatingCommentary = "YEEAA BUDDY";
		}
		var newNewContentArea = $(statsTemplate({
			doubleKills: (stats.DoubleRate / 100),
			tripleKills: (stats.TripleRate / 100),
			quadraKills: (stats.QuadraRate / 100),
			pentaKills: (stats.PentaRate / 100),
			overallSoloKillRating: stats.overallSoloKillRating + "%",
			overallSoloKillRatingCommentary: overallSoloKillRatingCommentary
		}));
		newContentArea.replaceWith(newNewContentArea);
	});
}
// TODO: figure out a standardized way to refer to this
function render1v1Tab () {
	setActiveTab('1v1');
	var contentArea = getPopupContentArea();
	var newContentArea = $(onevoneTemplate({
		champId: currentChampId,
		champList: champs.getIdList().map(function (id) {
			return {
				champId: id
			};
		})
	}));
	contentArea.replaceWith(newContentArea);
	charts.fillInCharts(newContentArea);
}


function renderKsTab () {
	setActiveTab('ks');
	var contentArea = getPopupContentArea();
	var newContentArea = $(ksTemplate({
		champId: currentChampId,
		champList: champs.getIdList().map(function (id) {
			return {
				champId: id
			};
		})
	}));
	contentArea.replaceWith(newContentArea);
	charts.fillInCharts(newContentArea);
}

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
