var util = require('util');
var Promise = require('bluebird');
var request = require('request');
var mongodb = require('mongodb');
var moment  = require('moment');

Promise.promisifyAll(request);
Promise.promisifyAll(mongodb.MongoClient);
Promise.promisifyAll(mongodb.Collection.prototype);

var FORMAT_STRING = "YYYY-MM-DD HH:mm:ss";


var currentDate = null;

function CheckSummonerNeedsUpdate(){

    //TODO: This
    return true;
}

function fillWithSeedData(db,callback){
    console.log('Summoner Lookup List is empty, populating with Riot seed game data');
    var SeedURL = 'https://s3-us-west-1.amazonaws.com/riot-api/seed_data/matches1.json';
12

    request({
        url:SeedURL,
        json:true

    }, function(error,response,body){
        console.log("response json, then body");
        console.log(response);
        console.log(body);
        if  (error){
            console.dir(error);
            callback(error)
        }
        if(response.statusCode !=200){
            console.dir("Code was not 200");
            callback(new Error("Code was not 200"))
        }
        console.log("Call successful");
        var bulkSummoners = db.collection('SummonersToLookup').initializeUnorderedBulkOp();
        console.log("parsing everything");
		body.matches.forEach(function(match){
			match.participantIdentities.forEach(function(player){
				if(CheckSummonerNeedsUpdate(player.player.summonerId))
				    console.log(player.player.summonerId);
					bulkSummoners.insert({SummonerId:player.player.summonerId})
			});
		});
		console.log("Now inserting everything");
		bulkSummoners.execute(function(err, result){
			// TODO: Verify everything inserted correctly.
			callback(null);
		});


    })

    //db.collection('SummonersToLookup').insert(batch, function(err, ret){
    //    if  (err){return console.dir(err);}
    //return true;*/

   // });
}

/**
 * Get the currentDate from the database then calls loopOrWait
 * @param db - mongo database object
 */
function initLoop (db) {
	console.log('starting loop');
	db.collection('SummonersToLookup').count(function (err, size) {
	    if  (err){return console.dir(err);}
	    if (size == 0){
	        fillWithSeedData(db, loopOrWait.bind(null,db));
	    }
	    else{
		    loopOrWait(db);
		}


	});
}

/**
 * Check if there should be new data, query if the new data exists, then call
 * loopOrWait again either via process.setTimeout() or process.nextTick depending on what the believed wait time for new data is
 */
function loopOrWait (db) {

    console.log('Looking up new summoner');

    //TODO Fix this
	if (db.collection('matchList').count() > 10000) {
		console.log('waiting', timeUntilNextCheck);
		setTimeout(loopOrWait.bind(null, db), timeUntilNextCheck);
		return;
	}


	db.collection('SummonersToLookup').findOne( function (err,summoner) {
		if(CheckSummonerNeedsUpdate(summoner.SummonerId)){
			getMatchHistory(summoner.SummonerId,function(err,matchHistory){

                //var bulkMatches = db.collection('matchList').initializeUnorderedBulkOp();
                var matchList = {}
                matchList['resultList'] = []

                if(!matchHistory.matches){
                    // this user has no history.. not sure how
                    console.log("Summoner " + summoner + " has no match history");
                    return loopOrWait(db);
                }

                matchHistory.matches.forEach(function(match){


                    //TODO: Check patch Version
                    if(match.queueType == 'RANKED_SOLO_5x5'){

                    }


                    matchList['resultList'].push(match.matchId);
                    //bulkMatches.insert({matchId:match.matchId})
                   // console.log(match.participantIdentities);

                   /* match.participantIdentities.forEach(function(participant){
                        console.log("Bulk summoner added ");
                        console.log(participant)
                        console.log(participant.participantId);
                        bulkSummoners.insert({SummonerId:participant.participantId})
                    });*/



			    });
			     console.log("Removing summoner " + summoner + " from queue after being processed");
			    db.collection('SummonersToLookup').findAndRemove(summoner, function (err,summoner) {
                        //TODO: verify was deleted

                    console.log("Adding Summoners matchList");
			        console.log(matchList);
			        console.log("Adding Matchlist ");
			        db.collection('matchList').insert(matchList);
			        //bulkMatches.execute(function(err, result)
                    return loopOrWait(db);

                });

			    //bulkMatches.execute(function(err, result){
				// TODO: Verify everything inserted correctly.
                   // console.log("Adding bulk matches ");
				   /*bulkSummoners.execute(function(err, result){
					// TODO: Verify everything inserted correctly.
					    //return loopOrWait

				//return;
			        / });*/

				//return;
			   // });

			});

			
			
			
		}
		
	
	});/*.catch(RiotApiError, function (error) {
		if (error.code === 404) {
			console.log('404 for date, skipping');
			getNextDate();
			return Promise.resolve();
		};
		if (error.code === 429) {
			// wait for 1 minute if api replies with rate limit exceeded
			// TODO: alter error handlers to parse for wait header
			console.log("Hit api limit, waiting for one minute");
			return Promise.delay(60000);
		}
		return Promise.reject(error);
	}).finally(function () {
		// trigger loopOrWait again, but add it to the event loop rather than
		// straight recursively calling it to prevent memory leaks
		process.nextTick(loopOrWait.bind(this, db));
	});*/
	
}


