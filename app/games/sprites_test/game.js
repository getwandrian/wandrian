
var GoodbyeMonster = W.build({
    type: W.Types.Entity,
    className: 'goodbye-monster',
    size: new W.Vector(5, 7),

    init: function() {
        this.setSprite('goodbye');
    },
});


var SpritesTestGame = W.build({
    type: W.Types.Game
});


var game;

var newGame = function() {
    // If a game already exists, end it first
    if (game) {
        game.end();
    }

    $.getJSON('config.json', function(gameData) {
        game = new SpritesTestGame(gameData);
        game.start();
    });
}

$(function() {
    newGame();

    $('.play-pause').on('click', function(e) {
        e.preventDefault();
        game.togglePause();
    });

    $('.restart').on('click', function(e) {
        e.preventDefault();

        newGame();
    });
});
