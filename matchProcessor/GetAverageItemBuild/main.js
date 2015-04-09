
var mongodb = require('mongodb');
function map(){



    // ANything with group containing "flasks", "relicBase" "ward" "potion"
    skippedItems = [
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
    2043, // pink ward
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
}

function reduce (key, resultsList){
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
    return retval
}

var finalize = function (key,value){
    var res=key.split("-");
    var sortable = [];
    for(var build in value)
        if(value.hasOwnProperty(build))
            sortable.push([build,value[build]]);

    sortable.sort(function(a,b){
        return b[1]-a[1]

    })



    return({"ChampId":res[0],"MinuteMark":res[1],"count":sortable[0]});

}
//db.AverageItemBuildPerMinute.drop();
//db.totalKillCollection.mapReduce(map,reduce,{out:'AverageItemBuildPerMinute'});

var db;
mongodb.connect ('mongodb://mongo:27017/urfday',function(err,db){
    if  (err){return console.dir(err);}
    console.log("We are connected to the DB");
    db.collection('AverageItemBuildPerMinute').drop();
    db.collection('totalKillCollection').mapReduce(map,reduce,{out:'AverageItemBuildPerMinute'});//,finalize:finalize});
    console.log("Map reduce complete");
    return;

});

