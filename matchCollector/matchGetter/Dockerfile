# note: reusing ubuntu here since it's used elsewhere.  
FROM ubuntu:14.10
RUN apt-get update
# nodejs-legacy needed to provide 'nodejs' -> 'node'.  More like Ugh-buntu
RUN apt-get install -y nodejs build-essential npm nodejs-legacy

RUN mkdir -p /home/app/src
WORKDIR /home/app/
# mount root project file here
COPY package.json /home/app/
RUN npm install

# Don't mount source files, require they be mounted
VOLUME /home/app/src/

EXPOSE 8000
# Set default command
CMD ["node", "src/main.js"]
