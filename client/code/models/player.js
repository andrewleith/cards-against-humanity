var Player = function(playerName) {
    var name = playerName;
    var id = playerName;
    var score = 0;
    
    var getName = function() {
        return name;
    };

    var setName = function(newName) {
        x = newName;
    };

    var getScore = function() {
        return score;
    };

    var setScore = function(newScore) {
        newScore= score;
    };

    return {
        getName: getName,
        setName: setName,
        getScore: getScore,
        setScore: setScore,
        id: id
    }
};

exports.Player = Player;