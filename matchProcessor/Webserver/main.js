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


    app.get('/SoloKillPercentageOdds/:ChampId/:EnemyId',function(req,res){
            res.writeHead(200, {"Content-Type":"application/json"});
            console.log({KillerId:req.params.ChampId,VictimId:req.params.EnemyId});
            db.collection('SoloKillPercentageOdds').find({KillerId:parseInt(req.params.ChampId),VictimId:parseInt(req.params.EnemyId)}).stream().pipe(JSONStream.stringify()).pipe(res);
            //console.log(db.collection('SoloKillPercentageOdds').find({KillerId:req.params.ChampId,VictimId:req.params.EnemyId})[0]);
    });
    app.get('/SoloKillPercentageOdds/:ChampId/:EnemyId/:Timestamp',function(req,res){
            res.writeHead(200, {"Content-Type":"application/json"});
            console.log({KillerId:req.params.ChampId,VictimId:req.params.EnemyId});
            db.collection('SoloKillPercentageOdds').find({KillerId:parseInt(req.params.ChampId),VictimId:parseInt(req.params.EnemyId)}).stream().pipe(JSONStream.stringify()).pipe(res);
            //console.log(db.collection('SoloKillPercentageOdds').find({KillerId:req.params.ChampId,VictimId:req.params.EnemyId})[0]);
    });
    app.get('/KillStealOdds/:ChampId/:KSChampId',function(req,res){
            res.writeHead(200, {"Content-Type":"application/json"});
            console.log({KillerId:req.params.ChampId,VictimId:req.params.EnemyId});
            db.collection('KsChancePerChamp').find(value:{ChampId:parseInt(req.params.ChampId),KsChampId:parseInt(req.params.KsChampId)}).stream().pipe(JSONStream.stringify()).pipe(res);
            //console.log(db.collection('SoloKillPercentageOdds').find({KillerId:req.params.ChampId,VictimId:req.params.EnemyId})[0]);
    });
    app.get('/ExpectedBuild/:ChampId/',function(req,res){
            res.writeHead(200, {"Content-Type":"application/json"});
            console.log({KillerId:req.params.ChampId,VictimId:req.params.EnemyId});
            db.collection('AverageItemBuildPerMinute').find(value:{ChampId:parseInt(req.params.ChampId),KsChampId:parseInt(req.params.KsChampId)}).stream().pipe(JSONStream.stringify()).pipe(res);
            //console.log(db.collection('SoloKillPercentageOdds').find({KillerId:req.params.ChampId,VictimId:req.params.EnemyId})[0]);
    });


    app.listen(PORT);
    console.log('Listening on port ' + PORT + '...');



    return;

});



