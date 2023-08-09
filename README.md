# PromptPaint Interface that supports in-generation interaction with visually steerable prompts. 

<br />
## Requirements
Requires Python 3+, sqlite3
<br />
npm i socket.io-client <br />

pip install Flask-SocketIO <br />
pip install gevent-websocket 

## Running the server
First, at the root of the git folder, create a database to store logs. 

```console
sqlite3 database.db < config.sql
```

Second, run the sql server.
```console
python sql_server.py
```

Third, run a google colab-based ML server (you might need pro account): [![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/johnr0/InGen/blob/master/InGen_Server.ipynb)<br />
<br />

Fourth, copy ngrok url from the colab code (in the cell with title "Initiate Ngrok."), then paste that to ngrok variable in socketapp/src/canvas/ngrok.js.<br />
<br />

Fifth, run the local server.<br />
```console
cd socketapp
npm run start
```

Enjoy the interface!