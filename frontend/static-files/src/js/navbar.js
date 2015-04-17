/**
 * Handles the actions relevant to the navbar on the left hand side
 */
var Promise = require('bluebird');
var navbarTemplate = require('../tmpl/navbar.hbs');
var content = require('./content');

var navbar;

var currentAnimation = Promise.resolve();

$('body').on('click', '#navbar', function (event) {
	var target = $(event.target);

	var actionTarget = target.closest('[data-action]');

	// If you click outside of an action or you click a disabled action, don't do anything
	if (!actionTarget.length || actionTarget.hasClass('disabled')) {
		return;
	}
	var data = actionTarget.data();

	switch(data.action) {
	case 'loadCurrentGame':
		content.currentGame();
		setActive('current');
		break;
	case 'loadAboutPage':
		module.exports.loadAboutPage();
		break;
	case 'loadChampStats':
		module.exports.loadChampStats();
		break;
	case 'loadLandingPage':
	    content.landingPage();
	    setActive('landingPage');
	    break;
	default:
		alert('Not yet implemented');
	}
});

module.exports.loadAboutPage = function () {
	content.aboutScreen();
	setActive('aboutPage');
};

module.exports.loadChampStats = function () {
	content.champStats();
	setActive('champStats');
};

/**
 * Sets the specified tab as 'active'
 * @param {String} tab - one of 'current', 'champStats', 'pentasPage', 'aboutPage'
 */
function setActive (tab) {
	if (['landingPage','current', 'champStats', 'pentasPage', 'aboutPage'].indexOf(tab) === -1) {
		console.log('Invalid tab name', tab);
		return;
	}
	var oldActive = navbar.find('.navItem.active');
	var newActive = navbar.find('.navItem.' + tab);
	if (newActive.length) {
		if (oldActive) {
			oldActive.removeClass('active');
		}
		newActive.addClass('active');
	}
}

module.exports.setActive = setActive;

function toggle () {
	// Don't do anything if there is a navigation in progress
	if (!currentAnimation.isFulfilled()) {
		return currentAnimation;
	}
	if (navbar.attr('data-shrunk')) {
		currentAnimation = $.Velocity(navbar, 'reverse').then(function () {
			navbar.attr('data-shrunk', false);
		});
	} else {
		currentAnimation = $.Velocity(navbar, {width:0}).then(function () {
			navbar.attr('data-shrunk', true);
		});
	}
	return currentAnimation;
}
module.exports.toggle = toggle;

/**
 * Renders the navigation bar
 */
module.exports.render = function () {
	var navItems = [ {
		text: "Home",
		title: "",
		action: "loadLandingPage",
		cssClass: "landingPage"
	},{
		text: "Current Game",
		title: "Get stats relevant to your current game",
		action: "loadCurrentGame",
		cssClass: "current"
	}, {
		text: "Champion Stats",
		title: "Find out what champ is the best at facilitating your s1ck kills",
		action: "loadChampStats",
		cssClass: "champStats"
	}, {
		text: "Pentakill Leaderboard",
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
