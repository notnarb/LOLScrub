# Description
Piece of the puzzle that exposes services in the backend to the world via REST api.  Ideally this will only interact with frontend endpoints which then talk to users (gotta not let my house get ddos'd, yo)

Currently only interacts with summoner lookup service

## To build
docker build -t backendambassador .

## To run
docker run -p <host port>:8000 --link summonerlookup:summonerlookup backendambassador
