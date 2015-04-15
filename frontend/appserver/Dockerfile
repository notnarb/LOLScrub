FROM node:0.10-onbuild
# location to store responses to feed directly to nginx rather than flood the proxy buffer each time a request is made
RUN mkdir -p /var/www/cache
RUN chmod 755 /var/www/cache
VOLUME /var/www/cache
EXPOSE 8000
CMD node main.js
