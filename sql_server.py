from flask import Flask, jsonify, _app_ctx_stack, request
import sqlite3
from flask_cors import CORS
import datetime
import os
import json 

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE=os.path.join(BASE_DIR, './database.db')

app = Flask(__name__)#, static_folder='../build')
CORS(app)
app.config['CORS_HEADERS'] = 'Content-Type'
app.config['JSONIFY_PRETTYPRINT_REGULAR'] = False

def get_db():
    top = _app_ctx_stack.top
    print(hasattr(top, 'sqlite_db'), DATABASE)
    if not hasattr(top, 'sqlite_db'):
        top.sqlite_db = sqlite3.connect(DATABASE)
    return top.sqlite_db

@app.teardown_appcontext
def close_connection(exception):
    top = _app_ctx_stack.top
    if hasattr(top, 'sqlite_db'):
        top.sqlite_db.close()

@app.route('/api/storeEvent', methods=['GET', 'POST'])
def storeEvent():
    '''storing...'''
    if request.method == 'POST':
        # print(request.get_data())
        d = json.loads(request.get_data())
        print(d)
        conn = get_db()
        cursor = get_db().cursor()
        print(get_db())
        # cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        # tables = cursor.fetchall()
        # print(tables)
        action = d['action']
        user = d['user']
        t = datetime.datetime.now()
        # cursor.execute('INSERT INTO DataDump (User, Data, Action) values (?,?,?);', (user, c_state, action))
        cursor.execute('INSERT INTO DataDump (User, Datetime, Action) values (?,?,?);', (user, t, action))
        conn.commit()
        return jsonify({'result': 'success'})
    return jsonify({'result': 'nothing'})

@app.route('/api/storeState', methods=['GET', 'POST'])
def storeState():
    '''storing...'''
    if request.method == 'POST':
        # print(request.get_data())
        d = json.loads(request.get_data())
        print(d)
        conn = get_db()
        cursor = get_db().cursor()
        print(get_db())
        # cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        # tables = cursor.fetchall()
        # print(tables)
        c_state = json.dumps(d['c_state'])
        user = d['user']
        t = datetime.datetime.now()
        # cursor.execute('INSERT INTO DataDump (User, Data, Action) values (?,?,?);', (user, c_state, action))
        cursor.execute('SELECT Data From UserState WHERE User = ?', (user,))
        fetched = cursor.fetchall()
        if len(fetched)>0:
            cursor.execute('UPDATE UserState SET Data = ? WHERE User=?;', (c_state, user))
        else:
            cursor.execute('INSERT INTO UserState (User, Datetime, Data) values (?,?,?);', (user, t, c_state))
        
        
        conn.commit()
        return jsonify({'result': 'success'})
    return jsonify({'result': 'nothing'})

@app.route('/api/retrieveLatest', methods=['GET', 'POST'])
def retrieveLatest():
    if request.method == 'POST':
        # print(request.get_data())
        d = json.loads(request.get_data())
        print(d)
        conn = get_db()
        cursor = get_db().cursor()
        print(get_db())
        user = d['user']
        t = datetime.datetime.now()
        cursor.execute('SELECT Data FROM UserState WHERE User = "%s" ORDER BY Datetime;' %user)
        # cursor.execute('INSERT INTO DataDump (User, Data, Datetime, Action) values (?,?,?,?);', (user, c_state, t, action))
        # conn.commit()
        fetched = cursor.fetchall()
        target = json.loads(fetched[len(fetched)-1][0])
        print(target)
        return jsonify({'result': target})
    return jsonify({'result': 'nothing'})

app.run()