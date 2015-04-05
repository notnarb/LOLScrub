#!/bin/bash

docker build -t matchprocessor .
docker run -it --link urf2015db:mongo  --name matchprocessor matchprocessor
docker logs matchprocessor
docker rm matchprocessor


