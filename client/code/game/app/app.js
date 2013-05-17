
// -------------------------------
// STARTUP CODE - THIS RUNS FIRST
// -------------------------------

// check to see if we've already authed (ie. maybe they just hit refresh) - the server will respond to this
ss.rpc('authenticate.amILoggedIn');

// if they are logged in and they refresh, update the client
ss.event.on('loggedin', function() {
  // update client
  ss.rpc('cah.updateClient');  
});

// on first access or on refresh, if not logged in, show main message
ss.event.on('loggedout', function() {
  window.location.replace('./');
});



// random vars I surely wont remember their purpose
var amIJudge = false;
var gameId;
var playerName;
var gameStart = true;
var pages = {
  category: 1,
  yourcards: 2,
  scoreboard: 3
};

// ui vars
var PANEL_WIDTH;
var PANEL_HEIGHT;
var NAV_ITEM_WIDTH;
var currentPanel=0;
var maxPanels=3;
var swipespeed=500;
var panels, navitems;
var swipeOptions=
{
  triggerOnTouchEnd : true, 
  swipeStatus : swipeStatus,
  allowPageScroll: "vertical",
  threshold:75,
  excludedElements: "button, input, select, textarea, a, .noSwipe",
  fallbackToMouseEvents: false
};


//-----------------------
// Authentication Events
//-----------------------
// when the server tells us we've been authenticated, ask for new cards
// ss.event.on('authenticated', function() {
//   var $controls = $('#gamecontrols');

//   $('#loginForm').trigger('reveal:close');
  
//   // TODO: dont make such crap
//   $('#login').hide();
//   $('#logout').show();
  
//   // create the game
//   ss.rpc('cah.createGame', gameId, playerName);
  
// });

// if the game exists, join it instead
// ss.event.on('gameExists', function() {
//   // join the game
//   ss.rpc('cah.joinGame', gameId, playerName);
// });

// on logout, render login view
ss.event.on('endSession', function(message) {
 location.reload();
 $('html, body').removeClass('hidescroll');
});


//---------------
// Game Events
//---------------
// when the game starts, hide the message
ss.event.on('gameStart', function(judgeCard, lookupId) {
  $('#gamecontrols').hide();

  renderInvite(lookupId);
  showGame();
  setupUI();
});

// when new cards are dealt, display them
ss.event.on('newCards', function(cards, blackCard, gameid, round, isJudge) {
  console.log("new cards, black:" + blackCard.title);
  $('#gamecontrols').hide();
  $('#messages').fadeTo(100, 0);

  // render the cards
  var html = ss.tmpl['game-whitecards'].render({
    cards: cards,
    blackCard: blackCard[0]
  });

  $('#chosencards').html('');
  $('#whitecards').hide().html(html).fadeIn();
  
  bindWhiteCardsView();
  bindChooseCard();




  // render the game/login template
  html = ss.tmpl['game-judge'].render({
    cards: blackCard,
    gameId: gameid,
    round: (round - 1),
    judge: isJudge,
    player: !isJudge
  });

  $('#blackcard').html(html).fadeIn();

  $('#look').on('click', function() { 
    console.log('looking');
    goToPanel(pages.yourcards);      
  });
  if (gameStart === true) {
    goToPanel(pages.category);
    gameStart = false;
  }
  else {
    goToPanel(pages.category);
  }

  // slide in and out the round number
  renderRound(round);
});

// if the server tells you you picked a card, update the view
ss.event.on('cardChosen', function(cardId) {

  // update the view accordingly
  disableWhiteCards();

  // desktop card
  card = $('#' + cardId);
  console.log(card);
  card.removeClass('disable');
  card.addClass("glow");
  
});

// let player know we are waiting for the game to start
ss.event.on('waitForGameStart', function(message, players, isJudge, id, lookupId) {
  var $controls = $('#gamecontrols');
  $('#messages').html(message).fadeIn();

  gameId = id;
  // display waiting message
  var html = ss.tmpl['game-waiting'].render({
    judge: isJudge,
    player: !isJudge,
    notenoughplayers: (players === 1),
    gameId: lookupId
  });

  $controls.hide().html(html).fadeIn();

  renderInvite(lookupId);
});

// when a new player joins, add him to the player list
ss.event.on('newPlayer', function(name, isJudge, score) {
  var $this = $("#" + name);
  var $players = $('#playerslist');
  var $empty = $('#emptylist');

  if ($this.length) {
    $this.remove();
  }

  var html = ss.tmpl['game-players'].render({
    name: name,
    isJudge: isJudge,
    score: score
  });

  if ($empty.length) {
    $empty.remove();
  }

  $players.append(html).fadeIn();
  
});

