Match Processing

#Description

We perform a variety of tasks on the matches collection, depending on the output we would like.
Much of this could be done more efficient, and using less collections, and should be cleaned up in the future.
Each of these tasks was designed to be run as a daemon, constantly updating the database as the match collection grew.
The daemon functionality has been disabled temporarily as no new URF matches are coming in,
and it is a waste of resources to poll for data that isn't going to change.

##Webserver API
Functions in Webserver Readme


##Processtokillcollection
The Primary processing of match data we do is processing each kill in each match into its own json object.  This "killcollector" as known by docker-compose takes each Champion kill event in a match, and records relevant data
such as ChampID VictimID ChampItems VictimItems.....
an example of the output structure follows:
	Code Directory:
	ProcessMatchesIntoKillCollection
	Sample Input:		TODO
	Input Collection:	TODO
	Sample Output:		TODO
	Output Collection:	TODO
	  
	This output is saved into a totalkillcollection, which is used for the majority of our other collectors.
	
	
##Collectors/Calculators
Most of the collectors are node.js scripts which will continually perform incremental map reduce calls, updating their output collection.
The incremental reduce is done by creating a collection MapReducePointers and saving objects with the corresponding process name
and the mongo _id of the last item it has processed. In this way we do not have to perform
a map reduce over the entire collection each time a new match is added.  
(This feature has been temporarily disabled for all collectors as no new games URF data is coming in)
	  
##Odds Collector:

converts objects to a new KillsPerTimeSlice Collection.  These objects contain the Kills that each champion gets in each one on one matchup at each slice one minute interval.  Furthermore 
this data is sub divided into a "Lead" variable.  If the killing champ is 1000 gold ahead of the victim they are considered "ahead". within 1000 gold they are equal. And if they have 1000 gold less than the
victim they are considered "behind"  A fourth Lead variable is also output "Overall" which is the sum of the lead ahead and behind values for each time slice.

		 Code Directory:	 GetMatchupOdds
		 Sample Input:		 TODO
		 Input Collection:	 totalkillcollection
		 Sample Output:		 TODO
		 Output Collection:	 KillsPerTimeSlice
		 
		 
##Odds Calculator

The python script performs data smoothing, odds calculation and conversion to arrays.
First we perform smoothing across the timeline for each set of data.  This is done using a smoothing kernel which we have changed a few times, its easier to just look at the code.
Initial attempts We attempted to perform a polynomial regression fit, but it quickly became obvious that the data would not fit easily into any model.
Smoothing helps our graphs not vary to wildly on matchups we have next to no data about (cassiopia vs aatrox)
The final portion of our smoothing is to add a linear damping factor to all data, this way our data is not too affected by local maxima and minima that are resultant of having not a large amount of data.
Our damping factor is calculated as .8(Current odds at this time) *.2( Average Odds over entire timeline)

		 Code Directory:	ConvertKillDataToOdds
		 Sample Input: 		TODO
		 Input Collection:	KillsPerTimeSlice
		 Sample Output:		TODO
		 Output Collection:	SoloKillPercentageOdds
##SmoothKsData
data uses the exact same algorithm as the odds calculator, We initially thought we wouldn't need to smooth this data as we would have enough datapoints, however we soon realized that was incorrect
as some champions simply aren't paired together often enough.

	Code Directory:	SmoothKS
	Sample Input:		TODO
	Input Collection:	TODO
	Sample output		TODO
	Output Collection	TODO
	
##AvgItemCollector
The script inperforms a map reduce across the total kill collection data, and finds all datapoints for every champion (kill or death) and records their entire build combination 
(less consumables and trinkets)The most common combinations are recorded and output.In this way this outputs a "Mode" or most often occuring item build for any given champ at any given time.

	Code Directory:		GetAverageItemBuild
	Sample Input:		TODO
	Input Collection:	TODO
	Sample output		TODO
	Output Collection	TODO


##KsCollector
 Outputs the number of times a champion when taking down an enemy with help, records a kill or an asisst with any given ally over any unit time.
 Simply put the output is the chance champ X has of securing a kill instead of an assist if champ X and champ Y are both attacking the same target.
 
	Code Directory:
	Sample Input:		TODO
	Input Collection:	TODO
	Sample output		TODO
	Output Collection	TODO

##MutliKillCollector

 Outputs the odds that a specific champion will score each of the following in any given game: pentakill, quadrakill, triplekill, doublekill
 
	Code Directory:		GetMultiKills
	Sample Input:		TODO
	Input Collection:	TODO
	Sample output:		TODO
	Output Collection:	TODO


##OverallKsOddsCollector

Performs incremental map reduce and outputs the single number that recommends the total overall odds of a champion securing a kill, vs simply getting an assist when attacking a contested enemy.
 
	Code Directory:		GetOverallKsPerChamp
	Sample Input:		TODO
	Input Collection:	TODO
	Sample output		TODO
	Output Collection	TODO


##OverallKSGraphCollector

Performs incremental map reduce and outputs the overall odds of a champion securing a kill, vs simply getting an assist when attacking a contested enemy, over time.

	Code Directory:			GetOverallKsPerChampTime
	Sample Input:	TODO
	Input Collection:		TODO
	Sample output:	TODO
	Output Collection		TODO
	
##OverallMatchupOddsCollector

 Performs Incremental map reduce and outputs the single number odds every champ has of winning a 1v1 vs an unknown enemy.
 
	Code Directory:	GetOverallMatchupOdds
	Sample Input object:	TODO
	Input Collection:		TODO
	Sample output object:	TODO
	Output Collection		TODO

##OverallMatchupGraphCollector
 
Performs Incremental map reduce and outputs the odds every champ has of winning a 1v1 vs an unknown enemy over time.

	Code Directory:		GetOverallMatchupOddsTime
	Sample Input object:	TODO
	Input Collection:		TODO
	Sample output object:	TODO
	Output Collection		TODO

##snowballCollector

 Performs Incremental map reduce and quantifies the "snowballyness" of a champion by comparing their solo kill winning rate when ahead vs their solo kill winning rate when equal.
 Note* We use the rate when ahead and equal as it appears in urf that you snowball more negatively than positively! It caused champions like soraka to be the most snowbally even with
 TERRIBLE overall K/D ratios simply because their K/D ratio when behind was that much worse.
 
 
	Code Directory:		GetSnowballRating
	Sample Input object:	TODO
	Input Collection:		TODO
	Sample output object:	TODO
	Output Collection		TODO

##itemmatchupCollector

 Performs Incremental map reduce and finds the items that result in the highest solo kill win rate per champion matchup over time.
 This is calculated as follows: When ahead or equal we sort items by net kills. (Kills when have - Deaths when have item)
 When behind: in order to not select items that are used once, but got lucky, we first sort by the items used the most (gross), select the top 15 most popular items.
 Then we sort these by their net kills.So this effectively returns the most effective of the 10 most popular items on a given champ.
 This ultimately returns what we determine to be the strongest 6 items per matchup over time.
 
 *This algorithm can be greatly improved upon as it favors popular items even if not the actual most effective, but due to time constraints this quick and dirty calculation will work
 
	Code Directory:		GetStrongestItemAgainst
	Sample Input object:	TODO
	Input Collection:		TODO
	Sample output object:	TODO
	Output Collection		TODO
