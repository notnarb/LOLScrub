// map reduce the kills per timestamp.

/*
var mapFunction = function(KillerChampId,VictimChampId){
    killList = this.find({$and[{'KillerChampID':KillerChampId},{'VictimChampId':VictimChampId}]});
    killList.forEach(function(kill){
        emit(kill.timestamp,1)
    });
}*/



var mongodb = require('mongodb');

var mapFunction = function(){
        keyval =[this.KillerChampId, this.VictimChampId, this.MinuteMark].join("-")
        emit(keyval,1)
}

var reduceFunction = function(key, value){
    return Array.sum(value)
}
var finalize = function (key,value){
    var res=key.split("-")
    return({"KillerChampId":res[0],"VictimChampId":res[1],"MinuteMark":res[2],"count":value});

}

var db;
mongodb.connect ('mongodb://mongo:27017/urfday',function(err,db){
    if  (err){return console.dir(err);}
    console.log("We are connected to the DB");
    db.collection('killsPerTimeSlice').drop();
    db.collection('totalKillCollection').mapReduce(mapFunction,reduceFunction,{out:'killsPerTimeSlice',finalize:finalize});
    console.log("Map reduce complete");
    return;
    
});


