/**
 * Controller for the main content container
 */
var currentGameTemplate = require('../tmpl/currentGame.hbs');
// Main content container
var content;

/**
 * @returns {jQuery} - jquery object containing what should go in the content container
 */
module.exports.render = function () {
	if (!content) {
		content = $('<div id="content">');
		module.exports.aboutScreen();
	}
	return content;
};


module.exports.aboutScreen = function () {
	content.html("TODO: about our app");
};

/**
 * Load the current game screen
 */
module.exports.currentGame = function () {
	var myTeam = [1,2,3,4,5];
	content.html(currentGameTemplate({myTeam: myTeam}));
};

