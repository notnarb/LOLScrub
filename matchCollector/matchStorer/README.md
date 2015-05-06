# Match Storer

Handles the storing of matches into the database and extraction of summoner ID's.  Unlike most services, this service does TWO things: 1) store match data 2) send match data per queue member.  Will only ack the collected match info if both actions are successful.
