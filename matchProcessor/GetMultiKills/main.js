

var mongodb = require('mongodb');
ObjectId = require('mongodb').ObjectID;

var mapFunction = function(){
   this.participants.forEach(function (participant) {
        emit(participant.championId,{'pentakills': participant.stats.pentaKills,'quadrakills': participant.stats.quadraKills,'triplekills': participant.stats.tripleKills,'doublekills': participant.stats.doubleKills,numGames:1})
   });

}

var reduceFunction = function(key, values){
    var numPenta = 0;
    var numQuadra = 0;
    var numTriple = 0;
    var numDouble = 0;
    numGames = 0;
    for (var i = 0; i < values.length;i++){
        var value = values[i];
        numPenta+=value.pentakills;
        numQuadra+=value.quadrakills;
        numTriple+=value.triplekills;
        numDouble+=value.doublekills;
        numGames+=value.numGames;
    }
    var pentaRate,quadraRate,tripleRate,doubleRate = 0
    pentaRate = Math.round( 10000*numPenta/numGames);
    quadraRate = Math.round( 10000*numQuadra/numGames);
    tripleRate = Math.round( 10000*numTriple/numGames);
    doubleRate = Math.round( 10000*numDouble/numGames);
    return {'pentakills':numPenta,'quadrakills':numPenta,'triplekills':numTriple,'doublekills':numDouble,'pentarate':pentaRate,'quadrarate':quadraRate,'triplerate':tripleRate,'doublerate':doubleRate,numGames:numGames};


}
function finalize (key,value){


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

            pointerCollection.find({Process:'GetMultiKills'}).limit(1).toArray(function(err, docs) {
                if  (err){return console.dir(err);}

                if(docs.length){
                    console.log("Map reduce previously run. Incrementing ...");
                    startPoint = docs[0]['Location'];
                    console.log("Picking up where we stopped at item " + startPoint);
                }
                else{
                    db.collection('GetMultiKills').drop();
                    console.log("Never Run before, Starting The DB fresh");
                    startPoint = 0;
                }

                    db.collection('matches').find().sort({_id:-1}).limit(1).toArray(function(err, lastItem) {
                        if  (err){return console.dir(err);}

                        var LastItemAdded = lastItem[0]['_id'];

                        console.log("Looking for items between " + startPoint + " and " + LastItemAdded);

                        var startPointObject = new ObjectId(startPoint);
                        var LastItemAddedObject = new ObjectId(LastItemAdded)
                         //query = {_id:{$gt:startPointObject}};
                        query = { $and: [{ _id: {$gt:startPointObject}},{_id:{$lte:LastItemAddedObject}}]};

                        console.log("Map reduce Started");
                        db.collection('matches').mapReduce(mapFunction,reduceFunction,{out:{reduce:'GetMultiKills'},query:query,verbose:true},function(err,collection,stats){//finalize:finalize
                            if(err){return console.dir(err);}
                            console.log("Map-Reduce completed")
                            console.log(stats)
                            pointerCollection.findOneAndReplace({Process:'GetMultiKills'},{Process:'GetMultiKills', Location:LastItemAdded},{upsert:true},function(err,db){
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

    
});