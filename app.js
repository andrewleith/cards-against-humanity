// My SocketStream 0.3 app
var util = require('util');
var http = require('http'),
ss = require('socketstream');
Player = require('./server/models/player');
Game = require('./server/models/game');
cah = require('./server/rpc/cah');

players = [];
// Define a single-page client called 'main'
ss.client.define('game', {
  view: 'game.html',
  css:  ['libs/foundation.min.css', 'libs/cah.css', 'libs/icons.css'],
  code: ['libs/jquery.min.js', 'game/app', 'libs/custom.modernizr.js', 'libs/foundation.min.js', 'libs/foundation.reveal.js', 'libs/cah.js', 'libs/jquery.easing-1.3.js', 'libs/jquery.touchSwipe.js', 'libs/jquery.slide.js'],
  tmpl: 'game'
});

ss.client.define('join', {
  view: 'join.html',
  css:  ['libs/foundation.min.css', 'libs/cah.css', 'libs/icons.css'],
  code: ['libs/jquery.min.js', 'join/app', 'libs/custom.modernizr.js', 'libs/foundation.min.js', 'libs/cah.js', 'libs/jquery.easing-1.3.js', 'libs/jquery.touchSwipe.js'],
  tmpl: 'join'
});

ss.client.define('intro', {
  view: 'intro.html',
  css:  ['libs/foundation.min.css', 'libs/cah.css', 'libs/icons.css'],
  code: ['libs/jquery.min.js', 'intro/app', 'libs/custom.modernizr.js', 'libs/foundation.min.js', 'libs/cah.js', 'libs/jquery.easing-1.3.js', 'libs/jquery.touchSwipe.js'],
  tmpl: 'intro'
});

// Serve this client on the root URL
ss.http.route('/', function(req, res){
  res.serveClient('intro');
});

// Serve this client on the root URL
ss.http.route('/game', function(req, res){
  res.serveClient('game');
});


ss.http.router.on('/join', function(req, res) {
  var queryParam = 'gameid=';

  var success = false;
  if (req.url.indexOf(queryParam)) {
    var gameid = req.url.substring(req.url.indexOf(queryParam) + queryParam.length);
    success = cah.joinGame(gameid, req);
  }
  
  if (success) {
    res.serveClient('join');
  }
  else {
    res.serveClient('game');
  }
});


// Code Formatters
ss.client.formatters.add(require('ss-stylus'));

// Use server-side compiled Hogan (Mustache) templates. Others engines available
ss.client.templateEngine.use(require('ss-hogan'));

// Minimize and pack assets if you type: SS_ENV=production node app.js
if (ss.env === 'production') ss.client.packAssets();

//ss.session.options.maxAge = 1;

// Start web server
var server = http.Server(ss.http.middleware);
server.listen(3000);

// Start SocketStream
ss.start(server);