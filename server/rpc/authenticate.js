var cah = require("./cah");
var Game = require("../models/game").Game;
var util = require('util');

// Define actions which can be called from the client using ss.rpc('demo.ACTIONNAME', param1, param2...)
exports.actions = function(req, res, ss) {

  req.use('session');
  
  return {
    join: function(data) {


      // player already auth'd, return
      if (req.session.auth === true)
      {
        console.log('already logged in, ignoring');
        ss.publish.socketId(req.socketId, 'alreadyLoggedIn');
        return res(true);
      }
      
      // if a gameid was passed, use it
      if (data.gameid) {
        var gameExists = false;
        var actualGameId;
        for (var game in cah.currentGames) {
          if (cah.currentGames[game].lookupId === data.gameid) {
            gameExists = true;
            actualGameId = cah.currentGames[game].id;
            break;
          }
        }

        if (gameExists) {
          req.session.gameId = actualGameId;
        }
        else { // game doesnt exist, tell user to go to the main page
          ss.publish.socketId(req.socketId, 'nogame');
          return res(false);
        }
      }

      // debug
      console.log('New player: ' + data.name + '(' + req.session.id + ')');

      // mark user as logged in
      req.session.auth = true;
      req.session.setUserId(req.session.id);
      req.session.name = data.name;
      req.session.save();

      // tell user he's authed
      ss.publish.user(req.session.id, 'authenticated', req.session.gameId);

      return res(true);
    },

    amILoggedIn: function() {

      //cah.emitAllPlayers(ss, req);

      if (req.session.auth === true)
      {
        // tell user he's authed
        ss.publish.user(req.session.id, 'loggedin');

        return res(true);
      }

      ss.publish.socketId(req.socketId, 'loggedout');
      //ss.publish.user(req.session.id, 'loggedout');
      return res(true);
    }
  };
};

