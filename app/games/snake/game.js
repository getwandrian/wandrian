var Food = W.build({
    type: W.Types.Entity,
    name: 'food',
});

var SnakeSegment = W.build({
    type: W.Types.Entity,
    name: 'snake-segment',

    previousSegment: null,

    loop: function() {
        return this.previousSegment.getPosition();
    },
});

var Snake = W.build({
    type: W.Types.Entity,
    extends: SnakeSegment,
    name: 'snake',

    disallowedPairs: [
        ['left', 'right'],
        ['right', 'left'],
        ['up', 'down'],
        ['down', 'up'],
    ],

    init: function() {
        this.directionArray = [];
        this.lastSegment = this;
    },

    changeDirection: function(direction) {
        var currentDirection;

        if (this.directionArray.length == 1) {
            currentDirection = this.directionArray[0];
        }

        var isAllowed = false;

        // Allow changing only non-opposite directions
        for (var i=0; i<this.disallowedPairs.length; i++) {
            if (currentDirection === this.disallowedPairs[i][0] &&
                direction !== this.disallowedPairs[i][1]) {

                isAllowed = true;
                break;
            }
        }

        if (!currentDirection || isAllowed) {
            this.directionArray.push(direction);
        }
    },

    updatePosition: function() {
        var currentPosition = this.getPosition();

        var newPossiblePosition = new W.Position(
            currentPosition.x,
            currentPosition.y
        );

        var direction;

        if (this.directionArray.length > 1) {
            direction = this.directionArray.shift();
        }
        else {
            // If no direction change, keep moving in the same direction
            direction = this.directionArray[0];
        }

        switch(direction) {
            case 'left':
                newPossiblePosition.x = currentPosition.x - 1;
                break;

            case 'right':
                newPossiblePosition.x = currentPosition.x + 1;
                break;

            case 'up':
                newPossiblePosition.y = currentPosition.y - 1;
                break;

            case 'down':
                newPossiblePosition.y = currentPosition.y + 1;
                break;
        }

        if (this.world.isInside(newPossiblePosition)) {
            return newPossiblePosition;
        }
        else {
            // Snake is out of the world. Game over!
            game.gameOver();
            return currentPosition;
        }
    },

    loop: function() {
        return this.updatePosition();
    },

    grow: function() {
        var newSegment = this.world.addEntity({
            x: this.lastSegment.lastPosition.x,
            y: this.lastSegment.lastPosition.y,
            type: 'SnakeSegment'
        });

        newSegment.previousSegment = this.lastSegment;
        this.lastSegment = newSegment;
    },
});


var SnakeGame = W.build({
    type: W.Types.Game,

    init: function() {
        this.keysPressed = [];
        this.growSnakeAfterLoop = false;

        this.currentScore = 0;
        this.highScore = localStorage.highScore ? parseInt(localStorage.highScore, 10) : 0;
        $('.high-score').html(this.highScore);
        $('.current-score').html(0);

        $('.game-over').hide();
    },

    addEvents: function() {
        $(document).on('keydown', $.proxy(
            function(e) {
                this.keysPressed.push(e.which);
            },
            this
        ));
    },

    beforeLoop: function() {
        for (var i=0; i<this.keysPressed.length; i++) {
            switch(this.keysPressed[i]) {
            case 37: // left
                this.world.player.changeDirection('left');
                break;

            case 38: // up
                this.world.player.changeDirection('up');
                break;

            case 39: // right
                this.world.player.changeDirection('right');
                break;

            case 40: // down
                this.world.player.changeDirection('down');
                break;

            default: break;
            }
        }

        this.keysPressed = [];
    },

    updateScore: function() {
        this.currentScore += 1;

        if (this.currentScore > this.highScore) {
            this.highScore = this.currentScore;
            $('.high-score').html(this.highScore);
            localStorage.highScore = this.highScore;
        }

        $('.current-score').html(this.currentScore);
    },

    afterLoop: function() {
        if (this.growSnakeAfterLoop) {
            // Grow the snake
            this.world.player.grow();

            // Add some new food randomly
            var newFood

            do {
                var foodPosition = new W.Position(
                    Math.floor(Math.random() * this.world.sizeX),
                    Math.floor(Math.random() * this.world.sizeY)
                );

                // Try creating the new food. If it is on an illegal position,
                // null will be returned. In this case, try again. For example,
                // an illegal position might be adding food on the snake itself
                newFood = this.world.addEntity({
                    x: foodPosition.x,
                    y: foodPosition.y,
                    type: 'Food'
                });
            }
            while(newFood == null);

            this.growSnakeAfterLoop = false;

            this.updateScore();
        }
    },

    handleCollision: function(position, entities) {
        var collidedSegmentsCount = _.filter(
            entities,
            function(entity) {
                return entity instanceof Snake ||
                       entity instanceof SnakeSegment;
            }
        ).length;

        if (collidedSegmentsCount > 1) {
            // Snake collided with itself. Game over
            game.gameOver();
        }

        var foodCollided = _.find(
            entities, function(entity) {
                return entity instanceof Food;
            }
        );

        if (foodCollided) {
            // "Eat it"
            this.removeEntity(foodCollided);

            // create a new segment. schedule it to create the segment only
            // after the loop is over (afterLoop)
            game.growSnakeAfterLoop = true;
        }

        var solvedCollisions = [];

        solvedCollisions.push({
            position: position,
            entity: this.player
        });

        return solvedCollisions;
    },

    afterGameOver: function() {
        $('.game-over').show();
    },
});


var game;

var newGame = function() {
    // If a game already exists, end it first
    if (game) {
        game.end();
    }

    $.getJSON('config.json', function(gameData) {
        game = new SnakeGame(gameData);
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
