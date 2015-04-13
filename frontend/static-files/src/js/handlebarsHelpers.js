/**
 * Handlebar helper function definitions
 */
var Handlebars = require('hbsfy/runtime');
var lolStatic = require('./lolStatic.js');
var champs = require('./champs.js');
var stats = require('./stats.js');
// var items = require('./items.js');

var staticLoaded = false;

lolStatic.init().then(function () {
	staticLoaded = true;
});


Handlebars.registerHelper("champSprite", function (id) {
	if (!staticLoaded) {
		return "";				//TODO: a placeholder sprite would probably be smart..
	}
	var champ = champs.get(id);
	if (!champ) {
		console.log("tried to render sprite for champ that does note exist", id);
		return "";
	}
	return 'https://' + champ.spriteUrl;
});

Handlebars.registerHelper("champName", function (id) {
	if (!staticLoaded) {
		return "";				//TODO: a placeholder sprite would probably be smart..
	}
	var champ = champs.get(id);
	if (!champ) {
		console.log("tried to render sprite for champ that does note exist", id);
		return "";
	}
	return champ.name;
	
});

/**
 * Convert a percent chance of winning to an rgb() value.
 * @param {Number} odds - the percentage chance of winnig
 * @returns {String} - color in rgb(x,x,x) format
 */
function calculateColor(odds) {
	var green =odds / 100 * 255;
	var red = (100 - odds) / 100 * 255;
	if (green > red) {
		red = parseInt(red / 2, 10);
		green = parseInt(green, 10);
	} else {
		green = parseInt(green / 2, 10);
		red = parseInt(red, 10);
	}
	return "rgb(" + [red, green, 0].join(",") + ")";
}

Handlebars.registerHelper("updatingOdds", function (yourChampId, theirChampId, startTime) {
	if (!yourChampId || !theirChampId || !startTime) {
		throw "Invalid arguments";
	}
	var currentOdds = stats.getOddsByTimestamp(yourChampId, theirChampId, startTime); //TODO: replace with minute markers
	// var element = $('<span>').data({yourChamp:yourChampId, theirChamp: theirChampId, startTIme: startTime}).html(currentOdds);
	var odds = parseInt(currentOdds, 10);
	var dataString = [ 'data-your-champ="', yourChampId , '" data-their-champ="', theirChampId, '" data-start-time="',startTime, '"'].join("");
	// assign a class for cheaper selection
	var element = ['<span class="LS_update_odds" ', dataString, ' style="color:', calculateColor(odds), '">', odds, '</span>'].join("");
	return new Handlebars.SafeString(element);
});

setInterval(function () {
	$('.LS_update_odds').each(function () {
		var element = $(this);
		var yourChampId = element.attr('data-your-champ');
		var theirChampId = element.attr('data-their-champ');
		var startTime = element.attr('data-start-time');
		var currentOdds = stats.getOddsByTimestamp(yourChampId, theirChampId, startTime); //TODO: replace with minute markers
		element.html(parseInt(currentOdds, 10))
			.css('color', calculateColor(currentOdds));
	});
}, 10000);
