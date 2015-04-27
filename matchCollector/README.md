# MatchCollector

All of the pieces which handle the collecting of new match IDs.  All pieces inside communicate over a shared RabbitMQ instance.

## RabbitMq

Persistant Work Queue for communication between the match collector processes.  To ensure persistance between container restarts, be sure to mount /var/lib/rabbitmq/ within the container (note: must be writeable by the rabbitmq user which defaults to 999)

## MatchGetter

Listens for HTTP requests to store new match ID's and stores found items in the new-match-id queue.

## MatchLookup

Gets items from the new-match-id queue, looks them up via the riot API, then stores them in the new-match-data queue

## SeedGetter

Listens for HTTP requests which, when made, triggers it to lookup the current season's match data

## MatchDataStorer

Doesn't exist yet, but will store found matches into a permanent database for querying and extract found summoner IDs an announce them to the summoner id storer endpoint (which also doesn't exist)
