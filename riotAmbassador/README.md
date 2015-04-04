Ambassador for Riot API requests.

# Description

Intercepts HTTP requests, converts them to HTTPS requests and passes them to riot.  Used to throttle requests from multiple sources and automatically add the api key to the request

Offers two queues for passing requests: currently hardcoded as ports 8000 (low priority) and 9000 (high priority):

* If there is a high priority request and a low priority request queued, riotambassador will favor the high priority queue

* If it has been a while since a low priority request has gone through, riotambassador will instead favor the low priority queue (every N requests) to prevent starvation of the low priority queue

# Usage

## Store your credentials

Save your API key as a single string in a JSON array.

> echo ["<your-secret-key-here>"] > secretKeyList.json

## To build:

docker build -t riotambassador .

## To run

docker run --name riotambassador riotambassador

## To query

> curl <hostname>:8000/api/request/goes/here/but/no/key/



# TODO
It would be cool if this registered itself to a service discovery protocol
