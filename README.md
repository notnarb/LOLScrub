LOLScrub - A "REAL" League player's companion - Riot Games 2015 API challenge

# Description
LOLScrub is a complete solution to aid League of Legends' true players.
We serve stats and analysis gosu League players care about... Its all about the Kills and the Glory!
We assure you victory in All-important 1v1s, help avoid those sneaky,nasty kill stealing "teammates", And aid in itemization for pentakills rather than for teamwork. (Who needs teammates, right?!)
	The best part?!
Its all in real time! Keep our app open while you play and we will serve real time up to the minute data about your game based on historic results.
It works on Phones, Tablets and Computers!

Give it a shot. Go to Lolscrub.notnarb.com!

#How to Compile & Run

First, setup an API Key

> cd riotAmbassador

Save your API key as a single string in a JSON array.

> echo ["<your-secret-key-here>"] > secretKeyList.json

##Backend


###Running with docker compose


1. Download docker-compose (I used 1.10)
2. 'docker-compose up' (See docker-compose.yml for what will be named what)
3. Make sure all services started with 'docker-compose ps'.  Currently some services will fail if they attempt to connect to the database while it is initializing 

Ideally, to be up and running you would only need one command...

> docker-compose up -d

However, we have disabled our collectors from running as background daemons as with no new URF match data coming they are an unneccessary waste of resources.
This has the unfortunate consequence of breaking some container dependencies when first trying to get setup
The rough flow of data goes as follows:

> MatchCollecter -> MatchLookup -> processMatchesIntoKillCollection -> OtherCollectors -> Process(odds/Ks) -> Webserver

If you run

> docker-compose up -d 

several times, you will eventually get setup, progressing through the above pipeline one stage at a time, until they all are populated.

###Manual Setup


Start a mongodb container


Note: I am naming this container 'urf2015db'.  This name is needed to link other containers to this database.  /mnt/hardly-know-er/Workspace/mongo/ is the persistant storage where mongo will store its database files.  This is important because otherwise you will lose your data between runs of the mongo container

> sudo docker run --name urf2015db -v /mnt/hardly-know-er/Workspace/mongo/:/data/db/ -d mongo


Create the riot ambassador image

> sudo docker build -t riotambassador .

Run that newly created image.  Note: I am naming this container 'ambo' in this example

> sudo docker run -d --name ambo riotambassador


### Quering the database

Looks a little silly, but here's a quick command to query the database to see if it's working

>$ sudo docker run -it --link urf2015db:mongo mongo mongo mongo/urfday
> MongoDB shell version: 3.0.1
> connecting to: mongo/urfday
> Welcome to the MongoDB shell.
> ...
> > db.matches.count()
> 54133
> >

run the 'mongo' container starting with the 'mongo' command and access the database at 'mongo/urfday' (mongo being the link set up between this instance and a container


##Frontend:

This information is contained in the frontend readme!


#Future Improvements / Features:
  Voice:
  In thinking of new ways to interact with our users without second displays or tablets, we are looking at adding voice commands into the application via 
  Web RTC endpoint.  A user could speak a command such as "Odds Annie" and we would dictate the current 1v1 odds against an enemy annie.
  This also has interesting implications in allowing the user to report in game data to us, such as whether they are ahead or behind.
  
  Overlay:
  Our data would be well served as an overlay ingame for users with no second device availalbe.  We could use overwolf to dynamically show our content, so long as it follows the Riot API TOS.
  
  Divide champs into AP/AD (Not enough Data in URF to be statistically relevant!):
  Many Champs can be built several ways. The primary divisions being AP or AD and sometimes AS/Onhit.  This often creates a completely different set of odds and counters for a champion as they play very differently.
  This also causes a currents strange issue with champions who are built both ways equally (such as AP ezreal in urf) as we will reccomend two items which are both strong, but would never actually built together (Rabadons/Infinity Edge)
  This could be implemented by dividing champions based on the items they have chosen by the endgame, and classifying champs in a current game based on their rune and mastery choices.  Currently we have no where near enough data points to be able to do this
  as some matchups are sparse enough.
  
  More advanced Item recommender:
  As mentioned in implementation seciton. Our current item reccomender is very simple.  It doesn't do advanced calculatins for reccomendation, and as such can definately be improved upon.  Finding a balance between popularity and effectiveness is difficult
  and may require some mathematical analysis.

  Ranked data:
  LOLScrub can easily handle ranked data just as it handles URF data, We would simply have to point the matchGetter in the right direction and we can begin serving users ranked game data.
  
  More UI Layouts:
  We currently support a few different layouts for phones, tablets and desktops depending on your device's resolution.  However perfecting this is a neverending process.  We recognize that not all devices will have an optimal use of space with the current layouts.
  
  Improve data efficiency:
  There are a lot of reasons our site uses too much data right now. But we don't have the time to fix them before the competition ends.  Ways include:
  Downsizing the timeline (we currently calculate through 50 minutes but only display 50)
  Pass timeline data as array instead of individual objects
  Sample item builds ever few minutes instead of every minute
  Do some simple calculations at the endpoint.
  
  Loading animations:
  Currently, Before you can fully use the site, we require users to download about 20Mb of data.  On slow connections this may take some time, and we don't have a way to indicate to the user that they are downloading information 
  in the background currently.  This is more of a QOL fix for end users on slow networks.  Most decent connections should have downloaded the required data by the time it needs to be presented.

  Cleanup and api naming
  We have lots of collectors collecting what appears to be similar data, making the container names difficult to follow.  The naming scheme is a little unclear, but due to time constraints cleaning up the backend and API are 
  not very high priority.







