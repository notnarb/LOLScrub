#!/bin/bash
cd ProcessMatchesIntoKillCollection

docker build -t killcollector .
docker run   -it --link urf2015db:mongo  --name killcollector killcollector
docker logs killcollector


cd ../ProcessData

docker build -t matchprocessor .
docker run  -it --link urf2015db:mongo  --name matchprocessor matchprocessor
docker logs matchprocessor
docker rm matchprocessor

cd ..

