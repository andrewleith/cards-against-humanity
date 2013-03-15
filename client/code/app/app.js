var amIJudge = false;
var gameId;
var playerName;

// ui vars
var IMG_WIDTH = $(window).width();
var NAV_ITEM_WIDTH = IMG_WIDTH/3;
var currentImg=0;
var maxImages=3;
var swipespeed=500;
var panels, navitems;
var swipeOptions=
{
  triggerOnTouchEnd : true, 
  swipeStatus : swipeStatus,
  allowPageScroll:"vertical",
  threshold:75      
};

setupUI();

//-----------------------
// Authentication Events
//-----------------------
// when the server tells us we've been authenticated, ask for new cards
ss.event.on('authenticated', function() {
  var $controls = $('#gamecontrols');

  $('#loginForm').trigger('reveal:close');
  
  // TODO: dont make such crap
  $('#login').hide();
  $('#logout').show();
  
  // create the game
  ss.rpc('cah.createGame', gameId, playerName);
  
});

// if the game exists, join it instead
ss.event.on('gameExists', function() {

  // join the game
  ss.rpc('cah.joinGame', gameId, playerName);
});

// if they are logged in and they refresh, update the client
ss.event.on('loggedin', function() {

  // update client
  ss.rpc('cah.updateClient');
  
});

// on logout, render login view
ss.event.on('endSession', function(message) {
 location.reload();
 $('html, body').removeClass('hidescroll');
});


//---------------
// Game Events
//---------------
// when the game starts, hide the message
ss.event.on('gameStart', function(cards) {

  $('#messages').hide();
  $('#gamecontrols').hide();

   // render the game/login template
   var html = ss.tmpl['game-judge'].render({
    cards: cards
  });

   showGame();
   $('#blackcard').html(html).fadeIn();

 });

// when new cards are dealt, display them
ss.event.on('newCards', function(cards) {


  // render the cards
  var html = ss.tmpl['game-whitecards'].render({
    cards: cards
  });

  $('#whitecards').hide().html(html).fadeIn();

  bindWhiteCardsView();

});

// if the server tells you you picked a card, update the view
ss.event.on('cardChosen', function(cardId) {

  // update the view accordingly
  disableWhiteCards();

  // desktop card
  card = $('#' + cardId);
  console.log(card);
  card.removeClass('disable');
  
  card.find('.pop').text("chosen");
  card.addClass('hover');
  card.addClass('selected');
  card.parents('.row').siblings().find('.card').addClass('disable');
  card.parent().siblings().find('.card').addClass('disable');

  //mobile card
  mcard = $('[data-id=' + cardId + ']');
  mcard.text('chosen').addClass('disabled');
  mcard.addClass('hover');
  mcard.addClass('selected');
  mcard.parents('.slide').siblings().find('.mobile-pop').remove();
  
});

// let player know we are waiting for the game to start
ss.event.on('waitForGameStart', function(message, players, isJudge) {
  var $controls = $('#gamecontrols');
  $('#messages').html(message).fadeIn();

  // display waiting message
  var html = ss.tmpl['game-waiting'].render({
    judge: isJudge,
    player: !isJudge,
    notenoughplayers: (players === 1)
  });

  $controls.hide().html(html).fadeIn();
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
})

// show server message
ss.event.on('message', function(message) {
  $('#messages').html(message).fadeIn();
});

//--------------
// for the judge
//--------------

// when its time to actually judge, you will need to choose a card from the other players
ss.event.on('timeToJudge', function(cards) {

  var html = ss.tmpl['game-chosencards'].render({
    cards: cards
  });

  $('#chosencards').html(html).fadeIn();

  bindChooseCardsView();
});

// if you become the judge, hide your hand for the round
ss.event.on('judgify', function(cards) {
  amIJudge = true;
  // chosen cards to the judge
  var html = ss.tmpl['game-judge'].render({
    message: 'You are the judge',
    cards: cards
  });
  
  var message = ss.tmpl['game-judgemessage'].render();

  $('#blackcard').hide().html(html).fadeIn();
  disableWhiteCards();
  $('#whitecards').hide()
  $('#chosencards').html(message).fadeIn();
});

// when there is enough players, allow judge to begin the game
ss.event.on('canStart', function() {

  $('#notenough').hide();
  $('#messages').hide();
  $('#startButton').fadeIn();
  bindStart();
});

