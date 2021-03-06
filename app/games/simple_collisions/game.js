
var Monster = W.build({
    type: W.Types.Entity,
    className: 'monster',

    init: function() {
        // Random color
        this.el.style.backgroundColor = "#"+((1<<24)*Math.random()|0).toString(16);
    },

    randomMove: function() {
        var diffX = Math.floor(Math.random() * 3) - 1;
        var diffY = Math.floor(Math.random() * 3) - 1;

        var currentPosition = this.getPosition();

        var newPosition = new W.Vector(
            currentPosition.x + diffX,
            currentPosition.y + diffY
        );

        if (newPosition.x < 0) {
            newPosition.x = 0;
        }

        if (newPosition.y < 0) {
            newPosition.y = 0;
        }

        if (newPosition.x >= this.world.sizeX) {
            newPosition.x = this.world.sizeX - 1;
        }

        if (newPosition.y >= this.world.sizeY) {
            newPosition.y = this.world.sizeY - 1;
        }

        return newPosition;
    },

    loop: function() {
        this.setPosition(this.randomMove());
    },
});


var Hero = W.build({
    type: W.Types.Entity,
    className: 'hero',

    possiblePosition: null,

    moveToDirection: function(direction) {
        var newPossiblePosition = new W.Vector(
            this.possiblePosition.x,
            this.possiblePosition.y
        );

        switch(direction) {
            case 'left':
                newPossiblePosition.x = this.possiblePosition.x - 1;
                break;

            case 'right':
                newPossiblePosition.x = this.possiblePosition.x + 1;
                break;

            case 'up':
                newPossiblePosition.y = this.possiblePosition.y - 1;
                break;

            case 'down':
                newPossiblePosition.y = this.possiblePosition.y + 1;
                break;
        }

        if (this.world.isInside(newPossiblePosition)) {
            this.possiblePosition = newPossiblePosition;
        }
    },

    updatePossiblePosition: function() {
        this.possiblePosition = this.getPosition();
    },

    loop: function() {
        this.setPosition(this.possiblePosition);
    },
});


var Grass = W.build({
    type: W.Types.Square,
    className: 'grass',

    entered: function(entity) {
        game.addToConsole('Grass stepping sound');
    }
});


var Rock = W.build({
    type: W.Types.Square,
    className: 'rock',

    blocking: true,

    triedEntering: function(entity) {
        game.addToConsole("You can't climb this rock");
    }
});


var MonsterCollisionHandler = W.build({
    type: W.Types.CollisionHandler,

    pairs: [
        ['Monster', 'Monster'],
        ['Monster', 'Hero'],
    ],

    handle: function() {
        var entities = arguments;

        for (var i=0; i<entities.length; i++) {
            var position = entities[i].getPosition();

            var newPosition = new W.Vector(
                position.x + Math.floor(Math.random() * 3) - 1,
                position.y + Math.floor(Math.random() * 3) - 1
            );

            // Check if the new position is inside the map
            if (this.world.isInside(newPosition)) {
                // Position is valid. Change it!
                entities[i].setPosition(newPosition);
            }
        }

        return true;
    }
});


var SimpleCollisionsGame = W.build({
    type: W.Types.Game,

    init: function() {
        this.keysPressed = [];

        this.maxLoops = 300;
        this.currentLoop = 0;
    },

    events: {
        keydown: function(e) {
            // If a key is already in the pressed keys list,
            // it shouldn't be added again
            if (this.keysPressed.indexOf(e.which) != -1) {
                return;
            }

            this.keysPressed.push(e.which);
        },

        keyup: function(e) {
            var index = this.keysPressed.indexOf(e.which);

            if (index != -1) {
                this.keysPressed.splice(index, 1);
            }
        },

        beforeLoop: function() {
            this.world.player.updatePossiblePosition();

            for (var i=0; i<this.keysPressed.length; i++) {
                switch(this.keysPressed[i]) {
                case 37: // left
                    this.world.player.moveToDirection('left');
                    break;

                case 38: // up
                    this.world.player.moveToDirection('up');
                    break;

                case 39: // right
                    this.world.player.moveToDirection('right');
                    break;

                case 40: // down
                    this.world.player.moveToDirection('down');
                    break;

                default: return;
                }
            }
        },

        afterLoop: function() {
            this.currentLoop += 1;

            // if (this.maxLoops == this.currentLoop) {
            //     this.gameOver = true;
            //     game.addToConsole('game over!');
            // }
        },
    },

    addToConsole: function(message) {
        var console = $('.console');

        console.val(console.val() + '\n' + message)
               .scrollTop(console[0].scrollHeight);
    },

});


var game;

var newGame = function() {
    // If a game already exists, end it first
    if (game) {
        game.end();
    }

    $.getJSON('config.json', function(gameData) {
        game = new SimpleCollisionsGame(gameData);
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
