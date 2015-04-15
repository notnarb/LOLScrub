/**
 * Behavior for the 'current game' screen
 */
var Promise = require('bluebird');

var userInfo = require('./userInfo');
var champs = require('./champs.js');
var stats = require('./stats.js');

// var currentGameTemplate = require('../tmpl/currentGame.hbs');
var notInGameTemplate = require('../tmpl/currentGame/notInGame.hbs');
var inGameTemplate = require('../tmpl/currentGame/inGame.hbs');

// container to be replaced
var container = $('<div id="currentGame">');

// We will check if you are in a game for you once, free of charge!  All times
// after that you gotta click yourself
var freeCheck = true;

var checkingInGame = false;

var gameState = {
	currentGame: null
	
};

module.exports.render = function () {
	// if (!container) {
	// 	container = notInGameTemplate({}); //currentGameTemplate({myTeam: [0,1,2,3]});
	// }
	if (gameState.currentGame) {
		renderInGameScreen();
	} else {
		renderNotInGameScreen();
	}
	return container;
};

/**
 * determine if the container is on screen or not so it is known whether or not a re-render is needed
 */
function isOnScreen () {
	return container.closest('body').length;
}

/**
 * Get game minute after taking time displacements (Fast forward and rewind) into account
 */
function getGameMinute () {
	if (!gameState.currentGame) {
		throw "No current game";
	}
	var elapsedSeconds = Math.floor((Date.now() - gameState.currentGame.startTime) / 1000);
	var minutes = Math.floor(elapsedSeconds / 60) + gameState.currentGame.timeDisplacement;
	// No point showing times over 1 minute
	if (minutes > 49) {
		minutes = 49;
	}
	return minutes;
}

// Listen to updates to userInfo.  On updates, re-render the content
userInfo.ee.on('update', function () {
	if (isOnScreen) {
		module.exports.render();
	}
});

$('body').on('click', '#currentGame', function (event) {
	var target = $(event.target);

	var actionTarget = target.closest('[data-action]');

	// If you click outside of an action or you click a disabled action, don't do anything
	if (!actionTarget.length || actionTarget.hasClass('disabled')) {
		return;
	}
	var data = actionTarget.data();

	switch(data.action) {
	case 'checkForGame':
		checkIfInGame();
		break;
	case 'simulateGame':
		gameState.currentGame = generateSimulatedGame();
		module.exports.render();
		break;
	case 'reroll':
		gameState.currentGame = generateSimulatedGame();
		module.exports.render();
		break;
	case 'close':
		gameState.currentGame = null;
		module.exports.render();
		break;
	case 'fastforward':
		if (getGameMinute() < 49) {
			gameState.currentGame.timeDisplacement++;
		}
		updateClock();
		updateChartMarkers();
		fillInPercents();
		break;
	case 'rewind':
		if (getGameMinute() >= 1) {
			gameState.currentGame.timeDisplacement--;
		}
		updateClock();
		updateChartMarkers();
		fillInPercents();
		break;
	default:
		console.log('unknown action:', data.action);
	}
});



/**
 * @param {Boolean} [noRender=false] - if true, don't rerender the initial
 * change to checkingInGame (but still trigger a re-render after the request
 * completes
 */
function checkIfInGame () {
	if (checkingInGame) {
		return;
	}
	checkingInGame = true;
	module.exports.render();
	Promise.delay(3000).then(function () {
		checkingInGame = false;
		module.exports.render();
	});
}

/**
 * Render the screen that allows you to chooise to pick a game
 */
function renderNotInGameScreen () {
	var loggedIn = !!userInfo.getName();
	if (loggedIn && freeCheck) {
		freeCheck = false;
		checkIfInGame(true);
	}
	var isChecking = checkingInGame;
	var checkButtonText = isChecking ? 'Loading...' : 'Check now';
	var msg = loggedIn ? "No game loaded" : "No game loaded.  You must log in as a summoner to check for your current game";
	var state = {
		msg: msg,
		loggedIn: loggedIn,
		isChecking: isChecking,
		checkButtonText: checkButtonText
	};
	var toRender = $(notInGameTemplate(state));
	container.replaceWith(toRender);
	container = toRender;
}

// var simulatedGame = {
// 	participants: [
// 		{team: 100, champId: 1, name: 'chuck'},
// 		{team: 100, champId: 3, name: 'HotShotGG'},
// 		{team: 200, champId: 45, name: 'Mew2king'},
// 		{team: 200, champId: 54, name: 'Day9'}
// 	]
// };

function generateName () {
	var prefixes = ['The Great', '', 'Not', 'Very', 'Original'];
	var adjectives = ['Salty', 'Smelly', 'Spooky', 'Rugged', 'Seductive'];
	var nouns = ['Mr Worldwide', 'Oakland Raiders', 'Teemo', 'Sean Paul', 'Veigar', 'Lee Sin', 'OuttaNames'];

	var prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
	var adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
	var noun = nouns[Math.floor(Math.random() * nouns.length)];

	// RAIDER NATION
	if (noun === 'Oakland Raiders') {
		prefix = 'The';
		adjective = 'UNBEATABLE';
	}
	return [prefix, adjective, noun].join(" ");
	
}

