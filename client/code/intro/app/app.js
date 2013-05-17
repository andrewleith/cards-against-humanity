// STARTUP CODE - THIS RUNS FIRST
// if they are logged in and they refresh, update the client
ss.rpc('authenticate.amILoggedIn');

// ---------------
// server events
// ---------------

// if they are logged send them into the game
ss.event.on('loggedin', function() {
  gohome();
});

// on first access or on refresh, if not logged in, show main message
ss.event.on('loggedout', function() {
  $('#intro').fadeTo(500, 1);
});

// once we've joined a game, redirect to the game app
ss.event.on('authenticated', function() {
  ss.rpc('cah.createGame', playerName);
  gohome();
});



// utility methods

function gohome()
{
  // horrible?
  window.location.replace("./game");
}

// intro page events

// when they click startgame, slide the startpanel up
$('#startgame').on('click', function() { 
  $('#startpanel').animate({top:0}, 500,'swing');  
});

// when they click the rules link, swipe it to the left
$('#rules').on('click', function() {
  nextPanel();
});

// when they click login, send auth request via rpc
$('#join').on('submit', function() {


  gameId = $('#gameId').val();
  playerName = $('#username').val();

  // auth to the server
  ss.rpc('authenticate.join', { 
    name: $('#username').val() 
  });


});

// introduction stuff
var PANEL_WIDTH;
var PANEL_HEIGHT;
var NAV_ITEM_WIDTH;
var currentPanel=0;
var maxPanels=2;
var swipespeed=500;
var panels, navitems, navcontainer;
var swipeOptions=
{
  triggerOnTouchEnd : true, 
  swipeStatus : swipeStatus,
  allowPageScroll: "vertical",
  threshold:75,
  excludedElements: "button, input, select, textarea, a, .noSwipe",
  fallbackToMouseEvents: true
};
PANEL_WIDTH = $('#responsiveWidth').width();
PANEL_HEIGHT = $(window).height() - $('#start').height();
navcontainer = $('.navigation');
$(".swipe-container, #swiper .view").css('width', PANEL_WIDTH);
$(".swipe-container, #swiper .view").css('height', PANEL_HEIGHT);
$("#startpanel, #swiper .view").css('height', $(window).height());
panels = $("#swiper");
panels.swipe( swipeOptions );


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
  currentPanel = Math.max(currentPanel-1, 0);
  scrollPanels( PANEL_WIDTH * currentPanel, swipespeed, panels); 
  //navcontainer.find('.item:nth-child(' + (currentPanel + 2) + ')').removeClass('active');
  //navcontainer.find('.item:nth-child(' + (currentPanel + 1) + ')').addClass('active');
}

function nextPanel()
{
  currentPanel = Math.min(currentPanel+1, maxPanels-1);
  scrollPanels( PANEL_WIDTH * currentPanel, swipespeed, panels);
  //navcontainer.find('.item:nth-child(' + (currentPanel) + ')').removeClass('active');
  //navcontainer.find('.item:nth-child(' + (currentPanel + 1) + ')').addClass('active');
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



