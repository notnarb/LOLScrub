

var mongodb = require('mongodb');
ObjectId = require('mongodb').ObjectID;

var mapFunction = function(){
        print("map test")
		//So what if in this instance you emit("121-26", {killsSecured:1}); emit("26-121": {killsStolen: 1})
		var KeyBase = [this.KillerChampId,this.MinuteMark].join("-");
		//var KeyBaseStealee = [this.KillerChampId,this.MinuteMark].join("-");
		///if (this.isSoloKill == true){
		//    return;
		//}
		for(var Assistant in this.AssistingChamps){
		    if(this.AssistingChamps.hasOwnProperty(Assistant)){
		        //print(Assistant);
		        emit(this.KillerChampId,{"KillsSecured":0,"KillsStolen":1});
			    emit(parseInt(Assistant),{"KillsSecured":1,"KillsStolen":0});
		    }
		}

		/*this.AssistingChamps.foreach(function (AssistChampId){
			 emit([AssistChampId,this.KillerChampId,this.MinuteMark],{"KillsStolen":1});
			 emit([this.KillerChampId,AssistChampId,this.MinuteMark],{"KillsSecured":1});
		});*/

}

var reduceFunction = function(key, value){
    var retval = {'KillsStolen':0,'KillsSecured':0};

   // retval.KillsStolen = Array.sum(value.KillsSecured);
    //retval.KillsSecured = Array.sum(value.KillsSecured);
    retval['KillsStolen'] = 0;
	retval['KillsSecured'] = 0;
    value.forEach(function (Match){
    // go through each type of build within the build
        retval['KillsStolen'] += Match['KillsStolen'];
	    retval['KillsSecured'] += Match['KillsSecured'];
    });

    return retval;
}
function finalize (key,value){
    Odds = value['KillsStolen']/(value['KillsSecured']  + value['KillsStolen']);
    return({"KillsStolen":value['KillsStolen'],"KillsSecured":value['KillsSecured'],"Odds":Odds});

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

            pointerCollection.find({Process:'GetOverallKSPerChamp'}).limit(1).toArray(function(err, docs) {
                if  (err){return console.dir(err);}

                if(docs.length){
                    console.log("Map reduce previously run. Incrementing ...");
                    startPoint = docs[0]['Location'];
                    console.log("Picking up where we stopped at item " + startPoint);
                }
                else{
                    db.collection('GetOverallKSPerChamp').drop();
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
                        db.collection('totalKillCollection').mapReduce(mapFunction,reduceFunction,{out:{reduce:'GetOverallKSPerChamp'},finalize:finalize,query:query,verbose:true},function(err,collection,stats){//finalize:finalize
                            if(err){return console.dir(err);}
                            console.log("Map-Reduce completed")
                            console.log(stats)
                            pointerCollection.findOneAndReplace({Process:'GetOverallKSPerChamp'},{Process:'GetOverallKSPerChamp', Location:LastItemAdded},{upsert:true},function(err,db){
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