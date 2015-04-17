/**
 * Controller for the main content container
 */
var currentGame = require('./currentGame');
var aboutPageTemplate = require('../tmpl/about.hbs');
var champStats = require('./champStats'); 
var landingPageTemplate = require('../tmpl/landing.hbs');
var navbar = require('./navbar');

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



$('body').on('click', '#landingPage', function (event) {
	var target = $(event.target);

	var actionTarget = target.closest('[data-action]');

	// If you click outside of an action or you click a disabled action, don't do anything
	if (!actionTarget.length || actionTarget.hasClass('disabled')) {
		return;
	}
	var data = actionTarget.data();

	switch(data.action) {
	case 'entersite':
		// TODO: this could do something flashy
		navbar.loadChampStats();
		break;
	default:
		alert('Not yet implemented');
	}
});