// when a player quits, remove them from the list
ss.event.on('playerLeave', function(name) {
  var $player = $("#" + name);

  if ($player) {
    $player.fadeOut().remove();
  }
});

ss.event.on('gameControls', function() {
  $('#gamecontrols').fadeIn();
});

// show server message
ss.event.on('message', function(message) {
  //$('#messages').fadeTo(100, 1);
  //$("#messages").delay(3200).fadeOut(300);
});

// when we're waiting on the judge
ss.event.on('waitingOnJudge', function() {
  //s$('#whitecards').fade
});

//--------------
// for the judge
//--------------

// when its time to actually judge, you will need to choose a card from the other players
ss.event.on('timeToJudge', function(cards, blackCard) {

  var html = ss.tmpl['game-chosencards'].render({
    cards: cards,
    blackCard: blackCard[0]
  });

  $('#chosencards').html(html).fadeIn();

  bindChosenCardsView();
  bindPickWinner();
  goToPanel(pages.yourcards);
});

// if you become the judge, hide your hand for the round
ss.event.on('judgify', function(blackCard, gameid, round, isJudge) {
  amIJudge = true;
  

  // render the game/login template
  var message = ss.tmpl['game-judge'].render({
    cards: blackCard,
    gameId: gameid,
    round: (round - 1),
    judge: isJudge,
    player: !isJudge
  });

  $('#blackcard').hide().html(message).fadeIn();
  disableWhiteCards();
  $('#whitecards').hide();
  $('#messages').hide();
  $('#chosencards').html(message).fadeIn();
  goToPanel(pages.category);


  // slide in and out the round number
  renderRound(round);
});

// when there is enough players, allow judge to begin the game
ss.event.on('canStart', function() {

  $('#notenough').hide();
  $('#startButton').fadeIn();
  bindStart();
});

//---------------
// Bindings
//---------------

// TODO: figure out where to put this code so socketstream loads it after this template has been rendered
// without having to call it explicitly

// bind the events on the cards view to some code
var cardClicked;
var isBound = false;
function bindWhiteCardsView(buttonType) {

  // click a card desktop
  $('#whitecards .card').bind('click', function() {

    var $selected = $(this);

    $selected.removeClass('glow'); 
    // tell the server what card i chose
    $('#choose').foundation('reveal', 'open');
    
    if (!isBound) {
      $('.reveal-modal-bg').on('click', function() {
        $('#choose').foundation('reveal', 'close');
        console.log('closing reveal');
      });
      isBound = true;
    }

    $('#choose').off('closed').on('closed', function () {
      console.log('closing');
      $selected.removeClass('glow');
    });


    $(this).addClass("glow");
    $("#choose").attr("data-id", $(this).attr('data-id'));
    $("#choose").attr("data-title", $(this).find('h3').text());

    return false;
  });
}


$('#choose').on('closed', function () {
      console.log($(this));//.removeClass('glow');
});

function bindChosenCardsView(buttonType) {

  // click a card desktop
  $('#chosencards .card').bind('click', function() {

    var $selected = $(this);

    $selected.removeClass('glow'); 
    // tell the server what card i chose
    console.log('revealing');
    $('#choose').foundation('reveal', 'open');
    

    $(this).addClass("glow");
    $("#choose").attr("data-id", $(this).attr('data-id'));
    $("#choose").attr("data-title", $(this).find('h3').text());

    return false;
  });
}



function bindChooseCard() {
  console.log('binding choose card');
  $('#choose').off('click');
  //$('#choose').off('click', onChooseCard);
  //$('#choose').off('click', onPickWinner);

  $('#choose').on('click', onChooseCard);
}

function bindPickWinner() {
  console.log('binding pickwinner');
  $('#choose').off('click');
  //$('#choose').off('click', onChooseCard);
  //$('#choose').off('click', onPickWinner);

  $('#choose').on('click', onPickWinner);
}

// 
// -----------------------------
// bind the default view events
// -----------------------------

// logout click
$('#logout').bind('click', function() {
  ss.rpc('cah.leaveGame');
});

// logout click
$('#login').bind('click', function() {
  displayLogin();
});

// start click
function bindStart() {
  $('#start').bind('click', function() {
    ss.rpc('cah.startGame');
  });
}

// -----------------
// helper functions 
// -----------------
function displayLogin() {
  $("#whitecards").html('');
  //$("#loginForm").reveal();
  $('#login').show();
  $('#logout').hide();
  $('#nav').hide();
}

function disableWhiteCards() {
  console.log('disabling white cards');
  $('.card').unbind('mouseenter mouseleave mouseover mouseout click');
  $('.chooseMobile').unbind('click');
}



// ui stuff
function showGame()
{
  $('html, body').addClass('hidescroll');
  $("#gamestart").fadeIn();
}

