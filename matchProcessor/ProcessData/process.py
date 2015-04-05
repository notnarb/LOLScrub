__author__ = 'Ryan'
from pymongo import MongoClient
import sys;
import time;

print("running match processor");

client = MongoClient('mongo',27017)
db = client.urfday

#Should get this through API, Hard coded for now.
champIDs = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,48,50,51,53,54,55,56,57,58,59,60,61,62,63,64,67,68,69,72,74,75,76,77,78,79,80,81,82,83,84,85,86,89,90,91,92,96,98,99,101,102,103,104,105,106,107,110,111,112,113,114,115,117,119,120,121,122,126,127,131,133,134,143,150,154,157,161,201,222,236,238,254,266,267,268,412,421,429,432]

def setupPentaDB():
    print("Initializing pentakill Database");

    pentaKillCollection = db.pentaKillData
    pentaKillCollection.drop()
    for champID in champIDs:
        doc = {"championId":champID,"pentakillPct":-1}
        pentaKillCollection.update({"championId":champID},doc,True);
    return 0;


def CalculatePentaKillProbability():
    # need to implement incremental updates updates entire database currently



    #    Preserve working Call
    #    mapF = 'function () {this.participants.forEach(function (participant) {emit(participant.championId, {pentakills: participant.stats.pentaKills,numGames:1})})}'
    #    reduceF  = 'function (key, values) { var numPenta = 0; numGames = 0; for (var i = 0; i < values.length;i++){ var value = values[i]; numPenta+=value.pentakills; numGames+=value.numGames;} return {pentakills:numPenta,numGames:numGames}; }'

    print("Recomputing PentaKill Odds");

    # create the DB if it doesn't exist yet

    if 'pentaKillData' not in db.collection_names():
        setupPentaDB()
    pentaKillCollection = db.pentaKillData

    mapF = 'function () {this.participants.forEach(function (participant) {emit(participant.championId, {pentakills: participant.stats.pentaKills,numGames:1})})}'
    reduceF  = 'function (key, values) { var numPenta = 0; numGames = 0; for (var i = 0; i < values.length;i++){ var value = values[i]; numPenta+=value.pentakills; numGames+=value.numGames;} return {pentakills:numPenta,numGames:numGames}; }'
    result = db.matches.map_reduce(mapF,reduceF,"{out:{inline:1}}")#{out:{inline:1}})

    for doc in result.find():
        percent = (doc['value']['pentakills']/doc['value']['numGames'])* 100
        #print("champion" + str(doc['_id']) + "gets pentakills" + str(percent * 100) + " % of games");

        #print(pentaKillCollection.find({"championId":doc['_id']})[0]);
        newdoc = {"championId":doc['_id'],"pentakillPct":percent}
        pentaKillCollection.update( {"championId":doc['_id']},newdoc,True);

    if(pentaKillCollection.count() != len(champIDs)):
        raise Exception('WE_MISSED_A_CHAMP');


def initSoloKillRawDB():
    print("Initializing soloKillRawDB")
    soloKillCollection = db.soloKillData
    soloKillCollection.drop()
    for  champID in champIDs:
        for champIdEnemy in champIDs:
            doc = {'championId':champID,'enemyChampId':champIdEnemy,'timestamp0':0,'timestamp1':0,'timestamp2':0,'timestamp3':0,'timestamp4':0,'timestamp5':0,'timestamp6':0,'timestamp7':0,'timestamp8':0,'timestamp9':0,'timestamp10':0,'timestamp11':0,'timestamp12':0,'timestamp13':0,'timestamp14':0,'timestamp15':0,'timestamp16':0,'timestamp17':0,'timestamp18':0,'timestamp19':0,'timestamp20':0,'timestamp21':0,'timestamp22':0,'timestamp23':0,'timestamp24':0,'timestamp25':0,'timestamp26':0,'timestamp27':0,'timestamp28':0,'timestamp29':0,'timestamp30':0,'timestamp31':0,'timestamp32':0,'timestamp33':0,'timestamp34':0,'timestamp35':0,'timestamp36':0,'timestamp37':0,'timestamp38':0,'timestamp39':0,'timestamp40':0,'timestamp41':0,'timestamp42':0,'timestamp43':0,'timestamp44':0,'timestamp45':0,'timestamp46':0,'timestamp47':0,'timestamp48':0,'timestamp49':0,'timestamp50':0}
            soloKillCollection.insert(doc);



    return


def Find1v1s():





    print("Adding matches to our 1v1 Data");
    matchCollection = db.matches
    matchData = matchCollection.find()

    #initSoloKillRawDB();

    if 'soloKillData' not in db.collection_names():
        initSoloKillRawDB()
    soloKillCollection = db.soloKillData

    # Iterate every document in match collection
    for i in range (0,matchCollection.count()):

        if(i%10 == 0):
            sys.stdout.write("    " + str(i) +"/"+ str(matchCollection.count()) + " Matches Analyzed\r")
            sys.stdout.flush();




        participants = matchData[i]['participants']
        ParticipantIDs = [-1]*11;

        # Bind ParticipantIds to their respective Champions
        # Note Ids are 1-10, 0 is reserved for minions and should be left as -1 championId
        for j in range (0,len(participants)):

            ParticipantIDs[participants[j]['participantId']] = participants[j]['championId'];

        #print (ParticipantIDs)
        timeline = matchData[i]['timeline'];
        if(timeline['frameInterval'] != 60000):
            # throw an error, We don't expect data that isn't at 1 minute margins
            raise Exception('Wrong_Frame_Interval');

        #for ever frame in the game
        gameFrames = timeline['frames'];
        for j in range (0,len(gameFrames)):

            #Ignore super long games for now
            if j > 50:
                continue;

            try:
                events = gameFrames[j]['events']
            except KeyError:
                continue;

            #Every event in the Timeline
            for curEvent in events:


                if(curEvent['eventType'] == 'CHAMPION_KILL'):

                    try:
                        # If there is an assistant we don't use this data
                        assistants = curEvent['assistingParticipantIds']

                    except KeyError:
                        #This means solo Kill
                        killerPlayerId = curEvent['killerId']
                        victimPlayerId = curEvent['victimId']
                        #Killed by minions/Monster/Tower
                        if(killerPlayerId == 0):
                            continue;

                        killerChamp = ParticipantIDs[killerPlayerId]
                        victimChamp = ParticipantIDs[victimPlayerId]

                        #print( "champion " + str(killerChamp) + " solo killed " + str(victimChamp) + " at " + str(j)+ " minutes ");
                        soloKillCollection.update({"championId":killerChamp,"enemyChampId":victimChamp},{'$inc':{"timestamp" + str(j):1}});
                        #print(soloKillCollection.find({"championId":killerChamp,"enemyChampId":victimChamp})[0]);





def setupSoloDB():
    champIDs = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,48,50,51,53,54,55,56,57,58,59,60,61,62,63,64,67,68,69,72,74,75,76,77,78,79,80,81,82,83,84,85,86,89,90,91,92,96,98,99,101,102,103,104,105,106,107,110,111,112,113,114,115,117,119,120,121,122,126,127,131,133,134,143,150,154,157,161,201,222,236,238,254,266,267,268,412,421,429,432]
    soloKillCollection = db.soloKillData

    #soloKillCollection.insert(doc);

    return



#def updateStats():

   # pipeline = [
    #    {'$match':{_
    #    }}
    #]



def respond():
    if not request.json or not 'title' in request.json:
        abort(400)
    task={

    }
    tasks.append(task)
    return jsonify({'task':task}), 201





print("Processing Database - process.py")
CalculatePentaKillProbability()
Find1v1s()
