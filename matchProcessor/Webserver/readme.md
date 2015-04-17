#Webserver

#Description
The webserver utilizes express to pass information from our database to our frontend node.  Objects in the database are stripped down of extraneous data before sending (in most cases we had time for).
The webserver accepts the following api calls:

##GET SoloKillOddsAgainstLead 
Pulls from collection: SoloKillPercentageOdds 
Sample output object: 429-432-15-ahead":{"0":20,"1":69,"2":20,"3":84,"4":89,
Output object number: numChamps*numChamps*50minutes *4 lead


G##ET SoloKillOddsAgainstOverall 
Pulls from collection: SoloKillPercentageOdds 
Sample output object: 429-15:{"0":20,"1":69,"2":20,"3":84,"4":89,
Output object number: numChamps*50minues

##GET MultiKills 
Pulls from collection: GetMultiKills 
Sample output object: "432":{"PentaRate":0,"QuadraRate":0,"TripleRate":0,"DoubleRate":1667}
Output object number: numChamps

##GET SnowballValue 
Pulls from collection: SnowballRating 
Sample output object: "1":5
Output object number: numChamps

##GET OverallKsRate 
Pulls from collection: GetOverallKsPerChamp 
Sample output object: "1":0.5553846
Output object number: numChamps

##GET SoloKillOddsOverall 
Pulls from collection: OverallKillOddsTime 
Sample output object: "98-5":50
Output object number: numChamps*numChamps
  
##GET KsOddsOverall 
Pulls from collection: GetOverallKSPerChampTime 
Sample output object: "99-29":0.16666666666666666
Output object number: numChamps * numChamps

##GET OverallSoloKillRate 
Pulls from collection: OverallKillOdds 
 Sample output object: "1":54
Output object number: numChamps

##GET BestItemsAgainst 
Pulls from collection: BestItemPerMinute 
Sample output object: "238-96-19-Ahead":[{"build":"3035","Gross":9,"Net":-9},{"build":"3065","Gross":9,"Net":-9},...
Output object number: numChamps * numChamps * 50 minutes

##GET ExpectedItems 
Pulls from collection: AverageItemBuildPerMinute 
Sample output object: "238-23":"1037-3035-3065-3074-3155-3265-3340"
Output object number: numChamps * 50 minutes

##GET KsOddsAgainst 
Pulls from collection: KsChancePerChampSmooth 
Sample output object: "429-432":{"0":20,"1":69,"2":20,"3":84,...
Output object number: numChamps * numChamps
