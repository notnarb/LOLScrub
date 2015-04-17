/**
 * @desc module for filling in charts
 * @module charts
 */
var stats = require('./stats');

/**
 * finds all ks odds and 1v1 odds charts and fill them in.  Delays the rendering
 * of each chart by 10ms to improve responsiveness while loading a large amount
 * of charts (especially on weaker devices like phones)
 * 
 * TODO: currently fails to create charts if container is not currently rendered on the page
 * @param {jQuery} - jquery object to fill in charts for within
 */
module.exports.fillInCharts = function (container) {
	// incrementing amount of time to delay between each render
	var currentTimeout = 0;
	container.find('[data-chart-odds]').each(function () {
		$(this).html('loading...');
	});
	stats.loadOdds().then(function () {
		container.find('[data-chart-odds]').each(function () {
			var element = $(this);
			var data = element.data();
			var myChamp = data.myChamp;
			var theirChamp = data.theirChamp;
			var odds = stats.getOddsArray(myChamp, theirChamp);
			console.log(odds);
			// get canvas
			var ctx = this.getContext("2d");
			var chartData = {
				labels: ['Minute 0', 'Minute 1','Minute 2','Minute 3','Minute 4','Minute 5','Minute 6','Minute 7','Minute 8','Minute 9','Minute 10','Minute 11','Minute 12','Minute 13','Minute 14','Minute 15','Minute 16','Minute 17','Minute 18','Minute 19','Minute 20','Minute 21','Minute 22','Minute 23','Minute 24','Minute 25','Minute 26','Minute 27','Minute 28','Minute 29'], //I used a macro, I swear
				datasets: [{
					label: "Odds",
					data: odds,
					fillColor: "rgba(63,81,181,0.2)", //indigo500
					strokeColor: "rgba(63,81,181,1)"
				}]
			};
			setTimeout(function () {
				var chart = new Chart(ctx).Line(chartData, chartOptions);
			}, currentTimeout);
			currentTimeout += 10;
		});

		container.find('[data-chart-ks-odds]').each(function () {
			var element = $(this);
			var data = element.data();
			var myChamp = data.myChamp;
			var theirChamp = data.theirChamp;
			var odds = stats.getKsOddsArray(myChamp, theirChamp);
			console.log(odds);
			// get canvas
			var ctx = this.getContext("2d");
			var chartData = {
				labels: ['Minute 0', 'Minute 1','Minute 2','Minute 3','Minute 4','Minute 5','Minute 6','Minute 7','Minute 8','Minute 9','Minute 10','Minute 11','Minute 12','Minute 13','Minute 14','Minute 15','Minute 16','Minute 17','Minute 18','Minute 19','Minute 20','Minute 21','Minute 22','Minute 23','Minute 24','Minute 25','Minute 26','Minute 27','Minute 28','Minute 29','Minute 29'], //I used a macro, I swear
				datasets: [{
					label: "Odds",
					data: odds,
					fillColor: "rgba(156,39,176,0.2)", //purple500
					strokeColor: "rgba(156,39,176,1)"
				}]
			};
			setTimeout(function () {
				var chart = new Chart(ctx).Line(chartData, chartOptions);
			}, currentTimeout);
			currentTimeout += 10;
		});
	});
};


var chartOptions = {
	animation: false,
	scaleShowLabels: false, //dont waste space on vertical labels
	scaleOverride: true,	//Explicit y axis
	scaleSteps: 2,
	scaleStepWidth: 50,	    //2 steps at 50% each
	scaleStartValue: 0,
	pointDot: false,
	scaleFontSize: 0,
	pointHitDetectionRadius: 1,
	datasetStrokeWidth: 1,
	responsive: true
};

