var Player = function(playerName, id) {
  var name = playerName;
  var score = 0;
  var chosenCard;
  var cards = [];

  return {
      name: name,
      score: score,
      id: id,
      chosenCard: chosenCard,
      cards: cards
    };
  };

  exports.Player = Player;
