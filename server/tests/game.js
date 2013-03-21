var Game = require('../models/game').Game;
var util = require('util');

// pretty console logging
var red, blue, reset;
red   = '\u001b[31m';
blue  = '\u001b[36m';
green = '\u001b[22m';
reset = '\u001b[0m';
checkmark = '\u2713';


var startTest = blue + "*******************************************\nRunning test: " + reset;
var endTest = blue + "*******************************************\nTest result: " + reset;

var UnitTest = function(gameWhiteCards, gameBlackCards, ss, req){
  var testResults = [];

  

  var testId;
  var testName;
  var testGroup;
  var result;
  
  var create4PlayerGame = function(id)
  {

    var g = new Game(id, Object.create(gameWhiteCards), Object.create(gameBlackCards), ss, req);
    // init tests
    g.join("player1", "player1");
    g.join("player2", "player2");
    g.join("player3", "player3");
    g.join("player4", "player4");
    
    return g;
  };

  var startNewRound = function(g) {
    var winner;

    for (var p in g.players) {
      if (g.currentJudge != p) {
        g.chooseCard(p, g.players[p].cards[0]);
        winner = g.players[p].cards[0];
      }
    }

    g.pickWinner(g.currentJudge, winner);
  };

  // test judge cycling
  this.testCycling = function() {
    testGroup = "Judge cycle";
    testName = "testing judge cycling";

    var g = create4PlayerGame('testCycle');
    var results = [];
    
    g.start();
    console.log("JUDGE: " + g.currentJudge);
    
    for (var i = 0; i < g.totalPlayers(); i++) {
      startNewRound(g);
    }

    if (g.currentJudge === "player1") {
      result = true;
    }
    else {
      result = false;
      console.log("test [" + testName + "]: failed, debug info: ");
    }

    results.push({testName: testName, result: result, debug: util.inspect(g)});
    recordTest(testGroup, results);
  };

  this.testEmptyGame = function ()
  {
    var results = [];
    testGroup = "Game empty";
    testName = "when all players leave game";

    var g = create4PlayerGame('testEmpty');
    g.leave("player1");
    g.leave("player2");
    g.leave("player3");
    g.leave("player4");

    console.log(endTest);

    // ensure there are no players 
    if (g.totalPlayers() === 0) {
      result = true;
    }
    else {
      result = false;
    }
    
    results.push({testName: testName, result: result, debug: util.inspect(g)});
    recordTest(testGroup, results);
  };

  this.testWaitList = function() 
  {
    testGroup = "Waiting List";
    var results = [];
    
    var g = create4PlayerGame('testWaitlist');
    g.start();
    g.join("player5", "player5");

    testName = "Wait list has players";
    if (g.totalWaiting() === 1) {
      result = true;
    } else {
      result = false;
    }

    results.push({testName: testName, result: result, debug: util.inspect(g)});

    testName = "Players total is correct";
    if (g.totalPlayers() === 4) {
      result = true;
    } else {
      result = false;
    }
    results.push({testName: testName, result: result, debug: util.inspect(g)});

    // check players have cards
    for (var p in g.players) {
      if (g.currentJudge != p) {
        testName = "Player [" + p + "] has cards";
        if (g.players[p].cards.length > 0) {
          result = true;
        } else {
          result = false;
        }
        results.push({testName: testName, result: result, debug: util.inspect(g)});
        console.log("*)***)*)** Player: " + p + " :: " + result);
      }
    }

    // start a new round
    startNewRound(g);
    
    //ensure waiting list is empty
    testName = "Waitlist empty";
    if (g.totalWaiting() === 0) {
      result = true;
    } else {
      result = false;
    }
    results.push({testName: testName, result: result, debug: util.inspect(g)});

    //ensure player list is complete
    testName = "Player list is correct";
    if (g.totalPlayers() === 5) {
      result = true;
    } else {
      result = false;

    }
    results.push({testName: testName, result: result, debug: util.inspect(g)});

    recordTest(testGroup, results);
  };

  this.testMultiGame = function()
  {
    var results = [];
    testGroup = "Multiple games";
    testName = "when two different games are created";

    var g1 = create4PlayerGame('testMulti1');
    var g2 = create4PlayerGame('testMulti2');

    g1.start();
    g2.start();

    // start a new round
    startNewRound(g1);

    // start a new round
    startNewRound(g2);

    result = true;

    results.push({testName: testName, result: result, debug: util.inspect(g1)});
    recordTest(testGroup, results);
  };

  recordTest = function(testGroup, results) {
    testResults.push({
      testGroup: testGroup,
      results: results
    });
  };

  this.printResults = function()
  {
    console.log(blue + "******************************");
    console.log("Test results");
    console.log("******************************");
    for (var result in testResults) {
      var r = testResults[result];
      console.log("\n[o]\t" + r.testGroup);
      console.log("\t-------------------------------");
      for (var outcome in r.results) {
        var o = r.results[outcome];
        console.log("\t" + (o.result ? reset + green + checkmark : red + "X") + reset + " " + blue + o.testName + ": " + (o.result ? reset + green + "Passed!" : red + "Failed!") + reset + blue);
        if (!o.result) {
          console.log("\t" + o.debug);
        }
      }
    }

    console.log(reset);
  };

};

exports.UnitTest = UnitTest;