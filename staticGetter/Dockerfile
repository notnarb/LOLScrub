FROM node:0.10-onbuild
# Location to mount source files
RUN mkdir -p /usr/src/app/mnt/
COPY src/main.js /usr/src/app/mnt/
EXPOSE 8000
# Set default command
CMD ["node", "mnt/main.js"]
