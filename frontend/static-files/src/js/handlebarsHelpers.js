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

Handlebars.registerHelper("updatingOdds", function (yourChampId, theirChampId, startTime) {
	if (!yourChampId || !theirChampId || !startTime) {
		throw "Invalid arguments";
	}
	var dataString = [ 'data-your-champ="', yourChampId , '" data-their-champ="', theirChampId, '" data-start-time="',startTime, '"'].join("");
	// assign a class for cheaper selection
	var element = '<span class="LS_update_odds" ' +  dataString + '></span>';
	return new Handlebars.SafeString(element);
});

Handlebars.registerHelper("updatingKSOdds", function (yourChampId, theirChampId, startTime) {
	if (!yourChampId || !theirChampId || !startTime) {
		throw "Invalid arguments";
	}
	var dataString = [ 'data-your-champ="', yourChampId , '" data-their-champ="', theirChampId, '" data-start-time="',startTime, '"'].join("");
	// assign a class for cheaper selection
	var element = '<span class="LS_KS_update_odds" ' +  dataString + '></span>';
	return new Handlebars.SafeString(element);
});
