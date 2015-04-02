# Description
Match getter for the 2015 Riot Games URF API challenge.

# Dependencies
Just docker.  This service communicates with a passwordless mongodb database accessible at the hostname "mongo".  Current use of this is to set up a mongo db container and link this container to it with '--link <mongo container tag>:mongo'

## To build:
docker build -t matchGetter .
## To run
docker run [--link mongoContainerName:mongo] matchGetter

# Notes
Timezone is hardcoded to match riot's main timezone: PST
