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

        if(this.KillerGold > this.VictimGold + 1000){
            emit(this.KillerChampId,{'KillsAhead':1,'DeathsAhead':0,'KillsEqual':0,'DeathsEqual':0})

        }
        else if(this.KillerGold + 1000  < this.VictimGold ){
            emit(this.VictimChampId,{'KillsAhead':0,'DeathsAhead':1,'KillsEqual':0,'DeathsEqual':0})
        }
        else{
            emit(this.VictimChampId,{'KillsAhead':0,'DeathsAhead':0,'KillsEqual':0,'DeathsEqual':1})
            emit(this.KillerChampId,{'KillsAhead':0,'DeathsAhead':0,'KillsEqual':1,'DeathsEqual':0})
        }
    }
}

var reduceFunction = function(key, value){
    var retval = {};
    retval['KillsAhead']=0;
    retval['KillsEqual']=0;
    retval['DeathsAhead']= 0;
    retval['DeathsEqual']= 0;

    value.forEach(function (object){
        retval['KillsAhead'] += object['KillsAhead'];
        retval['KillsEqual'] += object['KillsEqual'];
        retval['DeathsAhead'] += object['DeathsAhead'];
        retval['DeathsEqual'] += object['DeathsEqual'];

    });
    return retval;
}
var finalize = function (key,value){

    var RatioAhead = value['KillsAhead']/(value['DeathsAhead']+value['KillsAhead'])
    var RatioEqual = (value['KillsEqual']/(value['DeathsEqual']+value['KillsEqual']))
    var SnowballRatio = Math.round((3*RatioAhead)/RatioEqual)

    return({'KillsAhead':value['KillsAhead'],'DeathsAhead':value['DeathsAhead'],'KillsEqual':value['KillsEqual'],'DeathsEqual':value['DeathsEqual'],'SnowballRating':SnowballRatio});

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

            pointerCollection.find({Process:'SnowballRating'}).limit(1).toArray(function(err, docs) {
                if  (err){return console.dir(err);}

                if(docs.length){
                    console.log("Map reduce previously run. Incrementing ...");
                    startPoint = docs[0]['Location'];
                    console.log("Picking up where we stopped at item " + startPoint);
                }
                else{
                    db.collection('SnowballRating').drop();
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
                        db.collection('totalKillCollection').mapReduce(mapFunction,reduceFunction,{out:{reduce:'SnowballRating'},finalize:finalize,query:query,verbose:true},function(err,collection,stats){//finalize:finalize
                            if(err){return console.dir(err);}
                            console.log("Map-Reduce completed")
                            console.log(stats)
                            pointerCollection.findOneAndReplace({Process:'SnowballRating'},{Process:'SnowballRating', Location:LastItemAdded},{upsert:true},function(err,db){
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