function onChooseCard() {

  $('#choose').foundation('reveal', 'close');

  console.log("choosing: " + $(this).attr('data-id'));
  ss.rpc('cah.chooseCard', {
    id: $(this).attr('data-id'),
    title: $(this).attr('data-title')
  });
}

function onPickWinner() {
  $('#choose').foundation('reveal', 'close');

  console.log("choosing: " + $(this).attr('data-id'));
  ss.rpc('cah.pickWinner', {
    id: $(this).attr('data-id'),
    title: $(this).attr('data-title')
  });
}



function setupUI()
{
  var navitems = $("#nav-container .nav-item");
  PANEL_WIDTH = $('#responsiveWidth').width();
  PANEL_HEIGHT = $(window).height();
  NAV_ITEM_WIDTH = PANEL_WIDTH/3;

  $(".swipe-container, #swiper .view").css('width', PANEL_WIDTH);
  $(".swipe-container, #swiper .view").css('height', PANEL_HEIGHT);
  
  navitems.css('width', NAV_ITEM_WIDTH);
  $("#headernav").fadeIn();

  panels = $("#swiper");
  navcontainer = $("#nav-container");
  panels.swipe( swipeOptions );

  navitems.click(function() {
    goToPanel($(this).index());
  });
}

function swipeStatus(event, phase, direction, distance)
{
  console.log("curr:" + event.currentTarget);
  //If we are moving before swipe, and we are going Lor R in X mode, or U or D in Y mode then drag.
  if( phase=="move" && (direction=="left" || direction=="right") )
  {
    var duration=0;
    
    if (direction == "left")
      scrollPanels((PANEL_WIDTH * currentPanel) + distance, duration, panels);
    
    else if (direction == "right")
      scrollPanels((PANEL_WIDTH * currentPanel) - distance, duration, panels);
    
  }
  
  else if ( phase == "cancel")
  {
    scrollPanels(PANEL_WIDTH * currentPanel, swipespeed, panels);
  }
  
  else if ( phase =="end" )
  {
    if (direction == "right")
      previousPanel();
    else if (direction == "left")     
      nextPanel();
  }
}

function previousPanel()
{
  navcontainer.find('.nav-item:nth-child(' + (currentPanel + 2) + ')').removeClass('active');
  currentPanel = Math.max(currentPanel-1, 0);
  scrollPanels( PANEL_WIDTH * currentPanel, swipespeed, panels);
  scrollPanels( NAV_ITEM_WIDTH  * currentPanel, swipespeed, navcontainer);
  navcontainer.find('.nav-item:nth-child(' + (currentPanel + 2) + ')').addClass('active');
}

function nextPanel()
{
  navcontainer.find('.nav-item:nth-child(' + (currentPanel+2) + ')').removeClass('active');
  console.log("removing:" + (currentPanel+2));
  currentPanel = Math.min(currentPanel+1, maxPanels-1);
  scrollPanels( PANEL_WIDTH * currentPanel, swipespeed, panels);
  scrollPanels( NAV_ITEM_WIDTH  * currentPanel, swipespeed, navcontainer);
  navcontainer.find('.nav-item:nth-child(' + (currentPanel + 2) + ')').addClass('active');
}
function goToPanel(index) {

  if (index-1 < currentPanel) {
    while (index-1 < currentPanel) {
      previousPanel();
    }
    return;
  }

  if (index-1 > currentPanel) {
    while (index-1 > currentPanel) {
      nextPanel();
    }
  }
}

function scrollIntro() {}
/**
* Manuallt update the position of the panels on drag
*/
function scrollPanels(distance, duration, item)
{
  item.css("-webkit-transition-duration", (duration/1000).toFixed(1) + "s");
  item.css("transition-duration", (duration/1000).toFixed(1) + "s");
  
  //inverse the number we set in the css
  var value = (distance<0 ? "" : "-") + Math.abs(distance).toString();
  
  item.css("-webkit-transform", "translate3d("+value +"px,0px,0px)");
  item.css("transform", "translate3d("+value +"px,0px,0px)");
}


// render views

// invite view
function renderInvite(lookupId) {
  // update invitation
  var invite = ss.tmpl['game-invite'].render({
    gameId: lookupId
  });
  $('#invite').hide().html(invite).fadeIn();
}

// round partial
function renderRound(round) {
  $('.round').show();
  
  if (round == 1) {
    $('.round').find('h2').text(' ');
  }

  $('.round').delay(500).hide('slide', {direction: 'right'}, 500, function() {
    $(this).find('h2').text('Round ' + round).parent().show('slide', {direction: 'left'}, 1000);
  });

  $('#messages').delay(2500).fadeTo(1200, 0);

  
}




