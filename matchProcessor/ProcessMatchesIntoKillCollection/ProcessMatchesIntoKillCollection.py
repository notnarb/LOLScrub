__author__ = 'Ryan'
import time;
import sys;
from pymongo import MongoClient

print("Processing Matches into Kill Collection");

client = MongoClient('mongo',27017)
db = client.urfday

def processMatchesIntoKillCollection():
    print("Adding matches to our kill Collection")
    matchCollection = db.matches
    KillCollection=db.totalKillCollection
    ProcessMatchCursor=db.ProcessMatchCursor;
    try:
        idToStart = ProcessMatchCursor.find()[0]['LastRun']
        idToStart = matchCollection.find().sort('_id',1)[0]['_id']
        matchIdToDelete = matchCollection.find({'_id':idToStart})[0]['matchId']
        print("Deleting match ID " + str(matchIdToDelete) + " for being incomplete ")
        KillCollection.remove({'MatchId':matchIdToDelete})
    except:
        KillCollection.drop()
        print("We have not processed any games, starting from the beginning!");
        idToStart = matchCollection.find().sort('_id',1)[0]['_id']
        print("New starting _id is " + str(idToStart));



    matchCursor = matchCollection.find({'_id':{'$gte':idToStart}}).sort('_id',1)
    #matchCursor.add_option(2)



    print("Resuming procssing at ID " + str(idToStart) )
    #for i in range(0,matchCollection.count()):
    i = 0;
    while matchCursor.alive:
        i = i + 1
        try:
            matchData = matchCursor.next()
        except StopIteration:
            #print("Nothing else to be done, sleeping")
            time.sleep(1);
            i = i -1
            continue;

        nextID = matchData['_id']
        #print("NEXTID is " + str(nextID))
        #except:
        #    print("Nothing else to be done, sleeping")
        #    time.sleep(100);
        #    i = i -1

         #   continue;
        print ("Saving ID " + str(nextID))
        ProcessMatchCursor.drop();
        ProcessMatchCursor.insert({'LastRun':nextID})


        if(i%10 == 0):
            sys.stdout.write("    " + str(KillCollection.count()) +"/"+ str(matchCollection.count()) + " Matches Analyzed\r")
            if(i%100 != 0):
                sys.stdout.flush()



        matchId = matchData['matchId']
        #print(matchData[i]['matchId'])
        participants = matchData['participants']
        ParticipantIDs = [-1]*11
        LastSeasonRankFromIDs = [-1]*11

        # Bind ParticipantIds to their respective Champions
        # Note Ids are 1-10, 0 is reserved for minions and should be left as -1 championId
        for j in range (0,len(participants)):

            ParticipantIDs[participants[j]['participantId']] = participants[j]['championId']
            LastSeasonRankFromIDs[participants[j]['participantId']] = participants[j]['highestAchievedSeasonTier']

        #print (ParticipantIDs)
        try:
            timeline = matchData['timeline']
            if(timeline['frameInterval'] != 60000):
                # throw an error, We don't expect data that isn't at 1 minute margins
                raise Exception('Wrong_Frame_Interval')

            #for every frame in the game
            gameFrames = timeline['frames']
        except:
            break;

        PlayerItems = [];
        for item in range(0,11):
            ItemList = []
            PlayerItems.append(ItemList)

        for minute in range(0,len(gameFrames)):
            #print("PLayer items at " + str(minute) + " minutes is")
            #print(PlayerItems)
            #Ignore super long games for now
            if minute > 50:
                continue

            try:
                events = gameFrames[minute]['events']
            except KeyError:
                continue

            #Every event in the Timeline
           # print (events)


            for curEvent in events:


                #2003 is health pot
                if(curEvent['eventType'] == 'ITEM_PURCHASED'):

                    participantId = curEvent['participantId']
                    itemID = curEvent['itemId']
                    #print(str(itemID) + " was purchased inventory is now")
                    PlayerItems[participantId].append(itemID)
                    #print(PlayerItems[participantId])

                if(curEvent['eventType'] == 'ITEM_DESTROYED'):
                    participantId = curEvent['participantId']
                    itemID = curEvent['itemId']
                   # print(matchData[i]['matchId'])
                    #print(str(itemID) + " was Destroyed inventory was ")
                   # print(PlayerItems[participantId])
                    if itemID ==1501:
                        continue
                    try:
                        PlayerItems[participantId].remove(itemID)
                    except ValueError:
                        pass
                       # print("Item Destroyed NOT SURE WHY THIS HAPPENS");

                if(curEvent['eventType'] == 'ITEM_SOLD'):
                    participantId = curEvent['participantId']
                    itemID = curEvent['itemId']
                    try:
                        PlayerItems[participantId].remove(itemID)
                    except ValueError:
                        pass
                        #print("ITEM Sold Shouldn't HAPPEN BUT DOES")

                if(curEvent['eventType'] == 'ITEM_UNDO'):
                    participantId = curEvent['participantId']
                    itemBefore = curEvent['itemBefore']
                    itemAfter = curEvent['itemAfter']
                   # print("ITEM UNDO CALLED. ITEM BEFORE = " + str(itemBefore) + " Item after = " + str(itemAfter))
                    #print("Current Items are ")
                   #print(PlayerItems[participantId])

                    if itemBefore != 0:
                        try:
                            PlayerItems[participantId].remove(itemBefore)
                        except ValueError:
                            pass
                            #print("ITEM UNDO Shouldn't HAPPEN BUT DOES")

                    if itemAfter != 0:
                        PlayerItems[participantId].append(itemAfter)

                if(curEvent['eventType'] == 'SKILL_LEVEL_UP'):
                    participantId = curEvent['participantId']
                    #itemID = curEvent['itemId']
                    #PlayerItems[participantId].remove(itemID);


                if(curEvent['eventType'] == 'CHAMPION_KILL'):

                    isSoloKill = False
                    AssistingChamps = {}
                    try:
                        # If there is an assistant we don't use this data
                        assistants = curEvent['assistingParticipantIds']

                        for assistChampId in assistants:
                            AssistingChamps[str(ParticipantIDs[assistChampId])] = 1



                    except KeyError:
                        #This means solo Kill
						isSoloKill = True

                    killerPlayerId = curEvent['killerId']
                    victimPlayerId = curEvent['victimId']
                    #Killed by minions/Monster/Tower
                    if(killerPlayerId == 0):
                        continue

                    killerChampId = ParticipantIDs[killerPlayerId]
                    victimChampId = ParticipantIDs[victimPlayerId]

                    killerRank = LastSeasonRankFromIDs[killerPlayerId]
                    victimRank = LastSeasonRankFromIDs[victimPlayerId]

                    participantFrames = gameFrames[minute]['participantFrames']
                    killerGold = participantFrames[str(killerPlayerId)]['totalGold']
                    victimGold = participantFrames[str(victimPlayerId)]['totalGold']


                    KillerItems = {}
                    for k in range (len(PlayerItems[killerPlayerId])):
                        KillerItems[str(PlayerItems[killerPlayerId][k])] = 1

                    VictimItems = {}
                    for k in range (len(PlayerItems[victimPlayerId])):
                        VictimItems[str(PlayerItems[victimPlayerId][k])] = 1


                    killerLevel = participantFrames[str(killerPlayerId)]['level']
                    victimLevel =  participantFrames[str(victimPlayerId)]['level']

                    #locX = curEvent['position']['x']
                    #locY = curEvent['position']['y']

                    doc ={'KillerChampId':killerChampId,'VictimChampId':victimChampId,'AssistingChamps':AssistingChamps,'MinuteMark':minute,'KillerItems':KillerItems,'VictimItems':VictimItems,'isSoloKill':isSoloKill,'KillerGold':killerGold,'VictimGold':victimGold,'KillerLevel':killerLevel,'VictimLevel':victimLevel,'Location':curEvent['position'],'KillerRank':killerRank,'VictimRank':victimRank,'MatchId':matchId}
                    #print(doc);
                    KillCollection.insert(doc)
                    #print(soloKillCollection.find({"championId":killerChamp,"enemyChampId":victimChamp})[0]);


while(1):
    processMatchesIntoKillCollection()
    print("sleeping now")
    time.sleep(300)