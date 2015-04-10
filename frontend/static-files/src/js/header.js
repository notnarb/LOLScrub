/**
 * @module header
 * @desc Module to handle the rendering and actions of the header
 */
var userInfo = require('./userInfo');
var navbar = require('./navbar');

var headerTemplate = require('../tmpl/header.hbs');
var loginTemplate = require('../tmpl/header/login.hbs');

// The jquery header container
var header;

$('body').on('submit', '#header', function (event) {
	login();
	// prevent actual submission of the form
	return false;
});

$('body').on('click', '#header', function (event) {
	var target = $(event.target);

	var actionTarget = target.closest('[data-action]');

	// If you click outside of an action or you click a disabled action, don't do anything
	if (!actionTarget.length || actionTarget.hasClass('disabled')) {
		return;
	};
	var data = actionTarget.data();

	switch(data.action) {
	case 'login':
		login();
		break;
	case 'logout':
		userInfo.forgetInfo();
		update();
		break;
	case 'ohhamburgers':
		navbar.toggle();
		break;
	default:
		console.log('Unknown action', data.action);
	}
});

/**
 * Return a new jquery object containing the header
 */
module.exports.render = function () {
	if (!header) {
		var name = userInfo.getName();
		header = $(headerTemplate({}));
		update();
	}
	return header;
};


function login () {
	var input = header.find('[data-login]');
	if (input && input.val()) {
		var loginButton = header.find('[data-action="login"]');
		loginButton.addClass('disabled');
		var previousText = loginButton.html();
		loginButton.html('Loading...');
		userInfo.setName(input.val())
			.then(update)
			.catch(function (error) {
				alert('Failed to log in');
			})
			.finally(function () {
				loginButton.html(previousText);
				loginButton.removeClass('disabled');
			});
	}
}

/**
 * Lazily re-render the entire header
 */
function update () {
	var name = userInfo.getName();
	header.find('.userInfo').replaceWith(loginTemplate({
		name: name
	}));
};
