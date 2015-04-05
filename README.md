Collection of small services that together make up an entry to the Riot Games 4-2015 API challenge

# Description
T.B.D. what this will do in the end.  Currently just does a decent job of storing match information into a mongo db instance

# Example (how to run)
## Start a mongodb container

Note: I am naming this container 'urf2015db'.  This name is needed to link other containers to this database.  /mnt/hardly-know-er/Workspace/mongo/ is the persistant storage where mongo will store its database files.  This is important because otherwise you will lose your data between runs of the mongo container

> sudo docker run --name urf2015db -v /mnt/hardly-know-er/Workspace/mongo/:/data/db/ -d mongo

## Start riot api request proxy 'riot ambassador'

Riot ambassador acts as an ambassador between the riot API and the services which query it.  This acts as a rate limiter for the other services in addition to handling authentication

> cd riotAmbassador

Save your API key as a single string in a JSON array.

> echo ["<your-secret-key-here>"] > secretKeyList.json

Create the riot ambassador image

> sudo docker build -t riotambassador .

Run that newly created image.  Note: I am naming this container 'ambo' in this example

> sudo docker run -d --name ambo riotambassador

## Start the match get-er

use matchGetter to start obtaining match IDs

Note this requires both riot ambassador and a mongo db container running

> cd matchGetter

Build the image

> sudo docker build -t matchgetter .

Run the image linking the previously created 'urf2015db' as the mongo host and 'ambo' as the riotambassador host

> sudo docker run --link urf2015db:mongo --link ambo:riotambassador matchgetter

## Start the match lookup process

use matchLookup to start filling in the 'matches' collection by looking up the IDs found by matchgetter

Note this requires both riot ambassador and a mongo db container running

> cd matchlookup

Build the image

> sudo docker build -t matchlookup .

Run the image linking the previously created 'urf2015db' as the mongo host and 'ambo' as the riotambassador host

> sudo docker run --link urf2015db:mongo --link ambo:riotambassador matchlookup

# Quering the database

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
