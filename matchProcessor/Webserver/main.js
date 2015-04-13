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

    app.get('/SoloKillPercentageOdds',function(req,res){

            db.collection('SoloKillPercentageOdds').find().toArray(function(err, docs) {
                if  (err){return console.dir(err);}
                retval = {};
                docs.forEach(function(matchup){
                    retval[[matchup.KillerId, matchup.VictimId].join("-")] = matchup.Minute;
                    //console.log(retval);
                    //console.log(matchup);

                });

                res.writeHead(200, {"Content-Type":"application/json"});
                res.write(JSON.stringify(retval));
                res.end()

            });
    });


    app.get('/SoloKillPercentageOdds/:ChampId/:EnemyId',function(req,res){

            console.log({KillerId:req.params.ChampId,VictimId:req.params.EnemyId});
            db.collection('SoloKillPercentageOdds').findOne({KillerId:parseInt(req.params.ChampId),VictimId:parseInt(req.params.EnemyId)},function(err, docs) {
                if  (err){return console.dir(err);}

                res.writeHead(200, {"Content-Type":"application/json"});
                res.write(JSON.stringify(docs.Minute));
                res.end()

            });
    });

    app.get('/SoloKillPercentageOdds/:ChampId/:EnemyId/:Minute',function(req,res){

            console.log({KillerId:req.params.ChampId,VictimId:req.params.EnemyId});
            db.collection('SoloKillPercentageOdds').findOne({KillerId:parseInt(req.params.ChampId),VictimId:parseInt(req.params.EnemyId)},function(err, docs) {
                if  (err){return console.dir(err);}

                res.writeHead(200, {"Content-Type":"application/json"});
                //console.log(docs.Minute[req.params.Minute]);
                res.write(JSON.stringify(docs.Minute[req.params.Minute]));
                res.end()

            });
    });

    app.get('/BestItemPerMatchup',function(req,res){

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

    app.get('/BestItemPerMatchup/:ChampId/:EnemyId/:Minute',function(req,res){

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


    app.get('/GetKsOdds',function(req,res){

            db.collection('KsChancePerChamp').find().toArray(function(err, docs) {
                if  (err){return console.dir(err);}
                retval = {};
               // console.log(docs[0]);
                docs.forEach(function(matchup){
                    retval[matchup['_id']] = matchup.value.Odds;

                    //console.log(matchup);

                });

                res.writeHead(200, {"Content-Type":"application/json"});
                res.write(JSON.stringify(retval));
                res.end()

            });
    });
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


    app.listen(PORT);
    console.log('Listening on port ' + PORT + '...');



    return;

});



