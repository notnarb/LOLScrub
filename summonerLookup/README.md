# Description

RESTful server to lookup and return information about summoners.  Caches results found for later

# Commands

(all requests ignore GET/POST/etc types)

### /getid/{summonerName}
Gets the id for the specific summoner name

e.g.
curl summonerlookup:8000/getid/quickdrawmclawl && echo ""
{"id":19467746}

### /currentmatch/{summonerName}
TODO: not yet implemented
Returns current match information for the user as returned by /observer-mode/rest/consumer/getSpectatorGameInfo/{platformId}/{summonerId}.  North american region is assumed.
