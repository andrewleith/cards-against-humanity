var Game = require('../models/game').Game;


var UnitTest = function(gameWhiteCards, gameBlackCards, ss, req){

  var g = new Game('test-game', Object.create(gameWhiteCards), Object.create(gameBlackCards), ss, req);

  // init tests
  g.currentJudge = "player1";
  g.join("player1", "player1");
  g.join("player2", "player2");
  g.join("player3", "player3");
  g.join("player4", "player4");

  // test judge cycling
  this.testCycling = function() {
    for (var i = 0; i < 10; i++) {
      console.log("--------------------");
      console.log("current judge: " + g.currentJudge);
      cycleJudge();
      console.log("Post-cycle judge: " + g.currentJudge);
    }
  };
};

exports.UnitTest = UnitTest;