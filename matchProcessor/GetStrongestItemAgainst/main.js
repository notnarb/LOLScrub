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

var reduceFunction = function (key, resultsList){

   var retval = {};
    resultsList.forEach(function (itemBuildMap){
        if(itemBuildMap == 'MostEffectiveItems' || itemBuildMap == 'ChampId' || itemBuildMap  =='MinuteMark'|| itemBuildMap  =='Lead'|| itemBuildMap  =='VictimId'){
            return;
        }
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
    return retval;
}

var finalize = function (key,ReducedValue){
    var res=key.split("-");
    var sortable = [];

    ReducedValue['ChampId']=res[0];
    ReducedValue['VictimId']=res[1];
    ReducedValue['MinuteMark']=res[2];
    ReducedValue['Lead']=res[3];

   for(var build in ReducedValue){
        if(build == 'MostEffectiveItems' || build == 'ChampId' || build  =='MinuteMark'|| build  =='Lead'|| build  =='VictimId'){
            continue;
        }
        sortable.push({'build':build,'Gross':ReducedValue[build]['Gross'],'Net':ReducedValue[build]['Net']});

    }

    if(res[3] == "Behind"){
        sortable.sort(function(a,b){return b.Gross - a.Gross});
        popularItems = sortable.slice(0,10)
        popularItems.sort(function(a,b){return b.Net - a.Net});
        ReducedValue['MostEffectiveItems']= popularItems.slice(0,6);
    }
    else{
        sortable.sort(function(a,b){return b.Net - a.Net});
        ReducedValue['MostEffectiveItems']= sortable.slice(0,6);
    }
    return(ReducedValue);//"MostPopularBuild":sortable[0]});

}



var db;
mongodb.connect ('mongodb://mongo:27017/urfday',function(err,db){
    if  (err){return console.dir(err);}



    function setNextLoop(){
        setTimeout(function(){
            var pointerCollection = db.collection('MapReducePointers');
            var startPoint;

            pointerCollection.find({Process:'BestItem'}).limit(1).toArray(function(err, docs) {
                if  (err){return console.dir(err);}

                if(docs.length){
                    console.log("Map reduce previously run. Incrementing ...");
                    startPoint = docs[0]['Location'];
                    console.log("Picking up where we stopped at item " + startPoint);
                }
                else{
                    db.collection('BestItemPerMinute').drop();
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
                        db.collection('totalKillCollection').mapReduce(mapFunction,reduceFunction,{out:{reduce:'BestItemPerMinute'},query:query,finalize:finalize,verbose:true},function(err,collection,stats){//finalize:finalize
                            if(err){return console.dir(err);}
                            console.log("Map-Reduce completed")
                            console.log(stats)
                            pointerCollection.findOneAndReplace({Process:'BestItem'},{Process:'BestItem', Location:LastItemAdded},{upsert:true},function(err,db){
                                if  (err){return console.dir(err);}
                                console.log("Updated Pointer of incremental map reduce to " + LastItemAdded)
                                setNextLoop()
                            });
                        });
                    });

            });
        },300000);
    }

    setNextLoop();



});