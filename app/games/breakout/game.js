var Brick = W.build({
    type: W.Types.Entity,
    className: 'brick',
});


var Ball = W.build({
    type: W.Types.Entity,
    className: 'ball',

    size: new W.Vector(2, 2),
});


var Paddle = W.build({
    type: W.Types.Entity,
    className: 'paddle',

    size: new W.Vector(14, 2),

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
        }

        if (this.world.isInside(newPossiblePosition, this.size)) {
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


var BreakoutGame = W.build({
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
        game = new BreakoutGame(gameData);
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
