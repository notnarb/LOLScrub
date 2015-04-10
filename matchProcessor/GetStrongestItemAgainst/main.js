var mongodb = require('mongodb');


var map = function(){

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

    

    var KillerLead;
    var VictimLead;
    if(this.KillerGold > this.VictimGold + 1000){
        KillerLead = "Ahead";
        VictimLead = "Behind";
    }
    else if(this.KillerGold + 1000  < this.VictimGold ){
        KillerLead = "Behind";
        VictimLead = "Ahead";
    }
    else{
        KillerLead=VictimLead = "Equal";
    }
        
    var MinuteDivider = 0;
    var KillerKey = [this.KillerChampId,this.VictimChampId,this.MinuteMark,KillerLead].join("-");
    var VictimKey = [this.VictimChampId,this.KillerChampId,this.MinuteMark,VictimLead].join("-");
    //var killerKey = [this.KillerChampId,this.MinuteMark].join("-");//, this.minuteMark].join("-");
    //var victimKey = [this.VictimChampId,this.MinuteMark].join("-");

    var KillerItem = {};

    
    var KillerItems = Object.keys(this.KillerItems).filter(function ( item){
        // return true if 'item' is not in 'skippedItems' (==-1)
        return skippedItems.indexOf(item) === -1;
    })
    
    KillerItems.forEach(function(item){
        KillerItem[item] = {};
        KillerItem[item]['Gross'] = 1;
        KillerItem[item]['Net'] = 1;
    });
    

    var victimItem = {};
    
    var victimItems = Object.keys(this.VictimItems).filter(function ( item){
        // return true if 'item' is not in 'skippedItems' (==-1)
        return skippedItems.indexOf(item) === -1;
    })
    
    victimItems.forEach(function(item){
        victimItem[item] = {};
        victimItem[item]['Gross'] = 1;
        victimItem[item]['Net'] = -1;
    });

    emit(KillerKey, KillerItem);
    emit(VictimKey, victimItem);
};

var reduce = function (key, resultsList){
    var retval = {};
    resultsList.forEach(function (itemBuildMap){
    // go through each type of build within the build
        Object.keys(itemBuildMap).forEach(function (Item){
            //if retval doesn't container it already, intitialize it;
            if(!retval[Item]) {
                retval[Item] = {}
                retval[Item]['Gross'] = 0;
                retval[Item]['Net'] = 0;
            }
            retval[Item]['Gross'] += itemBuildMap[Item]['Gross'];
            retval[Item]['Net'] += itemBuildMap[Item]['Net'];
        });
    });
    return retval
}

var finalize = function (key,value){
    var res=key.split("-");
    var sortable = [];
    for(var key in obj){
        if(obj.hasOwnProperty(key)){
            var builds = obj[key];
            //console.log(val);
            for(build in builds){
                if(builds.hasOwnProperty(build)){
                    var ItemSet = builds[build]
                    sortable.push([builds,ItemSet]);
                }
            }
        }
    }
    sortable.sort(function(a,b){
        return b[1]-a[1]

    })

    return({"ChampId":res[0],"MinuteMark":res[1],"MostPopularBuild":sortable[0]});

}


db.BestItemPerMinute.drop();
db.totalKillCollection.mapReduce(map,reduce,{out:'BestItemPerMinute'});

var db;
mongodb.connect ('mongodb://mongo:27017/urfday',function(err,db){
    if  (err){return console.dir(err);}
    console.log("We are connected to the DB");
    db.collection('BestItemPerMinute').drop();
    db.collection('totalKillCollection').mapReduce(map,reduce,{out:'BestItemPerMinute'});//,finalize:finalize});
    console.log("Map reduce complete");
    return;

});