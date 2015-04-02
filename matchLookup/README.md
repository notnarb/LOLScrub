# Description
Match lookup for the 2015 Riot Games URF API challenge.  This service does a lookup on a stored list of match IDs and stores the infor for each match

# Dependencies
This service communicates with a passwordless mongodb database accessible at the hostname "mongo".  Current use of this is to set up a mongo db container and link this container to it with '--link <mongo container tag>:mongo'

This service communicates with an http host over port 8000 accessible at the hostname "riotambassador".  Riotambassador is a key storage and request throttler

## To build:
docker build -t matchLookup .
## To run
docker run [--link mongoContainerName:mongo] [--link riotAmbassadorContainerName:riotambassador] matchLookup


# TODO:

* Currently this will run until it is out of IDs and exit, it should instead start polling once it is out of IDs

* Currently it will do a lookup of all stored IDs.  It should in the future
  determine which Ids have been looked up and not query them.
