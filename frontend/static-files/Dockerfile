# note: reusing ubuntu here since it's used elsewhere.  
FROM ubuntu:14.10
RUN apt-get update
RUN apt-get install -y nodejs build-essential
RUN mkdir -p /var/www/html/
COPY index.html /var/www/html/
# read/execute for files in /var/www/html since they will be imported by another container
RUN chmod -R 555 /var/www/html
VOLUME /var/www/html
