var Player = require('../models/player').Player;

var util = require('util');

// types of cards in this game
var CARDTYPES = {
  WHITE: 0,
  BLACK: 1
};
var MAXWHITECARDS = 8;

// pretty console logging
var red, blue, reset;
red   = '\u001b[31m';
blue  = '\u001b[36m';
reset = '\u001b[0m';

var Game = function(gameWhiteCards, gameBlackCards, ss, req) {
  this.players = [];
  this.waitingList = [];
  this.waitingForPlayers = true;
  this.firstRound = true;
  this.currentJudge = undefined;
  this.currentCards = [];
  this.judgeCard = undefined;
  this.round = 0;
  this.lookupId = 'xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
  this.id = this.lookupId;
  //this.gameWhiteCards = gameWhiteCards;
  //this.gameBlackCards = gameBlackCards;
  var that = this;


  // ---------------
  // public methods
  // ---------------

  // join a game
  this.join = function(playerId, name) {
    console.log(blue + " '--> game.join(" + playerId + ", " + name + ")" + reset);

    // if we are still waiting for players, add him directly
    if (this.waitingForPlayers) {
      if (!isPlaying(playerId)) {
        addPlayer(playerId, name);
      }
      
      // set first player as judge
      if (this.totalPlayers() === 1)
      {
        this.currentJudge = playerId;
      }

      // let player know who else is playing
      this.emitPlayersList(playerId);

      // let all players know this player joined
      ss.publish.channel(this.id, 'newPlayer', name, this.isJudge(playerId), this.players[playerId].score);

      // let player know we are waiting to start
      emitWaitForGameStart(playerId);

      // if we have enough players, let the judge know he can start
      emitJudgeStart();


    } else {
      // If not, add him to waiting list  
      if (!isPlaying(playerId) && !isWaiting(playerId)) {
        addPlayerToWaitingList(playerId, req.session.name);
        emitWaitForGameStart(playerId);
      }
    }
  };

  // leave a game
  this.leave = function(playerId) {
    console.log(blue + " '--> game.leave(" + playerId + ")" + reset);
    emitPlayerLeave(playerId);
    removePlayer(playerId); 
  };

  // start the game
  this.start = function() {
    console.log(blue + " '--> game.start(): " + req.session.userId + reset);

    this.waitingForPlayers = false;
    this.currentJudge = undefined;
    setupNewRound(); 
    this.test = true;
  };
  
  // update a client's state to current (in case of refresh)
  this.updateClient = function(playerId) {
    console.log(blue + " '--> game.updateClient(" + playerId + ")" + reset);

      // - let player know who else is playing
      this.emitPlayersList(playerId);

      // if game has started
      if (!this.waitingForPlayers && !isWaiting(playerId)) {
        // update players with who is left to choose a card
        emitWaitingOnPlayers(playerId);
        
        // let player know game has started 
        this.emitGameStart(playerId);

        // - Give white cards
        emitNewCards(playerId);

        // - Give chosen card
        emitCardChosen(playerId);
        
        // let the judge know hes judging
        if (this.isJudge(playerId)) {
          ss.publish.user(playerId, 'judgify', this.judgeCard, this.lookupId, this.round, this.isJudge(playerId));
        }

        // - Tell judge its judging time
        // TODO: this should emit to all players...
        emitTimeToJudge();
      } 
      else {
        emitWaitForGameStart(playerId);

        // - let judge know he can start
        if (this.isJudge(playerId)) {
          emitJudgeStart();
        }
      }
    };

  // have player choose a card
  this.chooseCard = function(playerId, card) {
    console.log(blue + " '--> game.chooseCard(" + playerId + ", " + card.id + card.title + ")" + reset);
    
    // if he already has a card chosen, ignore him, he's an evil hacker 
    if (this.players[playerId].chosenCard) {
      // debug
      console.log('Player' + this.players[playerId].name + '(' + playerId + '): tried to select multiple cards.');
      return false;
    }

    // if hes the judge, he isnt allowed to pick a card, and this shouldn't happen. hes an evil hacker
    if (this.isJudge(playerId)) {
      //debug
      console.log('Player' + this.players[playerId].name + '(' + playerId + '): you\'re the judge, you cant pick a card.');
      return false;
    }

    // if he has no chosen card and isnt the judge, let him do this 
    
    // save selection
    this.players[playerId].chosenCard = card;
    req.session.save();
    this.currentCards.push(card);
    
    // let the player know it was successful
    emitCardChosen(playerId);

    // if necessary, let judge know its time to judge
    emitTimeToJudge();

    // update players with who is left to choose a card
    for (var player in this.players) {
      emitWaitingOnPlayers(this.players[player].id, ss);
    }

    return true;
  };

  // let the judge pick the winner for a round
  this.pickWinner = function(playerId, card) {
    console.log(blue + " '--> game.pickWinner(" + playerId + ", " + card.id + ")" + reset);

    // make sure the judge is doing this and not an evil hacker
    if (!that.isJudge(playerId)) {
      console.log("Evil hacker detected: " + playerId + ", ignoring...");
    }
    
    // give the winner a point
    givePoint(card.id);

    // annouce winner
    emitWinner(playerId);

    // remove chosen cards
    // start a new round
    setupNewRound();
  };


  //----------------------
  // public notifications
  //----------------------
  
  // let player know game has started
  this.emitGameStart = function(playerId) {
    ss.publish.user(playerId, 'gameStart', this.judgeCard, this.lookupId);
  };

  // let all player know game has started
  this.emitAllGameStart = function() {
    ss.publish.channel(this.id, 'gameStart', this.judgeCard, this.lookupId);
  };

  // let player know who else is playing
  this.emitPlayersList = function(playerId) {
    for (var player in this.players) {
      ss.publish.user(playerId, 'newPlayer', this.players[player].name, this.isJudge(this.players[player].id), this.players[player].score);
    }
  };



  // ----------------
  // private notifications
  // ----------------

  var emitNewCards = function(playerId) {

    // if hes not the judge, give him cards
    if (!that.isJudge(playerId)) {
      if (that.players[playerId].cards.length < MAXWHITECARDS) {
        var newCards = getCards(MAXWHITECARDS - that.players[playerId].cards.length, CARDTYPES.WHITE);
        that.players[playerId].cards = that.players[playerId].cards.concat(newCards);

      }

      // notify player
      ss.publish.user(playerId, 'newCards', that.players[playerId].cards, that.judgeCard, that.lookupId, that.round, that.isJudge(playerId));
    }
  };

  // let everyone know a player left
  var emitPlayerLeave = function(playerId) {
    ss.publish.channel(req.session.gameId, 'playerLeave', that.players[playerId].name); 
  };

  // let players know who is left to choose a card
  var emitWaitingOnPlayers = function(playerId) {
    var playernames = '';
    var count = 0;

    for (var player in that.players)
    {
      if (!that.isJudge(that.players[player].id) && !(that.players[player].chosenCard)) {
        playernames += that.players[player].name + ', ';
        count++;
      }
    }
    
    playernames = playernames.substring(0,  playernames.length - 2);

    // if we arent waiting on anyone to pick a card, we're waiting on the judge
    if (count === 0) {
      ss.publish.user(playerId, 'message', 'Waiting for: ' + that.players[that.currentJudge].name + ' to choose the winner.');
    }
    else {
      ss.publish.user(playerId, 'message', 'Waiting for: ' + playernames);
    }
  };

  // let player know what card he chose
  var emitCardChosen = function(playerId) {
    if (that.players[playerId].chosenCard) {
      ss.publish.user(playerId, 'cardChosen', that.players[playerId].chosenCard.id);
    }
  };

  // let judge know its judging time
  var emitTimeToJudge = function() {
    // TODO: encapsulate this shit
    if (that.totalPlayers() > 1 && that.totalChosenCards() === that.totalPlayers() - 1)
    {
      for (var p in that.players) {
        if (that.isJudge(p)) {
          ss.publish.user(that.currentJudge, 'timeToJudge', that.currentCards, that.judgeCard);    
        }
        else
        {
          ss.publish.user(p, 'waitingOnJudge');
        }
      }
    }
  };

  // announce winner
  var emitWinner = function(playerId) {
    ss.publish.channel(req.session.gameId, 'message', that.players[that.currentJudge].name + ' wins!');
    ss.publish.channel(req.session.gameId, 'announceWinner', that.players[playerId].name); 
  };
  // in the first round, let the judge know he can start the game
  // var emitGameControls = function(playerId) {
  //   if (that.firstRound && that.isJudge(playerId)) {
  //     ss.publish.user(playerId, 'gameControls', that.judgeCard);
  //   } 
  // };

  // let player know game hasnt started
  var emitWaitForGameStart = function(playerId) {
    ss.publish.user(playerId, 'waitForGameStart', '', that.totalPlayers(), that.isJudge(playerId), that.id, that.lookupId);
  };

  // if there are enough players, let judge know he can start the game
  var emitJudgeStart = function() {
    if (that.totalPlayers() > 1) {
      ss.publish.user(that.currentJudge, 'canStart');
    }
  };


  //-----------------
  // utility methods
  //-----------------
  
  // check if a given player is the current judge
  this.isJudge = function(playerId) {
    if (!this.players[playerId]) return false;

    return (playerId === this.currentJudge);
  };


  // get total number of players
  this.totalPlayers = function() {
    var i = 0;
    for (var player in this.players) {
      i++;
    }

    return i;  
  };

  // get total number of players waiting
  this.totalWaiting = function() {
    var i = 0;
    for (var player in this.waitingList) {
      i++;
    }

    return i;  
  };

  // how many cards have been chosen
  this.totalChosenCards = function() {
    var i = 0;
    for (var player in this.players) {
      if (this.players[player].chosenCard) {
        i++;
      }
    }

    return i;
  };

  // ---------------
  // private utility methods
  // ---------------

  // add a player
  var addPlayer = function(id, name) {
    // add player to the waiting list, he'll get moved to the game at the start of a new round
    var newPlayer = new Player(name, id);
    that.players[id] = newPlayer;  

    //debug
    console.log('Total players: ' + that.totalPlayers());
  };

  // add a new player
  var addPlayerToWaitingList = function(id, name) {
    // add player to the waiting list, he'll get moved to the game at the start of a new round
    var newPlayer = new Player(name, id);
    that.waitingList[id] = newPlayer;  
  };

  // setup the next round
  var setupNewRound = function () {
    // reset game variables
    // remove chosen cards
    removeChosenCards();
    that.currentCards = [];

    that.round++;

    // move players from the waiting list into the game
    for (var waitplayer in that.waitingList) {
      that.players[that.waitingList[waitplayer].id] = that.waitingList[waitplayer];
      that.emitGameStart(waitplayer);
    }
    that.waitingList = [];

    // cycle judge if necessary
    // if there is no judge yet, let the first player be the judge
    if (!that.currentJudge) {
      for (var p in that.players) {
        that.currentJudge = that.players[p].id;
        break;
      }
    } 
    else {
      cycleJudge();  
    }
    
    console.log("MADE IT");
    // we are no longer in the first round
    that.firstRound = false;

    // pick a black card for the judge
    that.judgeCard = getCards(1, CARDTYPES.BLACK);

    // give players new cards, update scores, update black card 
    for (var player1 in that.players) {
      emitNewCards(player1);
      that.emitPlayersList(that.players[player1].id, ss);
      
      // let the judge know hes judging
      if (that.isJudge(that.players[player1].id)) {
        ss.publish.user(that.players[player1].id, 'judgify', that.judgeCard, that.lookupId, that.round, that.isJudge(player1));
      }

      // give player black card
      //that.emitGameStart(player1);
    }

    //debug
    console.log('New judge: ' + that.currentJudge + '(' + that.currentJudge + ')');
  };

  // give player a point
  var givePoint = function(cardId) {
    for (var player in that.players) {
      if (that.players[player].chosenCard) {
        if (that.players[player].chosenCard.id == cardId) {
          that.players[player].score += 1;
          return;
        }
      }
    }
    console.log('gave nobody a point');
  };

  // check if a given player is in the game
  var isPlaying = function(playerId) {
    return (that.players[playerId]) ? true : false;
  };

  // check if a given player is in the waiting list
  var isWaiting = function(playerId) {
    return (that.waitingList[playerId]) ? true : false;
  };

  // remove a player from the game
  var removePlayer = function(id) {
    //if (isPlaying(id)) {
      delete that.players[id];  
    //}

    //if (isWaiting(id)) {
      delete that.waitingList[id];
    //}

  };

  // return the number of randomly picked cards specified by quantity and cardtype
  var getCards = function(quantity, cardtype) {
    var cards = [];
    var deck = [];
    
    // choose which deck we are pulling from
    if (cardtype === CARDTYPES.WHITE) {
      deck = gameWhiteCards;
    }
    else {
      deck = gameBlackCards;
    }

    for (var i = 0; i < quantity; i++) {
      var randomCardIndex = Math.floor(Math.random() * deck.length);

      // add to return array
      cards.push(deck[randomCardIndex]);

      // remove card from deck so it wont be played again
      deck.splice(randomCardIndex, 1);

    }

    return cards;
  };

  // cycle the judge
  var cycleJudge = function() {

    // if there are no players, set the judge to undefined
    if (that.totalPlayers() === 0) {
      that.currentJudge = undefined;

      return;
    }

    // if there is only one player, make them the judge
    if (that.totalPlayers() === 1)
    {
      for (var p in that.players)
        that.currentJudge = that.players[p].id;

      return;
    }

    // cycle to the next judge
    if (nextId() === undefined)
    {
      for (var p2 in that.players) {
        that.currentJudge = that.players[p2].id; 
        return;
      } 
    }
    else {
      that.currentJudge = nextId();  
    }   
  };

  var nextId = function() {
    var finished = false;
    for (var p in that.players) {
      if (finished) {
        return p;
      }

      if (that.players[p].id === that.currentJudge) {
        finished = true;
      }
    }

    return undefined;
  };

  // remove a chosen card
  var removeChosenCards = function() {
    console.log('removing cards...');
    for (var player in that.players) {
      if (that.players[player].chosenCard) {
        console.log('removing: ' + that.players[player].chosenCard.id);
        
        for (var i = 0; i < that.players[player].cards.length; i++) {
          console.log('found card:' + that.players[player].cards[i].id);
          if (that.players[player].cards[i].id === that.players[player].chosenCard.id) {
            that.players[player].cards.splice(i, 1);
          }
        }
      }
      
      that.players[player].chosenCard = undefined;
    }
  };
};

exports.Game = Game;