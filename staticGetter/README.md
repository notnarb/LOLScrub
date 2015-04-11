# Description
Handles the obtaining and storing of LoL data static data so the front end nodes do not need to know the api key

Creates a 'lolStaticData' collection in mongo and provides an api to obtain that data via http requests

champions are stored in the database with the property {dataType: 'champion'}.  Items are stored with the property {dataType:'item'}
