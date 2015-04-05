From ubuntu
RUN apt-get update
RUN apt-get install -y python python-dev python-distribute python-pip

RUN sudo pip install pymongo

WORKDIR /matchProcessor
Add . /matchProcessor


CMD python /matchProcessor/ProcessData/process.py