var cah = require("./cah");
var Game = require("../models/game").Game;

// Define actions which can be called from the client using ss.rpc('demo.ACTIONNAME', param1, param2...)
exports.actions = function(req, res, ss) {

  req.use('session');
  
  return {
    join: function(data) {

      // player already auth'd, return
      if (req.session.auth === true)
      {
        console.log('already logged in, ignoring');
        return res(true);
      }
      
      // debug
      console.log('New player: ' + data.name + '(' + req.session.id + ')');

      // mark user as logged in
      req.session.auth = true;
      req.session.setUserId(req.session.id);
      req.session.name = data.name;
      req.session.save();

      // tell user he's authed
      ss.publish.user(req.session.id, 'authenticated');

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

