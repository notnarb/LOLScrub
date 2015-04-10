var mongodb = require('mongodb');
var express = require('express');


var db;
var PORT = 3000;
var app = express();

mongodb.connect ('mongodb://mongo:27017/urfday',function(err,db){


    if  (err){return console.dir(err);}
        console.log("We are connected to the DB");

    app.configure(function () {
        app.use(express.logger('dev'));     /* 'default', 'short', 'tiny', 'dev' */
        app.use(express.bodyParser());
    });


    app.get('/SoloKillPercentageOdds/:ChampId/:EnemyId',function(req,res){
        res.writeHead(200, {"Content-Type":"application/json"});
        //db.collection('SoloKillPercentageOdds').find("KillerId":ChampId,"VictimId":EnemyId)[]);
        res.end(JSON.stringify( ###### ));

    }







    app.listen(PORT);
    console.log('Listening on port ' + PORT + '...');



    return;

});



