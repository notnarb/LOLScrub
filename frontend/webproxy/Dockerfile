FROM ubuntu:14.10
RUN apt-get update
RUN apt-get install nginx -y

# Location for static files
RUN mkdir -p /var/www/html/
RUN mkdir -p /etc/nginx/certs/
RUN rm /etc/nginx/sites-available/*
RUN rm /etc/nginx/sites-enabled/*
RUN rm /etc/nginx/nginx.conf

RUN mkdir -p /var/log/nginx/
RUN ln -s /dev/stdout /var/log/nginx/access.log 
RUN ln -s /dev/stderr /var/log/nginx/error.log

ADD server.crt /etc/nginx/certs/
ADD server.key /etc/nginx/certs/
ADD nginx.conf /etc/nginx/nginx.conf
ADD default.conf /etc/nginx/sites-enabled/

VOLUME /var/www/html

# Note: requires 'daemon off' in nginx.conf
CMD nginx

EXPOSE 80
EXPOSE 443
