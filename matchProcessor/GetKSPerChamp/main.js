

var mongodb = require('mongodb');

function map(){
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
		        emit([Assistant,this.KillerChampId,this.MinuteMark].join("-"),{"KillsSecured":0,"KillsStolen":1});
			    emit([this.KillerChampId,Assistant,this.MinuteMark].join("-"),{"KillsSecured":1,"KillsStolen":0});
		    }
		}

		/*this.AssistingChamps.foreach(function (AssistChampId){
			 emit([AssistChampId,this.KillerChampId,this.MinuteMark],{"KillsStolen":1});
			 emit([this.KillerChampId,AssistChampId,this.MinuteMark],{"KillsSecured":1});
		});*/

}

function reduce(key, value){
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
    var res=key.split("-");
    Odds = value['KillsStolen']/(value['KillsSecured']  + value['KillsStolen']);
    return({"ChampId":res[0],"KSChampId":res[1],"MinuteMark":res[2],"Odds":Odds});

}

db.KsChancePerChamp.drop();
db.totalKillCollection.mapReduce(map,reduce,{out:'KsChancePerChamp',finalize:finalize});


var db;
mongodb.connect ('mongodb://mongo:27017/urfday',function(err,db){
    if  (err){return console.dir(err);}
    console.log("We are connected to the DB");
    db.collection('KsChancePerChamp').drop();
    db.collection('totalKillCollection').mapReduce(mapFunction,reduceFunction,{out:'KsChampPerChamp',finalize:finalize});
    console.log("Map reduce complete");
    return;
    
});