__author__ = 'Ryan'
from pymongo import MongoClient
import sys;
import scipy;
import matplotlib.pyplot as plt;
import numpy;
import time;

print("running match processor");

client = MongoClient('mongo',27017)
db = client.urfday

#Should get this through API, Hard coded for now.
champIDs = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38,39,40,41,42,43,44,45,48,50,51,53,54,55,56,57,58,59,60,61,62,63,64,67,68,69,72,74,75,76,77,78,79,80,81,82,83,84,85,86,89,90,91,92,96,98,99,101,102,103,104,105,106,107,110,111,112,113,114,115,117,119,120,121,122,126,127,131,133,134,143,150,154,157,161,201,222,236,238,254,266,267,268,412,421,429,432]




def computeSoloKillOddsFromRawData():
    print("Computing Solo Kill odds from Raw Data");
    rawDataCollection = db.killsPerTimeSlice
    OutputCollection = db.SoloKillPercentageOdds
    OutputCollection.drop()
    #Timeline = numpy.array([-1]*50);
    MapChampOdds = []
    print(str(len(champIDs)))
    for x in range(0,len(champIDs)):

        Champions = []
        MapChampOdds.append( Champions )
        for y in range(0,len(champIDs)):
            Enemies = []
            MapChampOdds[x].append( Enemies)
            #Timeline = numpy.array([0]*50)
            for z in range(0,50):
                MapChampOdds[x][y].append(0)
            
    KillCursor = rawDataCollection.find()
    i = 0
    for x in range (0,rawDataCollection.count()):
        KillData = KillCursor[x]
        KillerId  = int(KillData['value']['KillerChampId'])
        VictimId  = int(KillData['value']['VictimChampId'])
        MinuteMark  = int(KillData['value']['MinuteMark'])
        Count  = KillData['value']['count']

        #print(str(KillerId))

        KillerIdIndex = champIDs.index(KillerId)
        VictimIdIndex = champIDs.index(VictimId)

       # print("KillerIdIndex is " + str(KillerIdIndex) + " VictimIdIndex is " + str(VictimIdIndex) + " Minute is " + str(MinuteMark))
        #print(MapChampOdds[KillerIdIndex][VictimIdIndex]);
        #print(" sizeof Mapchampodds is " + str(len(MapChampOdds)) + " sizeof Mapchampodds[killerID] is " + str(len(MapChampOdds[KillerIdIndex])) + " sizeof Mapchampodds[killer][victim] is " + str(len(MapChampOdds[KillerIdIndex][VictimIdIndex])) )
        MapChampOdds[KillerIdIndex][VictimIdIndex][MinuteMark] = Count
        i = i +1
    print("Added Kill data for " + str(i) + " datapoints")
    for x in range(0,len(champIDs)):
        for y in range(x,len(champIDs)):
            #
            itemToAddX = {'KillerId':champIDs[x],'VictimId':champIDs[y]}
            itemToAddY = {'KillerId':champIDs[y],'VictimId':champIDs[x]}
            #

            SmoothArrayChampX = SmoothArray(MapChampOdds[x][y]);
            SmoothArrayChampY = SmoothArray(MapChampOdds[y][x]);

            timestampsX = {}
            timestampsY = {}

            for i in range (0,50):
                if((SmoothArrayChampX[i] + SmoothArrayChampY[i]) == 0):
                    sumX = numpy.sum(SmoothArrayChampX)
                    sumY = numpy.sum(SmoothArrayChampY)
                    if(sumX == 0 or sumY == 0):
                        timestampsX[str(i)] = .50
                        timestampsY[str(i)] = .50
                    else:
                        timestampsX[str(i)] = sumX / (sumX + sumY)
                        timestampsY[str(i)] = sumY / (sumX + sumY)

                else:
                    timestampsX[str(i)] = SmoothArrayChampX[i]/(SmoothArrayChampX[i] + SmoothArrayChampY[i])
                    timestampsY[str(i)] = SmoothArrayChampY[i]/(SmoothArrayChampX[i] + SmoothArrayChampY[i])

            itemToAddX['Minute'] = timestampsX
            itemToAddY['Minute'] = timestampsY

            #print(itemToAddX)
            #print(itemToAddY)
           # if (output):
                #print(SumKillVals)
                #print(SmoothedKillVals)
                #print(itemToAdd)
            OutputCollection.insert(itemToAddX)
            OutputCollection.insert(itemToAddY)
    print(OutputCollection.count())


def SmoothArray(SumKillVals):
    SmoothedKillVals = numpy.array([0.0]*50)
    #SumKillVals = MapChampOdds[x][y]
    output = False
    #print(SumKillVals)
    timestamps = {}
    sum = numpy.sum(SumKillVals)
    for i in range (0,50):
        if (i < 3):
            SmoothedKillVals[i] = 0.333*SumKillVals[0] + 0.333*SumKillVals[1] + 0.333*SumKillVals[2]

        elif (i == 3):
            SmoothedKillVals[i] = 0.05*SumKillVals[0] + 0.10*SumKillVals[1] + 0.20*SumKillVals[2] + 0.30*SumKillVals[3] + 0.20*SumKillVals[4]+ 0.10*SumKillVals[5] + 0.05*SumKillVals[6]

        elif(i > 45):
            SmoothedKillVals[i] = sum/50

        else:
            SmoothedKillVals[i] = 0.04*SumKillVals[i-4] + 0.08*SumKillVals[i-3] + 0.12*SumKillVals[i-2] + 0.16*SumKillVals[i-1] + 0.20*SumKillVals[i]+ 0.16*SumKillVals[i+1] + 0.12*SumKillVals[i+2] + 0.08*SumKillVals[i+3] + 0.04*SumKillVals[i+4];

        SmoothedKillVals[i] = SmoothedKillVals[i] * 0.8 + 0.2 * sum/50
    return SmoothedKillVals;



print("Processing Database - process.py")
computeSoloKillOddsFromRawData()


#setupPentaDB()

#this takes a minute or two
#CalculatePentaKillProbability()

#this is hard coded into Find1v1s
#initSoloKillRawDB();

#this takes forever to run
#Find1v1s()

## this is what youll want to run
#computeSoloKillOddsFromRawData()