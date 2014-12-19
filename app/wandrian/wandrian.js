/*
The MIT License (MIT)

Copyright (c) 2014 Michael Siegwarth

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/


W = Wandrian = {
    Position: function(positionOrX, y) {
        if (typeof y === 'undefined') {
            this.x = positionOrX.x;
            this.y = positionOrX.y;
        }
        else {
            this.x = positionOrX;
            this.y = y;
        }

        this.equals = function(position) {
            if (this.x == position.x && this.y == position.y) {
                return true;
            }

            return false;
        };
    },

    // An entity is an object that lives in the World and does stuff
    Entity: function(world) {
        // Unique id
        this.id;

        // World reference
        this.world = world;

        // HTML element which is the representation of this entity
        this.el;

        // Store the last position. It is useful in many games
        this.lastPosition;

        // Possible next position. It is set with setPosition, but may change
        // after collision handling
        this.nextPosition;

        // Square where this entity lives. Do not change directly.
        // Use square.setEntity to update all references accordingly
        // If an entity has a dimension larger than 1, it still only in this
        // square, which is the top-left square
        this.square;

        // An entity can be larger than one square. If its dimension is 5,
        // it has basically a 5x5 size. Default dimension is 1
        this.dimension = 1;

        // Type O Negative =D
        this.type;

        // Function that makes the entity "do something". Each entity should
        // implement its own loop function
        this.loop = function() {
            // Default loop: stay in its own position and do nothing
            this.setPosition(this.getPosition());
        };

        this.getPosition = function() {
            return this.square.position;
        };

        this.setPosition = function(position) {
            this.nextPosition = position;
        };

        this.moveToNextPosition = function() {
            this.move(this.nextPosition);
        };

        // Moves the entity. Note: this is a "private" function. To move the
        // entity, you should return the new position in "loop"
        this.move = function(position) {
            if (!position ||
                position.x < 0 ||
                position.y < 0 ||
                position.x + this.dimension > this.world.sizeX ||
                position.y + this.dimension > this.world.sizeY) {
                console.error(
                    "An entity was moved to an invalid position. There's " +
                    "probably a bug in your collision function or in an " +
                    "entity's 'loop' function. Here:", position
                );
            }

            // Update last position
            this.lastPosition = this.getPosition();

            var currentSquare = this.square;
            var newSquare = this.world.getSquare(position);

            // If there's a new square (should always be), and the new square
            // is different from the old one, move it
            if (newSquare && newSquare != currentSquare) {
                // Add entity to the new square
                newSquare.setEntity(this);

                // Remove entity from the current square
                if (currentSquare) {
                    currentSquare.setEntity(null);

                    // Mark as dirty, so it is redrawn later
                    currentSquare.dirty = true;
                }

                // Run square entered event
                if (newSquare.entered) {
                    newSquare.entered(this);
                }

                // Mark as dirty, so it is redrawn later
                newSquare.dirty = true;
            }
        };
    },

    // A collision handler, what else to say?
    CollisionHandler: function(world) {
        this.world = world;

        this.pairs = [];

        this.handle = function() { return true };
    },


    // A Square is a section of the World
    Square: function(position, world) {
        // A Square has a position
        this.position = position;

        // A Square belongs to a world
        this.world = world;

        // HTML element
        this.el;

        // An Entity can belong to a Square. Do not change directly.
        // Use square.setEntity to update all references accordingly
        this.entity;

        // Entities cannot pass over blocking squares
        this.blocking;

        // A dirty square has to be redrawn
        this.dirty = true;

        // Entered Square event: triggers every time
        // an Entity enters this Square
        this.entered; // = function(entity) {};

        // Tried Entering Square event: triggers every time
        // an Entity unsuccessfully tries entering a blocking
        // square
        this.triedEntering; // = function(entity) {};

        this.setEntity = function(entity) {
            this.entity = entity;

            if (entity != null) {
                this.entity.square = this;
            }
        };
    },


    // A World is where things happen
    World: function(sizeX, sizeY, selector) {
        this.el = $(selector);

        this.sizeX = sizeX;
        this.sizeY = sizeY;

        // Collision handling function.
        // MUST BE IMPLEMENTED SEPARATELY
        this.handleCollision;

        this.entityIdCounter = 0;

        this.squares;

        // This array is redundant (because entities are essentially inside
        // squares), but is a good performance helper
        this.entities;

        // Permutations of all existing entities. Ex: if e1, e2, e3 exist in
        // the game, the permutations will be e1-e2, e1-e3 and e2-e3
        this.entityPermutations;

        this.player;

        // A list of collision handlers to be used in this game
        this.collisionHandlers = [];

        /*********************************************************************/

        this.isInside = function(position) {
            if (position.x < 0 || position.y < 0) {
                return false;
            }

            if (position.x >= this.sizeX || position.y >= this.sizeY) {
                return false;
            }

            return true;
        };

        /*********************************************************************/

        this.getAllEntities = function() {
            return this.entities;
        };

        /*********************************************************************/

        this.createEmptySquare = function(position) {
            var square = new Wandrian.Square(position, this);
            square.el = $('<div>');
            this.squares[position.x][position.y] = square;
            return square;
        };

        this.getSquare = function(position) {
            if (!position) {
                return null;
            }

            return this.squares[position.x][position.y];
        };

        this.setSquare = function(square) {
            this.squares[square.position.x][square.position.y] = square;
        };

        /*********************************************************************/

        this.addEntity = function(e) {
            var entity = new window[e.type](this);
            entity.id = this.entityIdCounter;
            entity.type = e.type;

            var square = this.getSquare(new Wandrian.Position(e.position));

            if (!square) {
                return null;
            }

            if (square.entity) {
                // There's already an entity here
                return null;
            }

            square.setEntity(entity);
            square.dirty = true;

            entity.el.addClass('entity');

            this.entityIdCounter++;

            this.entities.push(entity);

            this.updatePermutations();

            return entity;
        };

        this.removeEntity = function(entity) {
            for (var i=0; i<this.sizeX; i++) {
                for (var j=0; j<this.sizeY; j++) {
                    if (this.squares[i][j].entity == entity) {
                        // Remove from DOM
                        entity.el.remove();

                        // Remove object
                        this.squares[i][j].setEntity(null);

                        // Remove from redundant entity array
                        this.entities = _.without(this.entities, entity);

                        this.updatePermutations();

                        return true;
                    }
                }
            }

            return false;
        };

        this.createPermutation = function(entity1, entity2) {
            var permutationCollisionHandlers = [];

            var e1Type = entity1.type;
            var e2Type = entity2.type;

            for (var i=0; i<this.collisionHandlers.length; i++) {
                var collisionHandler = this.collisionHandlers[i];
                var pairs = collisionHandler.pairs;

                for (var j=0; j<pairs.length; j++) {
                    var cond1 = pairs[j][0] == e1Type && pairs[j][1] == e2Type;
                    var cond2 = pairs[j][0] == e2Type && pairs[j][1] == e1Type;

                    if (cond2) {
                        // Invert entities
                        var temp = entity2;
                        entity2 = entity1;
                        entity1 = temp;
                    }

                    if (cond1 || cond2) {
                        permutationCollisionHandlers.push(collisionHandler);
                    }
                }
            }

            this.entityPermutations.push({
                entity1: entity1,
                entity2: entity2,
                collisionHandlers: permutationCollisionHandlers
            });
        };

        this.updatePermutations = function() {
            this.entityPermutations = [];

            for(var i=0; i<this.entities.length; i++) {
                var entity1 = this.entities[i];

                for(var j=i; j<this.entities.length; j++) {
                    var entity2 = this.entities[j];

                    if (entity1 != entity2) {
                        this.createPermutation(entity1, entity2);
                    }
                }
            }
        };

        this.addCollisionHandler = function(type) {
            this.collisionHandlers.push(
                new window[type](this)
            );
        };

        this.genesis = function(
            customSquares,
            entities,
            player,
            collisionHandlers
        ) {
            // Clean everything (in case of a restart)
            this.el.empty();

            this.squares = [];
            for (var i=0; i<this.sizeX; i++) {
                this.squares.push([]);
            }

            this.entities = [];

            // Create an empty squares world. These
            // squares can be replaced by custom squares
            // later
            for (var i=0; i<this.sizeX; i++) {
                for (var j=0; j<this.sizeY; j++) {
                    this.createEmptySquare(new Wandrian.Position(i, j));
                }
            }

            // Replace empty squares with custom squares
            for (var i=0; i<customSquares.length; i++) {
                var cs = customSquares[i];

                this.setSquare(
                    new window[cs.type](new Wandrian.Position(cs.position), this)
                );
            }

            // Add the square class to all square elements
            for (var i=0; i<this.sizeX; i++) {
                for (var j=0; j<this.sizeY; j++) {
                    this.squares[i][j].el.addClass('square');
                }
            }

            // Create the world grid and add all squares to it
            for (var i=0; i<this.sizeY; i++) {
                var row = $('<div>').addClass('square-row');

                for (var j=0; j<this.sizeX; j++) {
                    var sq = this.getSquare(new Wandrian.Position(j, i));
                    row.append(sq.el);
                }

                this.el.append(row);
            }

            // Add collision handlers
            for (var i=0; i<collisionHandlers.length; i++) {
                this.addCollisionHandler(collisionHandlers[i]);
            }

            // Add entities
            for (var i=0; i<entities.length; i++) {
                this.addEntity(entities[i]);
            }

            // Add player (if a player exists)
            if (player) {
                this.player = this.addEntity(player);
            }
        };

        /*********************************************************************/

        this.loopEntities = function() {
            for (var i=0; i<this.entities.length; i++) {
                var entity = this.entities[i];
                var currentPosition = entity.getPosition();

                // Entity does action
                entity.loop();

                // Get the possible next position. If in the loop the entity
                // has moved (with setPosition), nextPosition will have changed.
                // If not, the value will be still the same as in the last loop
                var newSquare = this.getSquare(entity.nextPosition);

                if (newSquare && newSquare.blocking) {
                    // Forget about moving. Stay where you are
                    entity.nextPosition = currentPosition;
                    newSquare.triedEntering(entity);
                }
            }
        };

        this.loopHandleCollisions = function() {
            var collisionFound;
            var iterationCounter = 0;

            do {
                if (iterationCounter >= 100) {
                    console.error(
                        'The collision handling iteration loop has reached ' +
                        'more than 100 iterations. Basically, your ' +
                        'collision handler isn\'t doing a good job. Fix it!'
                    );
                    break;
                }
                iterationCounter++;

                collisionFound = false;

                for (var i=0; i<this.entityPermutations.length; i++) {
                    var p = this.entityPermutations[i];

                    if (p.entity1 != p.entity2) {
                        var square = this.getSquare(p.entity1.nextPosition);
                        var isSamePosition = p.entity1.nextPosition.equals(p.entity2.nextPosition);

                        if (isSamePosition || (square && square.blocking)) {
                            // Collision found
                            collisionFound = true;

                            for (var j=0; j<p.collisionHandlers.length; j++) {
                                var h = p.collisionHandlers[j];

                                if (!h.handle(p.entity1, p.entity2)) {
                                    return;
                                }
                            }

                            break;
                        }
                    }
                }

            }
            while (collisionFound);
        };

        this.loopMoveEveryone = function() {
            // No more collisions: move everyone
            for (var i=0; i<this.entities.length; i++) {
                this.entities[i].moveToNextPosition();
            }
        }

        this.loopRedraw = function() {
            for (var i=0; i<this.sizeX; i++) {
                for (var j=0; j<this.sizeY; j++) {
                    var square = this.squares[i][j];

                    if (!square.dirty) { continue; }

                    // I have used innerHTML because the performance difference
                    // (than using "html" and "empty") is valid here
                    if (square.entity) {
                        square.el[0].innerHTML = square.entity.el[0].outerHTML;
                    }
                    else {
                        square.el[0].innerHTML = '';
                    }

                    square.dirty = false;
                }
            }
        };

        this.loop = function() {
            console.time('loop');
            this.loopEntities();
            this.loopHandleCollisions();
            this.loopMoveEveryone();
            this.loopRedraw();
            console.timeEnd('loop');
        };
    },


    Game: function(gameData) {
        this.loopInterval;
        this.loopPeriod = gameData.loopPeriod;
        this.gameIsOver = false;
        this.paused = false;

        this.squares = gameData.squares;
        this.entities = gameData.entities;
        this.player = gameData.player;
        this.collisionHandlers = gameData.collisionHandlers;

        this.world = new Wandrian.World(
            gameData.worldWidth,
            gameData.worldHeight,
            gameData.worldSelector
        );

        // Event that is executed after the game was set to over
        this.afterGameOver = function() {};

        this.gameOver = function() {
            if (!this.gameIsOver) {
                this.afterGameOver();
            }

            this.gameIsOver = true;

        };

        // Main loop beginning event (for custom stuff needed in any game)
        this.beforeLoop = function() {};

        // Main loop end event (for custom stuff needed in any game)
        this.afterLoop = function() {};

        this.loop = function() {
            if (!this.gameIsOver) {
                this.beforeLoop();
                this.world.loop();
                this.afterLoop();
            }
            else {
                this.end();
            }
        };

        this.start = function() {
            this.world.genesis(
                this.squares,
                this.entities,
                this.player,
                this.collisionHandlers
            );

            if (this.init) {
                this.init();
            }

            this.loopInterval = setInterval(
                $.proxy(this.loop, this), this.loopPeriod);
        };

        this.end = function() {
            clearInterval(this.loopInterval);
        };

        this.togglePause = function() {
            this.paused = !this.paused;

            if (this.paused) {
                clearInterval(this.loopInterval);
            }
            else {
                this.loopInterval = setInterval(
                    $.proxy(this.loop, this), this.loopPeriod);
            }
        }
    },


    /******************************* BUILDERS *******************************/

    GameBuilder: function(params) {
        return function(gameData) {
            Wandrian.Game.call(this, gameData);

            for (var p in params) {
                this[p] = params[p];
            }

            // TODO - Not good
            if (params.handleCollision) {
                this.world.handleCollision = params.handleCollision;
            }
        }
    },

    EntityBuilder: function(params) {
        if (!params.extends) {
            params.extends = Wandrian.Entity;
        }

        // TODO - Use some kind of casing conversion for the css class name
        if (!params.className) {
            params.className = '';
        }

        return function(world) {
            params.extends.call(this, world);

            this.el = $('<div>').addClass(params.className);

            for (var p in params) {
                this[p] = params[p];
            }

            if (this.init) {
                this.init();
            }
        }
    },

    SquareBuilder: function(params) {
        // TODO - Use some kind of casing conversion for the css class name
        if (!params.className) {
            params.className = '';
        }

        if (!params.blocking) {
            params.blocking = false;
        }

        return function(position, world) {
            Wandrian.Square.call(this, position, world);

            this.el = $('<div>').addClass(params.className);

            for (var p in params) {
                this[p] = params[p];
            }
        }
    },

    CollisionHandlerBuilder: function(params) {
        return function(world) {
            Wandrian.CollisionHandler.call(this, world);

            for (var p in params) {
                this[p] = params[p];
            }
        }
    },

    Types: {
        Game: 'GameBuilder',
        Entity: 'EntityBuilder',
        Square: 'SquareBuilder',
        CollisionHandler: 'CollisionHandlerBuilder',
    },

    build: function(params) {
        if (!params.type) {
            console.error("Missing 'type' parameter in build function");
            return;
        }

        return window['Wandrian'][params.type](params);
    },

}
