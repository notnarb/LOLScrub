

function map(){
    var killerKey = this.KillerChampId;//, this.minuteMark].join("-");
    var victimKey = this.VictimChampId;
    
    
    // ANything with group containing "flasks", "relicBase" "ward" "potion"
    skippedItems[
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
    ]
    var killerValue = Ojbect.keys(this.KillerItems).filter(function ( item){
        // return true if 'item' is not in 'skippedItems' (==-1)
        return skippedItems.indexOf(item) === -1;
    }).sort(function(a,b){
        return a - b;
    }).join("-");
    
    var killerValue = Ojbect.keys(this.VictimItems).filter(function ( item){
        return skippedItems.indexOf(item) === -1;
    }).sort(function(a,b){
        return a - b;
    }).join("-");
    
    var killerRetVal = {};
    var victimRetval = {};
    
    killerRetval[killerValue] = 1;
    victimRetval[victimValue] = 1;
    
    this.emit(killerKey, killerRetval);
    this.emit(victimKey, victimRetval);
}

function reduce (key, resultsList){
    var retval = {};
    resultList.forEach(function (itemBuildMap){
    // go through each type of build within the build
        Object.keys(itemBuildMap).forEach(function (buildId){
            //if retval doesn't container it already, intitialize it;
            if(!retval[buildId]) {
                retval[buildId] = 0;
            }
            retval[buildId] += itemBuildMap[buildId];
        });
    });
    return
}
    