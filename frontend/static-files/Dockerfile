# note: reusing ubuntu here since it's used elsewhere.  
FROM ubuntu:14.10
RUN apt-get update
# nodejs-legacy needed to provide 'nodejs' -> 'node'.  More like Ugh-buntu
RUN apt-get install -y nodejs build-essential npm nodejs-legacy
RUN npm install -g grunt-cli
RUN mkdir -p /var/www/html/
# read/execute for files in /var/www/html since they will be imported by another container
RUN chmod -R 555 /var/www/html
RUN mkdir -p /home/app/src
WORKDIR /home/app/
# mount root project file here
COPY package.json /home/app/
RUN npm install
COPY Gruntfile.js /home/app/

# output file directory
VOLUME /var/www/html
CMD grunt && grunt watch
