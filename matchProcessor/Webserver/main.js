var mongodb = require('mongodb');
var express = require('express');
var JSONStream = require('JSONStream');


var db;
var PORT = 8000;
var app = express();

mongodb.connect ('mongodb://mongo:27017/urfday',function(err,db){


    if  (err){return console.dir(err);}
        console.log("We are connected to the DB");

    /*app.configure(function () {
        app.use(express.logger('dev'));     // 'default', 'short', 'tiny', 'dev'
        app.use(express.bodyParser());
    });*/

    // works
    app.get('/SoloKillOddsAgainstLead',function(req,res){

            db.collection('SoloKillPercentageOdds').find().toArray(function(err, docs) {
                if  (err){return console.dir(err);}
                retval = {};
                docs.forEach(function(matchup){
                    if(matchup.Lead != "Overall"){
                        retval[[matchup.KillerId, matchup.VictimId,matchup.Lead].join("-")] = matchup.Minute;
                    }
                    //console.log(retval);
                    //console.log(matchup);

                });

                res.writeHead(200, {"Content-Type":"application/json"});
                res.write(JSON.stringify(retval));
                res.end()

            });
    });

    app.get('/SoloKillOddsAgainstOverall',function(req,res){

            db.collection('SoloKillPercentageOdds').find().toArray(function(err, docs) {
                if  (err){return console.dir(err);}
                retval = {};
                docs.forEach(function(matchup){
                    if(matchup.Lead == "Overall"){
                        retval[[matchup.KillerId, matchup.VictimId].join("-")] = matchup.Minute;
                    }
                    //console.log(retval);
                    //console.log(matchup);

                });

                res.writeHead(200, {"Content-Type":"application/json"});
                res.write(JSON.stringify(retval));
                res.end()

            });
    });

    app.get('/MultiKills',function(req,res){

             db.collection('GetMultiKills').find().toArray(function(err, docs) {
                if  (err){return console.dir(err);}
                retval = {};
                docs.forEach(function(Champion){
                    console.log(Champion);
                    var ChampId = Champion['_id'];
                    retval[ChampId] = {};
                    retval[ChampId]['PentaRate'] = Champion.value.pentarate;
                    retval[ChampId]['QuadraRate'] = Champion.value.quadrarate;
                    retval[ChampId]['TripleRate'] = Champion.value.triplerate;
                    retval[ChampId]['DoubleRate'] = Champion.value.doublerate;

                });

                res.writeHead(200, {"Content-Type":"application/json"});
                res.write(JSON.stringify(retval));
                res.end()

            });
    });

    app.get('/SnowballValue',function(req,res){

             db.collection('SnowballRating').find().toArray(function(err, docs) {
                if  (err){return console.dir(err);}
                retval = {};
                docs.forEach(function(Champion){
                    var ChampId = Champion['_id'];
                    retval[ChampId] = Champion.value.SnowballRating;

                });

                res.writeHead(200, {"Content-Type":"application/json"});
                res.write(JSON.stringify(retval));
                res.end()

            });
    });

    app.get('/OverallKsRate',function(req,res){

             db.collection('GetOverallKSPerChamp').find().toArray(function(err, docs) {
                if  (err){return console.dir(err);}
                retval = {};
                docs.forEach(function(Champion){
                    var ChampId = Champion['_id'];
                    retval[ChampId] = Champion.value.Odds;

                });

                res.writeHead(200, {"Content-Type":"application/json"});
                res.write(JSON.stringify(retval));
                res.end()

            });
    });
    app.get('/SoloKillOddsOverall',function(req,res){

             db.collection('OverallKillOddsTime').find().toArray(function(err, docs) {
                if  (err){return console.dir(err);}
                retval = {};
                docs.forEach(function(Champion){
                    var ChampId = Champion['_id'];
                    retval[ChampId] = Champion.value.odds;

                });

                res.writeHead(200, {"Content-Type":"application/json"});
                res.write(JSON.stringify(retval));
                res.end()

            });
    });

    app.get('/KsOddsOverall',function(req,res){

             db.collection('GetOverallKSPerChampTime').find().toArray(function(err, docs) {
                if  (err){return console.dir(err);}
                retval = {};
                docs.forEach(function(Champion){
                    var ChampId = Champion['_id'];
                    retval[ChampId] = Champion.value.Odds;

                });

                res.writeHead(200, {"Content-Type":"application/json"});
                res.write(JSON.stringify(retval));
                res.end()

            });
    });

    app.get('/OverallSoloKillRate',function(req,res){

             db.collection('OverallKillOdds').find().toArray(function(err, docs) {
                if  (err){return console.dir(err);}
                retval = {};
                docs.forEach(function(Champion){
                    var ChampId = Champion['_id'];
                    retval[ChampId] = Champion.value.odds;

                });

                res.writeHead(200, {"Content-Type":"application/json"});
                res.write(JSON.stringify(retval));
                res.end()

            });
    });

/*
    app.get('/SoloKillOddsAgainst/:ChampId/:EnemyId',function(req,res){

            console.log({KillerId:req.params.ChampId,VictimId:req.params.EnemyId});
            db.collection('SoloKillPercentageOdds').findOne({KillerId:parseInt(req.params.ChampId),VictimId:parseInt(req.params.EnemyId)},function(err, docs) {
                if  (err){return console.dir(err);}

                res.writeHead(200, {"Content-Type":"application/json"});
                res.write(JSON.stringify(docs.Minute));
                res.end()

            });
    });

    app.get('/SoloKillOddsAgainst/:ChampId/:EnemyId/:Minute',function(req,res){

            console.log({KillerId:req.params.ChampId,VictimId:req.params.EnemyId});
            db.collection('SoloKillPercentageOdds').findOne({KillerId:parseInt(req.params.ChampId),VictimId:parseInt(req.params.EnemyId)},function(err, docs) {
                if  (err){return console.dir(err);}

                res.writeHead(200, {"Content-Type":"application/json"});
                //console.log(docs.Minute[req.params.Minute]);
                res.write(JSON.stringify(docs.Minute[req.params.Minute]));
                res.end()

            });
    });
*/
    app.get('/BestItemsAgainst',function(req,res){

            db.collection('BestItemPerMinute').find().toArray(function(err, docs) {
                if  (err){return console.dir(err);}
                retval = {};
                docs.forEach(function(matchup){
                    retval[matchup['_id']] = matchup.value.MostEffectiveItems;

                    //console.log(matchup);

                });

                res.writeHead(200, {"Content-Type":"application/json"});
                res.write(JSON.stringify(retval));
                res.end()

            });
    });

    /*

    app.get('/BestItemAgainst/:ChampId/:EnemyId/:Minute',function(req,res){

            console.log({KillerId:req.params.ChampId,VictimId:req.params.EnemyId});
            db.collection('BestItemPerMinute').findOne({'value.ChampId':req.params.ChampId,'value.VictimId':req.params.EnemyId,'value.MinuteMark':req.params.Minute},function(err, docs) {
                if  (err){return console.dir(err);}
                //console.log(docs['value']['MostEffectiveItems']);
                res.writeHead(200, {"Content-Type":"application/json"});
                //console.log(docs.Minute[req.params.Minute]);
                res.write(JSON.stringify(docs['value']['MostEffectiveItems']));
                res.end()

            });
    });
    */


    app.get('/ExpectedItems',function(req,res){

            db.collection('AverageItemBuildPerMinute').find().toArray(function(err, docs) {
                if  (err){return console.dir(err);}
                retval = {};
                docs.forEach(function(matchup){
                    retval[matchup['_id']] = matchup.value.TopBuild.build;

                    //console.log(matchup);

                });

                res.writeHead(200, {"Content-Type":"application/json"});
                res.write(JSON.stringify(retval));
                res.end()

            });
    });
/*
    app.get('/ExpectedItems/:ChampId/:Minute',function(req,res){

            console.log({KillerId:req.params.ChampId,VictimId:req.params.EnemyId});
            db.collection('AverageItemBuildPerMinute').findOne({'value.ChampId':req.params.ChampId,'value.MinuteMark':req.params.Minute},function(err, docs) {
                if  (err){return console.dir(err);}
                //console.log(docs['value']['TopBuild']);
                res.writeHead(200, {"Content-Type":"application/json"});
                //console.log(docs.Minute[req.params.Minute]);
                res.write(JSON.stringify(docs['value']['TopBuild']));
                res.end()

            });
    });
*/

    app.get('/KsOddsAgainst',function(req,res){

            db.collection('KsChancePerChampSmooth').find().toArray(function(err, docs) {
                if  (err){return console.dir(err);}
                retval = {};
               // console.log(docs[0]);
                docs.forEach(function(matchup){
                    retval[[matchup.ChampId, matchup.KSChampId].join("-")] = matchup.Minute;

                    console.log(matchup);

                });

                res.writeHead(200, {"Content-Type":"application/json"});
                res.write(JSON.stringify(retval));
                res.end()

            });
    });
    /*
    app.get('/GetKsOdds/:ChampId/:EnemyId/:Minute',function(req,res){

            console.log({KillerId:req.params.ChampId,VictimId:req.params.EnemyId});
            db.collection('KsChancePerChamp').findOne({'value.ChampId':req.params.ChampId,'value.KSChampId':req.params.EnemyId,'value.MinuteMark':req.params.Minute},function(err, docs) {
                if  (err){return console.dir(err);}
                console.log(docs['value']['Odds']);
                res.writeHead(200, {"Content-Type":"application/json"});
                //console.log(docs.Minute[req.params.Minute]);
                res.write(JSON.stringify(docs['value']['Odds']));
                res.end()

            });
    });
    */


    // test via curl -i -X GET  http://localhost:8000/SoloKillPercentageOdds/1/101
    app.listen(PORT);
    console.log('Listening on port ' + PORT + '...');



    return;

});



