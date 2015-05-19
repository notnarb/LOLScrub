# Match Distribute

Handles the distribution of fresh match data, listening to the new-match-data queue and distributing the matches elsewhere

Sends the data to:
* matches-to-store queue - puts them in a queue to be permanently perisisted to disk later
* new-summoner queue - parses the summoners out of the match data and sends {matchId, summonerId} pairs to the new-summoner queue
* new-live-match queue - sneds the matches to the live-data queue to add it to the stats
