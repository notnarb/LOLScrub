/**
 * Handles the actions relevant to the navbar on the left hand side
 */
var navbarTemplate = require('../tmpl/navbar.hbs');

var navbar;
/**
 * 
 */
module.exports.render = function () {
	var navItems = [{
		text: "Current Game",
		title: "Get stats relevant to your current game",
		action: "loadCurrentGame"
	}, {
		text: "Champion stats",
		title: "Find out what champ is the best at facilitating your s1ck kills",
		action: "loadChampStats"
	}, {
		text: "Pentakill leaderboard",
		title: "What champs can get you those pentakills you deserver",
		action: "loadPentasPage"
	}, {
		text: "About",
		title: "Learn more about the technologies and people behind LOLScrub",
		action: "loadAboutPage"
			
	}];
	if (!navbar) {
		navbar = $(navbarTemplate({navItems: navItems}));
	}
	return navbar;
};
