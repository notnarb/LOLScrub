/**
 * @module header
 * @desc Module to handle the rendering and actions of the header
 */
var userInfo = require('./userInfo');

var headerTemplate = require('../tmpl/header.hbs');
var loginTemplate = require('../tmpl/header/login.hbs');

// The jquery header container
var header;

$('body').on('submit', '#header', login);

$('body').on('click', '#header', function (event) {
	var target = $(event.target);

	var actionTarget = target.closest('[data-action]');

	// If you click outside of an action, don't do anything
	if (!actionTarget.length) {
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
		userInfo.setName(input.val()).then(update)
			.catch(function (error) {
				alert('Failed to log in');
			});
	}
	// submit handler
	return false;
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
