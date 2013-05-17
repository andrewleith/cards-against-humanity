// when they click login, send auth request via rpc
$('#joingame').on('submit', function() {

 alert('hi');
  gameId = 'test';
  playerName = $('#joinname').val();

  // auth to the server
  ss.rpc('authenticate.join', { 
    name: $('#joinname').val(),
    gameid: 'test' 
  });

  console.log('joining');
});
