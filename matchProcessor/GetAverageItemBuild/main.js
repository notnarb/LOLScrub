
var mongodb = require('mongodb');
ObjectId = require('mongodb').ObjectID;

var mapFunction = function(){

    // ANything with group containing "flasks", "relicBase" "ward" "potion"
    var skippedItems = [
    3361, // Greater Stealth Totem
    3362, // Greater Vision Totem
    3363, // Farsight Orb
    3364, // Oracle's Lens
    3340, // Warding Totem
    3342, // Scrying Orb
    3341, // Sweeping Lens
    3345, // Soul Anchor
    2009, // total biscuit rejuv
    2004, // Mana Potion
    2003, // Health Potion
    2010, // total biscuit rejuv
    2140, // exlixer wrath
    2138, // Elixer of Iron
    2139, // Elixer of sorcery
    2137, // elixer of ruin
    2054, // diet poro
    2050, // Explorer's ward
    2047, // oracle's extract
    2044, // stealth ward
    2043 // pink ward
    ];

    var killerKey = [this.KillerChampId,this.MinuteMark].join("-");//, this.minuteMark].join("-");
    var victimKey = [this.VictimChampId,this.MinuteMark].join("-");

    var killerValue = Object.keys(this.KillerItems).filter(function ( item){
        // return true if 'item' is not in 'skippedItems' (==-1)
        return skippedItems.indexOf(item) === -1;
    }).sort(function(a,b){
        return a - b;
    }).join("-");

    var victimValue = Object.keys(this.VictimItems).filter(function ( item){
        return skippedItems.indexOf(item) === -1;
    }).sort(function(a,b){
        return a - b;
    }).join("-");

    var killerRetVal = {};
    var victimRetVal = {};

    killerRetVal[killerValue] = 1;
    victimRetVal[victimValue] = 1;

    emit(killerKey, killerRetVal);
    emit(victimKey, victimRetVal);
};

var reduceFunction = function (key, resultsList){

    var retval = {};
    resultsList.forEach(function (itemBuildMap){
    // go through each type of build within the build
        Object.keys(itemBuildMap).forEach(function (buildId){
            //if retval doesn't container it already, intitialize it;
            if(!retval[buildId]) {
                retval[buildId] = 0;
            }
            retval[buildId] += itemBuildMap[buildId];
        });
    });
    return retval;
};

function finalize (key,value){
    var res=key.split("-");
    var retval = {"ChampId":res[0],"MinuteMark":res[1]};
    var sortable = [];
    for(var build in value){
        retval[build] = value[build];
        sortable.push([build,value[build]]);

    }
    sortable.sort(function(a,b){return b[1] - a[1]});
    retval['TopBuild'] = sortable[0];

    return(retval);

}



var db;
mongodb.connect ('mongodb://mongo:27017/urfday',function(err,db){

    if  (err){return console.dir(err);}



    function setNextLoop(){
        setTimeout(function(){
            var pointerCollection = db.collection('MapReducePointers');
            var startPoint;

            pointerCollection.find({Process:'AvgItemBuild'}).limit(1).toArray(function(err, docs) {
                if  (err){return console.dir(err);}

                if(docs.length){
                    console.log("Map reduce previously run. Incrementing ...");
                    startPoint = docs[0]['Location'];
                    console.log("Picking up where we stopped at item " + startPoint);
                }
                else{
                    db.collection('AverageItemBuildPerMinute').drop();
                    console.log("Never Run before, Starting The DB fresh");
                    startPoint = 0;
                }

                pointerCollection.insert({Process:'AvgItemBuild',KillsToOdds:startPoint},function(err,result){
                    if  (err){return console.dir(err);}

                    db.collection('totalKillCollection').find().sort({_id:-1}).limit(1).toArray(function(err, lastItem) {
                        if  (err){return console.dir(err);}

                        var LastItemAdded = lastItem[0]['_id'];

                        console.log("Looking for items between " + startPoint + " and " + LastItemAdded);

                        var startPointObject = new ObjectId(startPoint);
                        var LastItemAddedObject = new ObjectId(LastItemAdded)
                         //query = {_id:{$gt:startPointObject}};
                        query = { $and: [{ _id: {$gt:startPointObject}},{_id:{$lte:LastItemAddedObject}}]};

                        console.log("Map reduce Started");
                        db.collection('totalKillCollection').mapReduce(mapFunction,reduceFunction,{out:{reduce:'AverageItemBuildPerMinute'},finalize:finalize,query:query,verbose:true},function(err,collection,stats){//finalize:finalize
                            if(err){return console.dir(err);}
                            console.log("Map-Reduce completed")
                            console.log(stats)
                            db.collection('MapReducePointers').findOneAndUpdate({Process:'AvgItemBuild'},{Process:'AvgItemBuild', Location:LastItemAdded},function(err,db){
                                if  (err){return console.dir(err);}
                                console.log("Updated Pointer of incremental map reduce to " + LastItemAdded)
                                setNextLoop()
                            });
                        });
                    });
                });
            });
        },300000);
    }

    setNextLoop();


});

    //var sortable = [];
    /*for(var build in value){
        sortable.push([build,value[build]]);

    }*/
    //sortable.sort(function(a,b){return b[1] - a[1]});
   // var topBuild = sortable[0];
