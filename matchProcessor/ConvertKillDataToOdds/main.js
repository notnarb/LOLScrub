
var mongodb = require('mongodb');

function CalculateWinPercent(RawDataCollection,targetCollection){
    champIDs = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,48,50,51,53,54,55,56,57,58,59,60,61,62,63,64,67,68,69,72,74,75,76,77,78,79,80,81,82,83,84,85,86,89,90,91,92,96,98,99,101,102,103,104,105,106,107,110,111,112,113,114,115,117,119,120,121,122,126,127,131,133,134,143,150,154,157,161,201,222,236,238,254,266,267,268,412,421,429,432]
    
    champIDs.forEach(function(Champ1){
        champIDs.forEach(function(Champ2){
        
            //console.log(Champ1);
            //console.log(Champ2);
            Champ1KillsArray = GenerateSmoothArrays(RawDataCollection, Champ1, Champ2);
            Champ2KillsArray = GenerateSmoothArrays(RawDataCollection, Champ2, Champ1);
            var PercentChamp1KillsArray = new Array(50);
            var PercentChamp2KillsArray = new Array(50);
            for(i = 0; i < 50; i ++){ 
                PercentChamp1KillsArray[i] = Champ1KillsArray[i]/(Champ1KillsArray[i] + Champ2KillsArray[i]);
                PercentChamp2KillsArray[i] = Champ2KillsArray[i]/(Champ1KillsArray[i] + Champ2KillsArray[i]);
            }
        });
    });
    console.log("Returning fom calculate win percent");
}

function GenerateSmoothArrays(RawDataCollection, Champ1, Champ2){

    //console.log(Champ1);
    //console.log(Champ2);
    
    
    var SumKillVals = new Array(50);
    for(i = 0; i < 50; i ++){
        SumKillVals[i] = 0;
    }
    totalSum = 0;
    
    var SumKills = RawDataCollection.find().toArray(function (err,docs){
        if (err) {
			console.log(err);
            throw "something went wrong";
		} 
        
        docs.forEach( function(err,item){
        if(err){
            console.log(err);
            throw "something went wrong";
        }
        console.log("iter");
        var index = item['value']['MinuteMark'];
        SumKillVals[index] = item['value']['count'];
        totalSum += SumKillVals[index];
    } );
        
            
		});
    //console.log(SumKills.toString());
    //var SumKills = RawDataCollection.find({ "value" : { "KillerChampId" : Champ1, "VictimChampId" : Champ2}});//.sort('MinuteMark',1);
    //var temp = SumKills.next();
    //console.log(temp.toString())        



    
    
    if(totalSum > 0){
        console.log("SumKillVals");
        console.log(SumKillVals.toString());
    }
    
    var SmoothedKillVals = new Array(50);
    for(i = 0; i < 50; i ++){
        if (i < 3){
            SmoothedKillVals[i] = 0.333*SumKillVals[0] + 0.333*SumKillVals[1] + 0.333*SumKillVals[2];
        }
         if (i == 3){
            SmoothedKillVals[i] = 0.05*SumKillVals[0] + 0.10*SumKillVals[1] + 0.20*SumKillVals[2] + 0.30*SumKillVals[3] + 0.20*SumKillVals[4]+ 0.10*SumKillVals[5] + 0.05*SumKillVals[6];
        }
        if(i > 45){
        SmoothedKillVals[i] = totalSum/50;
        }
        else{
            SmoothedKillVals[i] = 0.04*SumKillVals[i-4] + 0.08*SumKillVals[i-3] + 0.12*SumKillVals[i-2] + 0.16*SumKillVals[i-1] + 0.20*SumKillVals[i]+ 0.16*SumKillVals[i+1] + 0.12*SumKillVals[i+2] + 0.08*SumKillVals[i+3] + 0.04*SumKillVals[i+4];
        }
    }
    if(totalSum > 0){
        console.log("SmoothedKillVals");
        console.log(SmoothedKillVals.toString());
    }
    return SmoothedKillVals;
}

var db;
mongodb.connect ('mongodb://mongo:27017/urfday',function(err,db){
    if  (err){return console.dir(err);}
    console.log("We are connected to the DB");
    var RawDataCollection = db.collection('killsPerTimeSlice');
    console.log(RawDataCollection.count());
    var targetCollection = db.collection('SoloKillPercentageOdds');
    targetCollection.drop();
    CalculateWinPercent(RawDataCollection,targetCollection);
    db.close();
    
});
