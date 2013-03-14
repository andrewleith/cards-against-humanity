
var amIJudge = false;
var gameId;
var playerName;

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

  iosSlide();
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
    ss.rpc('cah.chooseCard', {
      id: $(this).attr('id'),
      title: $(this).find('h3').text()
    });
  });

  // click a mobile card
  $('.chooseMobile').bind('click', function() {
    // tell the server what card i chose
    $slide = $(this).parents('.slide');
    
    ss.rpc('cah.chooseCard', {
      id: $(this).attr('data-id'),
      title: $slide.find('h3').text()
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
      id: $(this).attr('id'),
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


//random
var isFullscreen = false;

//-------------
// phone stuff
//-------------
function iosSlide() {
    $('.iosSlider').iosSlider({
      snapToChildren: true,
      desktopClickDrag: true,
      keyboardControls: true,
      onSlideChange: slideChange
    });

}
function slideChange(args) {
      
  $('.slideSelectors .item').removeClass('selected');
  $('.slideSelectors .item:eq(' + (args.currentSlideNumber - 1) + ')').addClass('selected');
  $('#whitecards').scrollintoview();;

}