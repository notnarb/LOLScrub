From ubuntu
RUN apt-get update
RUN apt-get install -y python python-dev python-distribute python-pip 
RUN apt-get install -y python-numpy
RUN apt-get install -y python-scipy
RUN apt-get install -y python-matplotlib 

RUN sudo pip install pymongo
RUN sudo pip install numpy
RUN sudo pip install scipy
RUN sudo pip install matplotlib

WORKDIR /ProcessData
Add . /ProcessData


CMD python /ProcessData/process.py