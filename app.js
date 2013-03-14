// My SocketStream 0.3 app
var util = require('util');
var http = require('http'),
ss = require('socketstream');
Player = require('./server/models/player');
Game = require('./server/models/game')

players = [];
// Define a single-page client called 'main'
ss.client.define('main', {
  view: 'app.html',
  css:  ['libs/foundation.min.css', 'libs/cah.css', 'libs/icons.css'],
  code: ['libs/jquery.min.js', 'app', 'libs/foundation.min.js', 'libs/cah.js', 'libs/jquery.eqheight.js', 'libs/jquery.easing-1.3.js', 'libs/jquery.iosslider.min.js', 'libs/jquery.scroll.js'],
  tmpl: '*'
});

// Serve this client on the root URL
ss.http.route('/', function(req, res){
  res.serveClient('main');
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