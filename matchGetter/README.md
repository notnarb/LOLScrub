# Description
Match getter for the 2015 Riot Games URF API challenge.

# Dependencies
This service communicates with a passwordless mongodb database accessible at the hostname "mongo".  Current use of this is to set up a mongo db container and link this container to it with '--link <mongo container tag>:mongo'
This service communicates with an http host over port 8000 accessible at the hostname "riotambassador".  Riotambassador is a key storage and request throttler

## To build:
docker build -t matchGetter .
## To run
docker run [--link mongoContainerName:mongo] [--link riotAmbassadorContainerName:riotambassador] matchGetter

# Notes
Timezone is hardcoded to match riot's main timezone: PST

# TODO:
Rather than rely on hard-coded service hostnames, it would probably be a good idea to rely on service discovery with something like etcd