//---------------
// Bindings
//---------------

// TODO: figure out where to put this code so socketstream loads it after this template has been rendered
// without having to call it explicitly

// bind the events on the cards view to some code
function bindWhiteCardsView() {

  // hover on a card
  $('.card').hover(
    function(){
      $(this).addClass('hover disable');
    },
    function()
    {
      $(this).removeClass('hover disable');
    }
    );

  // click a card desktop
  $('.card').bind('click', function() {
    // tell the server what card i chose
    console.log("chose:" + $(this).attr('id') + $(this).find('h3').text());
    ss.rpc('cah.chooseCard', {
      id: $(this).attr('data-id'),
      title: $(this).find('h3').text()
    });
  });
}

// bind the events on the chosencards view
function bindChooseCardsView()
{
    // hover on a card
    $('.card').hover(
      function(){
        $(this).addClass('hover disable');
      },
      function()
      {
        $(this).removeClass('hover disable');
      }
      );

  // click a card
  $('.card').bind('click', function() {
    // tell the server what card i chose
    ss.rpc('cah.pickWinner', {
      id: $(this).attr('data-id'),
      title: $(this).find('h3').text()
    });

    // remove chosen cards view
    $('#chosencards').hide();
  });
}

// 
// -----------------------------
// bind the default view events
// -----------------------------

// when they click login, send auth request via rpc
$('#join').on('submit', function() {


  gameId = $('#gameId').val();
  playerName = $('#username').val();

  // auth to the server
  ss.rpc('authenticate.join', { 
    name: $('#username').val() 
  });


});

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

// check to see if we've already authed (ie. maybe they just hit refresh)
// if not, render the login screen
ss.rpc('authenticate.amILoggedIn');

// ui stuff
function showGame()
{
  $('html, body').addClass('hidescroll');
  $("#gamestart").fadeIn();
}



function setupUI()
{
  $(".swipe-container, #swiper .view").css('width', IMG_WIDTH);
  $("#nav-container .nav-item").css('width', NAV_ITEM_WIDTH);
  $("#headernav").fadeIn();

  panels = $("#swiper");
  navitems = $("#nav-container");
  panels.swipe( swipeOptions );
}

function swipeStatus(event, phase, direction, distance)
{
  //If we are moving before swipe, and we are going Lor R in X mode, or U or D in Y mode then drag.
  if( phase=="move" && (direction=="left" || direction=="right") )
  {
    var duration=0;
    
    if (direction == "left")
      scrollImages((IMG_WIDTH * currentImg) + distance, duration, panels);
    
    else if (direction == "right")
      scrollImages((IMG_WIDTH * currentImg) - distance, duration, panels);
    
  }
  
  else if ( phase == "cancel")
  {
    scrollImages(IMG_WIDTH * currentImg, swipespeed, panels);
  }
  
  else if ( phase =="end" )
  {
    if (direction == "right")
      previousImage()
    else if (direction == "left")     
      nextImage()
  }
}

function previousImage()
{
  navitems.find('.nav-item:nth-child(' + (currentImg + 2) + ')').removeClass('active');
  currentImg = Math.max(currentImg-1, 0);
  scrollImages( IMG_WIDTH * currentImg, swipespeed, panels);
  scrollImages( NAV_ITEM_WIDTH  * currentImg, swipespeed, navitems);
  navitems.find('.nav-item:nth-child(' + (currentImg + 2) + ')').addClass('active');
}

function nextImage()
{
  navitems.find('.nav-item:nth-child(' + (currentImg+2) + ')').removeClass('active');
  console.log("removing:" + (currentImg+2));
  currentImg = Math.min(currentImg+1, maxImages-1);
  scrollImages( IMG_WIDTH * currentImg, swipespeed, panels);
  scrollImages( NAV_ITEM_WIDTH  * currentImg, swipespeed, navitems);
  navitems.find('.nav-item:nth-child(' + (currentImg + 2) + ')').addClass('active');
  
}

/**
* Manuallt update the position of the panels on drag
*/
function scrollImages(distance, duration, item)
{
  item.css("-webkit-transition-duration", (duration/1000).toFixed(1) + "s");
  
  //inverse the number we set in the css
  var value = (distance<0 ? "" : "-") + Math.abs(distance).toString();
  
  item.css("-webkit-transform", "translate3d("+value +"px,0px,0px)");
}
