"use strict";
// Make it clear when I forget to require bluebird
window.Promise = undefined;
var Promise = require('bluebird');
var containerTemplate = require('../tmpl/container.hbs');

// window.onLoad
$(function () {
	var container = $('#container');
	// TODO: better intitial load behavior
	container.html('Loading...');
	
	var containerContent = $(containerTemplate({}));

	var userInfo = require('./userInfo');
	userInfo.init();

	// One day I'll learn a proper framework....
	var header = require('./header');
	containerContent.find("#header").replaceWith(header.render());

	var navbar = require('./navbar');
	containerContent.find('#navbar').replaceWith(navbar.render());
	
	container.replaceWith(containerContent);
});

