"use strict";
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

	var header = require('./header');
	containerContent.find("#header").replaceWith(header.render());

	container.replaceWith(containerContent);
});

