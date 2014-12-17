
var Monster = W.build({
    type: W.Types.Entity,
    name: 'monster',
    dimension: 5,

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

        if (newPosition.x >= this.world.sizeX) {
            newPosition.x = this.world.sizeX - 1;
        }

        if (newPosition.y >= this.world.sizeY) {
            newPosition.y = this.world.sizeY - 1;
        }

        return newPosition;
    },

    loop: function() {
        return this.randomMove();
    },
});

Hero = W.build({
    type: W.Types.Entity,
    name: 'hero',

    possiblePosition: null,

    moveToDirection: function(direction) {
        var newPossiblePosition = new W.Position(
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
        return this.possiblePosition;
    },
});

var Grass = W.build({
    type: W.Types.Square,
    name: 'grass',

    entered: function(entity) {
        game.addToConsole('Grass stepping sound');
    }
});

var Rock = W.build({
    type: W.Types.Square,
    name: 'rock',

    blocking: true,

    triedEntering: function(entity) {
        game.addToConsole("You can't climb this rock");
    }
});

var SimpleCollisionsGame = W.build({
    type: W.Types.Game,

    init: function() {
        this.keysPressed = [];

        this.maxLoops = 300;
        this.currentLoop = 0;
    },

    addEvents: function() {
        $(document).on('keydown', $.proxy(function(e) {
            // If a key is already in the pressed keys list,
            // it shouldn't be added again
            if (this.keysPressed.indexOf(e.which) != -1) {
                return;
            }

            this.keysPressed.push(e.which);
        }, this));

        $(document).on('keyup', $.proxy(function(e) {
            var index = this.keysPressed.indexOf(e.which);

            if (index != -1) {
                this.keysPressed.splice(index, 1);
            }
        }, this));
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

        console.log('count', this.world.getAllEntities().length);

    },

    handleCollision: function(position, entities) {
        var solvedCollisions = [];

        for (var i=0; i<entities.length; i++) {
            var newPosition = new W.Position(
                position.x + Math.floor(Math.random() * 3) - 1,
                position.y + Math.floor(Math.random() * 3) - 1
            );

            // Check if the new position is inside the map
            if (!this.isInside(newPosition)) {
                // Tried moving the entity to an invalid block.
                // Just leave it in the same place it was before
                newPosition = position;
            }

            solvedCollisions.push({
                position: newPosition,
                entity: entities[i]
            });
        }

        return solvedCollisions;
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
        game.addEvents();
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
