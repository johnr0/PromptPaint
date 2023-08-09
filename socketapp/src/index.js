import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
// import App from './App';
import Dashboard from './socketDashboard.js';
import * as serviceWorker from './serviceWorker';
import Main from './main.js';
import M from 'materialize-css'
import 'materialize-css/dist/css/materialize.min.css'

// ReactDOM.render(<App />, document.getElementById('root'));
// ReactDOM.render(<Dashboard />, document.getElementById('root'));
ReactDOM.render(<Main/>, document.getElementById('root'));
// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
