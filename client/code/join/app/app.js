// when they click login, send auth request via rpc
var gameId, playerName;

gameId = getParameterByName('gameid');

if (!gameId) {
  //gohome();
}

$('#joingame').on('submit', function() {

  playerName = $('#joinname').val();

  // auth to the server
  ss.rpc('authenticate.join', { 
    name: $('#joinname').val(),
    gameid: gameId
  });

  console.log('joining');
});

ss.event.on('authenticated', function(gameid) {
  var $controls = $('#gamecontrols');

  gameId = gameid;

  $('#loginForm').trigger('reveal:close');
  
  // TODO: dont make such crap
  $('#login').hide();
  $('#logout').show();
  
  // create the game
  ss.rpc('cah.joinGame', gameId, playerName);
  gohome();
});

ss.event.on('nogame', function() {
  gohome();
});

ss.event.on('alreadyLoggedIn', function() {
  gohome();
});


// return to the main application
// TODO: figure out a socketstream way to do this instead of this crap
function gohome() {
  window.location.replace("./game");
}


// TODO: not use random functions not specific to business logic
function getParameterByName(name)
{
  name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
  var regexS = "[\\?&]" + name + "=([^&#]*)";
  var regex = new RegExp(regexS);
  var results = regex.exec(window.location.search);
  if(results == null)
    return "";
  else
    return decodeURIComponent(results[1].replace(/\+/g, " "));
}

