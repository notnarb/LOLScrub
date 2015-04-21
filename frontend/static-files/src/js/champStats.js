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
		openProfileCard(data.champId);
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
	case 'sortPentas':
		renderPentaKillSorted();
		break;
	case 'sortName':
		renderNameSorted();
		break;
	case 'sort1v1':
		render1v1Sorted();
		break;
	default:
		console.log('unknown action', data.action);
	}
});

/**
 * Opens the profile card for the specified champion
 */
function openProfileCard (champId) {
	if (!champId) {
		throw "Missing champ id";
	}
	currentChampId = champId;
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

}
module.exports.openProfileCard = openProfileCard;

$('body').on('keyup paste', '#champStatsFilter', function (event) {
	var element = $(event.target);
	// ignore keyups and pastes into non-inputs
	if (!element.is('input')) {
		return;
	}
	var query = filterSearch(element.val());
	if (query !== previousSearch) {
		renderSearched(query);
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
		var soloOdds = [];
		var ksOdds = [];
		for (var i = 1; i < 32; i++) {
			soloOdds.push(stats.totalVsSolo[i]);
			ksOdds.push(stats.ksOddsTotal[i]);
		}
		charts.fillInCustom($('[data-chart-ks-odds-average]'), ksOdds,{color: [156,39,176]}); //purple500
		charts.fillInCustom($('[data-chart-vs-odds-average]'), soloOdds,{color: [63,81,181]}); //indigo500
		// cute but leaving it out for now
		// newNewContentArea.find('#ksRolePicker').on('change', function (){
		// 	var role = $(this).val();
		// 	if (role === "team") {
		// 		newNewContentArea.find('.ksOddsOverTime .title').html("% chance to steal my kills OMG");
		// 	} else {
		// 		newNewContentArea.find('.ksOddsOverTime .title').html("Chance to secure a well earned kill");
		// 	}
		// });
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
		renderSearched();
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
 * Renders the champ list with the array of champ Id's specified
 * @param {Array(ChampId)} champList - sorted list of champs to render
 */
function renderList (champList) {
	container.find('#champStatsResults').replaceWith(champListTemplate({
		champList: champList
	}));
}

/**
 * Render the search results
 * @param {String} [query=""] - query to look up.  Leave blank to ignore
 */
function renderSearched (query) {
	var lookupList = champs.lookup(query);
	renderList(lookupList);
	// Unactivate all sort buttons when a search is performed
	container.find('#champStatsFilter').find(".button.active").removeClass("active");
}

/**
 * Render the list of champions by number of pentakills descending
 */
function renderPentaKillSorted () {
	// Since this requires an async call
	container.find('#champStatsResults').html("Loading...");
	stats.getAllChampStats().then(function (champStatsMap) {
		var sortedList = champs.getIdList().sort(function (a, b) {
			return champStatsMap[b].PentaRate - champStatsMap[a].PentaRate;
		});
		renderList(sortedList);
		container.find('#champStatsFilter').replaceWith(champFilter({penta: true}));
	});
}

/**
 * Render the list of champions by name ascending
 */
function renderNameSorted () {
	var nameMap = champs.getNameMap();
	var sortedList = Object.keys(nameMap).sort().map(function (champName) {
		return nameMap[champName];
	});
	renderList(sortedList);
	container.find('#champStatsFilter').replaceWith(champFilter({name: true}));
}

/**
 * Render the list of champions by 1v1 odds descending
 */
function render1v1Sorted () {
	// Since this requires an async call
	container.find('#champStatsResults').html("Loading...");
	stats.getAllChampStats().then(function (champStatsMap) {
		var sortedList = champs.getIdList().sort(function (a, b) {
			return champStatsMap[b].overallSoloKillRating - champStatsMap[a].overallSoloKillRating;
		});
		renderList(sortedList);
		container.find('#champStatsFilter').replaceWith(champFilter({onevone: true}));
	});
}

module.exports.render = render;
