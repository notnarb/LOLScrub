/**
 * @module userInfo
 * @desc Handles getting and setting identity for the user
 */
/*global localStorage:true*/
var Promise = require('bluebird');
var helpers = require('./helpers');
var events = require('events');
// Object containing info about the user
var storedInfo;


/**
 * Emit events when user info changes so UI knows to update
 */
module.exports.ee = new events.EventEmitter();

/**
 * Initializes this module.  checks local storage to see if there is an existing name
 */
module.exports.init = function () {
	storedInfo = {};
	if (!localStorage || !localStorage.user) {
		return;
	}
	try {
		storedInfo = JSON.parse(localStorage.user);
	} catch (e) {
		console.log('failed to parse local storage');
		module.exports.forgetInfo();
	}
};


/**
 * Store info about this user for later (via local storage and local variable)
 */
function storeName (name, info) {
	storedInfo = {
		name: info.name,
		info: info
	};
	localStorage.user = JSON.stringify(storedInfo);
}

/**
 * Gets name if stored in localstorage
 * @returns {String} name if found, null otherwise
 */
module.exports.getName = function () {
	if (!storedInfo) {
		throw "userInfo has not been initialized";
	}
	if (storedInfo.name) {
		return storedInfo.name;
	}
	return null;
};

/**
 * Sets the user's summoner name
 * @param {String} name - the name
 * @returns {Promise} resolves if name found and stored, rejects if not found
 */
module.exports.setName = function (name) {
	return helpers.get('/app/getmyinfo/' + name)
		.then(function (data) {
			storeName(name, data);
			module.exports.ee.emit('update');
		});
};

/**
 * Forget about this user.  Sorta like a log out.
 */
module.exports.forgetInfo = function () {
	storedInfo = {};
	if (localStorage) {
		delete localStorage.user;
	}
	module.exports.ee.emit('update');
};
