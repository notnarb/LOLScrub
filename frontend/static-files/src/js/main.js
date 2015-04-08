"use strict";
var Promise = require('bluebird');
var containerTemplate = require('../tmpl/container.hbs');
var headerTemplate = require('../tmpl/header.hbs');
var userInfo = require('./userInfo');

// window.onLoad
$(function () {
	var container = $('#container').html(containerTemplate({}));
	userInfo.init();
	var name = userInfo.getName();
	container.find("#header").html(headerTemplate({name: name}));
});

