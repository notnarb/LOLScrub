// map reduce the kills per timestamp.

/*
var mapFunction = function(KillerChampId,VictimChampId){
    killList = this.find({$and[{'KillerChampID':KillerChampId},{'VictimChampId':VictimChampId}]});
    killList.forEach(function(kill){
        emit(kill.timestamp,1)
    });
}*/



mongodb = require('mongodb');
ObjectId = require('mongodb').ObjectID;

var mapFunction = function(){

    if(this.isSoloKill==true){
        emit([this.VictimChampId,this.MinuteMark].join("-"),{'kills':0,'deaths':1})
        emit([this.KillerChampId,this.MinuteMark].join("-"),{'kills':1,'deaths':0})
    }
}

var reduceFunction = function(key, value){
    var retval = {};
    retval['kills']=0;
    retval['deaths']= 0

    value.forEach(function (object){
        retval['kills'] += object['kills'];
        retval['deaths'] += object['deaths'];

    });
    return retval;
}
var finalize = function (key,value){

    odds = Math.round(100*(value['kills']/(value['deaths'] + value['kills'])));

    return({'kills':value['kills'],'deaths':value['deaths'],'odds':odds});

}

var db;

mongodb.connect ('mongodb://mongo:27017/urfday',function(err,db){
    if  (err){return console.dir(err);}

    //console.log("We are connected to the DB");
    //console.log(db.collection('totalKillCollection').count(function(err,count)))


    function setNextLoop(){
        setTimeout(function(){
            var pointerCollection = db.collection('MapReducePointers');
            var startPoint;

            pointerCollection.find({Process:'OverallKillOddsTime'}).limit(1).toArray(function(err, docs) {
                if  (err){return console.dir(err);}

                if(docs.length){
                    console.log("Map reduce previously run. Incrementing ...");
                    startPoint = docs[0]['Location'];
                    console.log("Picking up where we stopped at item " + startPoint);
                }
                else{
                    db.collection('OverallKillOddsTime').drop();
                    console.log("Never Run before, Starting The DB fresh");
                    startPoint = 0;
                }


                    db.collection('totalKillCollection').find().sort({_id:-1}).limit(1).toArray(function(err, lastItem) {
                        if  (err){return console.dir(err);}

                        var LastItemAdded = lastItem[0]['_id'];

                        console.log("Looking for items between " + startPoint + " and " + LastItemAdded);

                        var startPointObject = new ObjectId(startPoint);
                        var LastItemAddedObject = new ObjectId(LastItemAdded)
                         //query = {_id:{$gt:startPointObject}};
                        query = { $and: [{ _id: {$gt:startPointObject}},{_id:{$lte:LastItemAddedObject}}]};

                        console.log("Map reduce Started");
                        db.collection('totalKillCollection').mapReduce(mapFunction,reduceFunction,{out:{reduce:'OverallKillOddsTime'},finalize:finalize,query:query,verbose:true},function(err,collection,stats){//finalize:finalize
                            if(err){return console.dir(err);}
                            console.log("Map-Reduce completed")
                            console.log(stats)
                            pointerCollection.findOneAndReplace({Process:'OverallKillOddsTime'},{Process:'OverallKillOddsTime', Location:LastItemAdded},{upsert:true},function(err,db){
                                if  (err){return console.dir(err);}
                                console.log("Updated Pointer of incremental map reduce to " + LastItemAdded)

                                //setNextLoop()
                            });
                        });
                    });

            });
        },3000);
    }

    setNextLoop();





    //return;
    
});


