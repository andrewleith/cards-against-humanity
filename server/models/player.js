var Player = function(playerName, id) {
  var name = playerName;
  var score = 0;
  var chosenCard = undefined;
  var cards = [];


  removeChosenCard = function() {
    for (var i = 0; i < cards.length; i++) {
      console.log('found card:' + cards[i].id);
      if (cards[i].id === chosenCard.id) {
        cards.splice(i, 1);
      }
    }
    chosenCard = undefined;
  };

  return {
      name: name,
      score: score,
      id: id,
      chosenCard: chosenCard,
      cards: cards,
      removeChosenCard: removeChosenCard
    };
  };

  exports.Player = Player;
