/**
 * Handles the actions relevant to the navbar on the left hand side
 */
var Promise = require('bluebird');
var navbarTemplate = require('../tmpl/landing.hbs');
var content = require('./content');


var currentAnimation = Promise.resolve();

$('body').on('click', '#landing', function (event) {
	var target = $(event.target);

	var actionTarget = target.closest('[data-action]');

	// If you click outside of an action or you click a disabled action, don't do anything
	if (!actionTarget.length || actionTarget.hasClass('disabled')) {
		return;
	};
	var data = actionTarget.data();

	switch(data.action) {
	case 'entersite':
		content.currentGame();
		navbar.setActive('current');
		break;
	default:
		alert('Not yet implemented');
	}
});

/**
 * Sets the specified tab as 'active'
 * @param {String} tab - one of 'current', 'champStats', 'pentasPage', 'aboutPage'
 */


/**
 * Renders the navigation bar
 */
 /*
module.exports.render = function () {
	var navItems = [ {
		text: "Landing Page",
		title: "Find out about the app",
		action: "loadLandingPage",
		cssClass: "landingPage"
	},{
		text: "Current Game",
		title: "Get stats relevant to your current game",
		action: "loadCurrentGame",
		cssClass: "current"
	}, {
		text: "Champion stats",
		title: "Find out what champ is the best at facilitating your s1ck kills",
		action: "loadChampStats",
		cssClass: "champStats"
	}, {
		text: "Pentakill leaderboard",
		title: "What champs can get you those pentakills you deserver",
		action: "loadPentasPage",
		cssClass: "pentasPage"
	}, {
		text: "About",
		title: "Learn more about the technologies and people behind LOLScrub",
		action: "loadAboutPage",
		cssClass: "aboutPage"
			
	}];
	if (!navbar) {
		navbar = $(navbarTemplate({navItems: navItems}));
		setActive('landingPage');
	}
	return navbar;
};
*/