function generateSimulatedGame () {
	var retval = {
		participants : [],
		startTime: Date.now(),
		lastUpdatedMinute: -1,
		timeDisplacement: 0		//how fast forwarded or rewinded this game is
	};

	var champIdList = champs.getIdList();
	var teamCount = {
		'100': 0,
		'200': 0
	};
	function createParticipant () {
		var participant = {
			name: generateName(),
			team: teamCount['100'] >= 5 ? '200' : '100' //if there are 5 members on team 100, put on team 200 instead
		};
		teamCount[participant.team] += 1;
		participant.champId = champIdList[Math.floor(Math.random() * champIdList.length)];
		return participant;
	}
	var numParticipants = 0;
	while(numParticipants < 10) {
		numParticipants++;
		retval.participants.push(createParticipant());
	}
	return retval;
}

/**
 * 
 */
function renderInGameScreen () {
	var game = gameState.currentGame;
	var myTeamNumber = '100';
	var state = {};
	var myTeam = [];
	var enemyTeam = [];
	game.participants.forEach(function (participant) {
		if (participant.team === myTeamNumber) {
			myTeam.push(participant);
		} else {
			enemyTeam.push(participant);
		}
	});
	state.myTeam = myTeam;
	state.enemyTeam = enemyTeam;
	// TODO: probably not 'me'
	state.myChampId = myTeam[0].champId;
	state.startTime = game.startTime;

	var toRender = $(inGameTemplate(state));
	container.replaceWith(toRender);
	container = toRender;
	fillInData();
}

function fillInData() {
	stats.loadOdds().then(function () {
		fillInPercents();
		fillInCharts();
	});
}

function fillInPercents () {
	container.find('.LS_update_odds').each(function () {
		var element = $(this);
		var yourChampId = element.attr('data-your-champ');
		var theirChampId = element.attr('data-their-champ');
		var startTime = element.attr('data-start-time');
		var elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
		var minutes = getGameMinute();
		var currentOdds = stats.getOddsByTimestamp(yourChampId, theirChampId, minutes);
		element.html(Math.round(currentOdds))
			.css('color', calculateColor(currentOdds));
	});

}

/**
 * finds all chart containers and fills them in with charts
 * TODO: currently fails to create charts if container is not currently rendered on the page
 */
function fillInCharts () {
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
				fillColor: "rgba(76,175,80,0.2)",
				strokeColor: "rgba(76,175,80,1)"
			}]
		};
		var chart = new Chart(ctx).Line(chartData, chartOptions);
	});

	container.find('[data-chart-ks-odds]').each(function () {
		var element = $(this);
		var data = element.data();
		var myChamp = data.myChamp;
		var theirChamp = data.theirChamp;
		var odds = stats.getOddsArray(myChamp, theirChamp);
		console.log(odds);
		// get canvas
		var ctx = this.getContext("2d");
		var chartData = {
			labels: ['Minute 1','Minute 2','Minute 3','Minute 4','Minute 5','Minute 6','Minute 7','Minute 8','Minute 9','Minute 10','Minute 11','Minute 12','Minute 13','Minute 14','Minute 15','Minute 16','Minute 17','Minute 18','Minute 19','Minute 20','Minute 21','Minute 22','Minute 23','Minute 24','Minute 25','Minute 26','Minute 27','Minute 28','Minute 29','Minute 30'], //I used a macro, I swear
			datasets: [{
				label: "Odds",
				data: odds,
				fillColor: "rgba(76,175,80,0.2)",
				strokeColor: "rgba(76,175,80,1)"
			}]
		};
		var chart = new Chart(ctx).Line(chartData, chartOptions);
	});
}


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



/**
 * Convert a percent chance of winning to an rgb() value.
 * @param {Number} odds - the percentage chance of winnig
 * @returns {String} - color in rgb(x,x,x) format
 */
function calculateColor(odds) {
	var green =odds / 100 * 255;
	var red = (100 - odds) / 100 * 255;
	if (green > red) {
		red = parseInt(red / 2, 10);
		green = parseInt(green, 10);
	} else {
		green = parseInt(green / 2, 10);
		red = parseInt(red, 10);
	}
	return "rgb(" + [red, green, 0].join(",") + ")";
}

var CHART_WIDTH = 256;			//width in pixels of the game charts
var CHART_SECONDS = 30 * 60; // number of seconds in a chart (of 30 minutes worth of data)

function updateChartMarkers () {
	// note: chart containers start at -10 px so use right property instead of left
	var startTime = gameState.currentGame.startTime;
	var elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
	var seconds = elapsedSeconds % 60;
	var minutes = getGameMinute();
	var totalGameSeconds = minutes * 60 + seconds;
	var rightPosition = CHART_WIDTH - Math.round((totalGameSeconds / CHART_SECONDS) * CHART_WIDTH);
	var markers = container.find('.chartMarker');
	$.Velocity(markers, "stop");
	$.Velocity(markers, {'right': rightPosition + 'px'}, "linear");
}

function updateClock() {
	container.find('.gameClock').each(function () {
		var element = $(this);
		var startTime = element.attr('data-start-time');
		var elapsedSeconds = Math.round((Date.now() - startTime) / 1000);
		var seconds = elapsedSeconds % 60;
		var minutes = getGameMinute();
		if (minutes !== gameState.lastUpdatedMinute) {
			stats.loadOdds().then(function () {
				fillInPercents();
			});
			gameState.lastUpdatedMinute = minutes;
		}
		if (minutes < 10) {
			minutes = "0" + minutes;
		}
		if (seconds < 10) {
			seconds = "0" + seconds;
		}
		element.html(minutes + ":" + seconds);
	});
}

setInterval(function () {
	if (gameState.currentGame) {
		updateClock();
		updateChartMarkers();
	}
}, 1000);
