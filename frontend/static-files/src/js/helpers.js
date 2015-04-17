/**
 * Utility functions
 */
var Promise = require('bluebird');

/**
 * Performs a get request on the base url
 * @param {String} uri - e.g. /api/getMyInfo/quickdrawmclawl
 * @returns {Promise} resolves when request completes
 */
module.exports.get = function (uri) {
	return new Promise (function (resolve, reject) {
		$.ajax({
			url: uri,
			success: function (data) {
				if (data instanceof Object) {
					resolve(data);
					return;
				} else {
					try {
						resolve(JSON.parse(data));
					} catch (error) {
						reject(error);
					}
				}

			},
			error: function (error) {
				reject(error);
			}
		});
	});
};
