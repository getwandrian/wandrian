
var Monster = W.build({
    type: W.Types.Entity,
    className: 'monster',
    size: new W.Position(8, 8),

    init: function() {
        // Random color
        this.el.css('background-color', "#"+((1<<24)*Math.random()|0).toString(16));
    },

    randomMove: function() {
        var diffX = Math.floor(Math.random() * 3) - 1;
        var diffY = Math.floor(Math.random() * 3) - 1;

        var currentPosition = this.getPosition();

        var newPosition = new W.Position(
            currentPosition.x + diffX,
            currentPosition.y + diffY
        );

        if (newPosition.x < 0) {
            newPosition.x = 0;
        }

        if (newPosition.y < 0) {
            newPosition.y = 0;
        }

        if (newPosition.x + this.size.x > this.world.sizeX) {
            newPosition.x = this.world.sizeX - this.size.x - 1;
        }

        if (newPosition.y + this.size.y > this.world.sizeY) {
            newPosition.y = this.world.sizeY - this.size.y - 1;
        }

        return newPosition;
    },

    loop: function() {
        this.setPosition(this.randomMove());
    },
});


var StillMonster = W.build({
    type: W.Types.Entity,
    className: 'still-monster',
    size: new W.Position(8, 4),

    init: function() {
        // Random color
        this.el.css('background-color', "#"+((1<<24)*Math.random()|0).toString(16));
    },
});


var MonsterCollisionHandler = W.build({
    type: W.Types.CollisionHandler,

    pairs: [
        ['Monster', 'Monster'],
        ['Monster', 'StillMonster'],
    ],

    handle: function(e1, e2) {
        var entities = arguments;

        //for (var i=0; i<entities.length; i++) {
            var position = e1.getPosition();

            var newPosition = new W.Position(
                position.x + Math.floor(Math.random() * 3) - 1,
                position.y + Math.floor(Math.random() * 3) - 1
            );

            // Check if the new position is inside the map
            if (this.world.isInside(newPosition, e1.size)) {
                // Position is valid. Change it!
                e1.setPosition(newPosition);
            }
        //}

        return true;
    }
});


var LargeCollisionsGame = W.build({
    type: W.Types.Game
});


var game;

var newGame = function() {
    // If a game already exists, end it first
    if (game) {
        game.end();
    }

    $.getJSON('config.json', function(gameData) {
        game = new LargeCollisionsGame(gameData);
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
