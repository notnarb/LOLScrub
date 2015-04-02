Ambassador for Riot API requests.  Intercepts HTTP requests, converts them to HTTPS requests and passes them to riot.  Used to throttle requests from multiple sources and automatically add the api key to the request

Exposes port 8000 to recieve HTTP requests on

## To build:
docker build -t riotambassador .
## To run
docker run --name riotambassador riotambassador

# TODO
It would be cool if this registered itself to a service discovery protocol