function RiotApiError (message, code) {
	Error.call(this);
	this.name = 'RiotApiError';
	this.message = message;
	this.code = code;
};

util.inherits(RiotApiError, Error);

/**
 * Handler for when the riot api sends back a body.status.status_code
 * @param {Integer} statusCode - the error code sent from riot
 */
function riotErrorHandler (statusCode) {
	switch(statusCode) {
	case 400:
		throw new RiotApiError('Bad request', statusCode);
	case 401:
		throw new RiotApiError("Access denied", statusCode);
	case 404:
		throw new RiotApiError("404 not found", statusCode);
	case 429:
		throw new RiotApiError("Rate limit exceeded", statusCode); //TODO: convert to catchable error
	case 500:
		throw new RiotApiError('Internal server error', statusCode);
	case 503:
		throw new RiotApiError('Service unavailable', statusCode);
	default:
		console.log('Unknown code:', statusCode);
	}

}


/**
 * Given a date, get a list of match Ids from the riot api
 * @param {Integer} time - date time (epoch) to lookup
 * @returns {Promise} - resolves with array of match IDs
 * @throws rejects promise if given a status code in the response
 */
function getMatchHistory (SummonerId,callback) {
	var requestUrl = [
		'http://riotambassador:8000/api/lol/na/v2.2/matchhistory/',
		 SummonerId
	].join("");
	 request({
        url:requestUrl,
        json:true

    }, function(error,response,body){
		if (body.status && body.status.status_code) {
			riotErrorHandler(body.status.status_code);
		}
		callback(null,body);
	});
}


/**
 * Checks the database for a match list with the specified time exists. Resolves
 * with true if it does exist AND isn't empty.  Otherwise resolves with false
 * @param {mongodb.Collection} collection - collection to check
 * @param {Integery} time - timestamp of the collection to check
 * @returns {Promise} - resolves if a valid match list with that timestamp exists
 */
function checkSummonerUpdateTime (collection,SummonerId, time) {
	if (!collection || !time) {
		return Promise.reject("Missing params for matchListIsValid");
	}
	return collection.findOneAsync({SummonerId:SummonerId})
		.then(function(results) {
			if (results && results.lastChecked < time && results.resultList.length) {
				return true;
			}
			return false;
		});
};
/**
 * Given results from getMatchList(), store them into mongo
 * @returns {Promise}
 */
function storeMatchList (collection, resultBody, time) {
	if (!collection || !resultBody || !time) {
		return Promise.reject("Missing params for storeMatchList");
	}
	
	return collection.findOneAsync({time: time})
		.then(function (result) {
			if (result) {
				console.log('results already exist for time', time);
				// if there is more results in this search result, replace the record
				if (resultBody.length > result.resultList.length) {
					console.log('More results found, updating record');
					return collection.updateAsync({_id: result._id}, {resultList: resultBody});
				}
				console.log('No results found, skipping');
				return Promise.resolve();
			}
			return collection.insertAsync({
				time: time,
				resultList: resultBody	//resultBody should be an array
			});
		});

}

console.log('Starting match Getter Ranked');
var client = mongodb.MongoClient.connectAsync('mongodb://mongo:27017/ranked')
		.then(function (foundDb) {
			var db = foundDb;
			return initLoop(db);
		}).catch(function (error) {
			console.log('Found error', error, 'exiting');
		});
