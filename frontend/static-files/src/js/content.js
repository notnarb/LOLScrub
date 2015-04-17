/**
 * Controller for the main content container
 */
var currentGame = require('./currentGame');
var aboutPageTemplate = require('../tmpl/about.hbs');
var champStats = require('./champStats'); 
var landingPageTemplate = require('../tmpl/landing.hbs');

// Main content container
var content;

/**
 * @returns {jQuery} - jquery object containing what should go in the content container
 */
module.exports.render = function () {
	if (!content) {
		content = $('<div id="content">');
		module.exports.landingPage();
	}
	return content;
};

module.exports.landingPage = function() {
    content.html(landingPageTemplate({}));
};


module.exports.aboutScreen = function () {
	content.html(aboutPageTemplate({}));
};

/**
 * Load the current game screen
 */
module.exports.currentGame = function () {
	content.html(currentGame.render());
};


module.exports.champStats = function () {
	content.html(champStats.render());
};
