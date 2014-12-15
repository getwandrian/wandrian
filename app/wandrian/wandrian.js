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
    Position: function(x, y) {
        this.x = x;
        this.y = y;

        this.in = function(position) {
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

        // Square where this entity lives. Do not change directly.
        // Use square.setEntity to update all references accordingly
        this.square;

        // Function that makes the entity "do something". Each entity should
        // implement its own loop
        this.loop = function() {
            // Default loop: stay in its own position and do nothing
            return this.getPosition()
        };

        this.getPosition = function() {
            return this.world.getEntityPosition(this);
        };

        this.getSquare = function() {
            return this.world.getEntitySquare(this);
        };

        // Moves the entity. Note: this is a "private" function. To move the
        // entity, you should return the new position in "loop"
        this.move = function(position) {
            if (!position ||
                position.x < 0 ||
                position.y < 0 ||
                position.x >= this.world.sizeX ||
                position.y >= this.world.sizeY) {
                console.error(
                    "An entity was moved to an invalid position. There's " +
                    "probably a bug in your collision function or in an " +
                    "entity's 'loop' function. Here:", position
                );
            }

            // Update last position
            this.lastPosition = this.getPosition();

            var currentSquare = this.getSquare();
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


    // Sometimes many entities can be (temporarely) in the same place. In this
    // case, the collision handling function will be executed to "solve" the
    // collision. The EntityCollisionCollection class represents all entities
    // which are in a specific position, colliding
    EntityCollisionCollection: function(position, entities) {
        this.position = position;

        if (!entities) { entities = []; }
        this.entities = entities;

        this.in = function(position) {
            if (!position || !this.position) {
                return false;
            }

            return this.position.in(position);
        }
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

        this.player;

        /*********************************************************************/

        this.mergePositions = function(collisionsA, collisionsB) {
            // Go through each of collisionsB objects
            _.each(collisionsB, function(itemB) {
                // Try to find an object in collisionsA ehich is in the same
                // position as an item in collisionsB
                var itemA = _.find(collisionsA, function(itemA) {
                    return itemA.in(itemB.position);
                });

                if (itemA) {
                    // If an item is found, merge itemA and itemB
                    itemA.entities = _.union(itemA.entities, itemB.entities);
                }
                else {
                    // If not found, add a new item to collisionsA
                    collisionsA.push(itemB);
                }
            });

            return collisionsA;
        };

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

        this.getEntitySquare = function(entity) {
            // It is better to loop entities because there are always less
            // entities than squares
            for (var i=0; i<this.entities.length; i++) {
                if (this.entities[i] == entity) {
                    return this.entities[i].square;
                }
            }

            return null;
        };

        this.getEntityPosition = function(entity) {
            // It is better to loop entities because there are always less
            // entities than squares
            for (var i=0; i<this.entities.length; i++) {
                if (this.entities[i] == entity) {
                    return this.entities[i].square.position;
                }
            }

            return null;
        };

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

            var square = this.getSquare(new Wandrian.Position(e.x, e.y));

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

                        return true;
                    }
                }
            }

            return false;
        };

        this.genesis = function(customSquares, entities, player) {
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
                    new window[cs.type](new Wandrian.Position(cs.x, cs.y), this)
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
            var entitiesInPositions = [];

            for (var i=0; i<this.entities.length; i++) {
                var entity = this.entities[i];
                var currentPosition = entity.getPosition();

                // Entity does action and returns a possible new position
                var newPosition = entity.loop();

                if (!newPosition) {
                    console.error(entity, "didn't return a valid position. Check this entities' loop function!");
                }

                var newSquare = this.getSquare(newPosition);

                var curEcc = _.find(entitiesInPositions, function(item) {
                    return item.in(currentPosition);
                });

                var newEcc = _.find(entitiesInPositions, function(item) {
                    return item.in(newPosition);
                });

                if (newSquare && newSquare.blocking) {
                    newEcc = curEcc;
                    newPosition = currentPosition;
                    newSquare.triedEntering(entity);
                }

                if (!newEcc) {
                    newEcc = new Wandrian.EntityCollisionCollection(
                        newPosition
                    );

                    entitiesInPositions.push(newEcc);
                }

                newEcc.entities.push(entity);
            }

            return entitiesInPositions;
        };

        this.loopHandleCollisions = function(entitiesInPositions) {
            var thereAreStillCollisions;
            var iterationCounter = 0;

            do {
                if (iterationCounter >= 100) {
                    console.error(
                        'The collision handling iteration loop has reached ' +
                        'more than 100 iterations. Basically, your ' +
                        'collision handler isn\'t doing a good job. Fix it!'
                    );
                }
                iterationCounter++;

                thereAreStillCollisions = false;

                for (var i=0; i<entitiesInPositions.length; i++) {
                    var ecc = entitiesInPositions[i];
                    var position = ecc.position;

                    // If there's more than one entity in the same position,
                    // or if there's an entity on a blocking square,
                    // there's a collision
                    var square = this.getSquare(position);
                    if (ecc.entities.length > 1 || (square && square.blocking && ecc.entities.length == 1)) {
                        thereAreStillCollisions = true;

                        var solvedCollisions =
                            this.handleCollision(
                                position, ecc.entities
                            );

                        // Clear entity list. If there are still entities in
                        // this position, they will be re-added in the merge
                        // function below (mergePositions)
                        ecc.entities = [];

                        if (!solvedCollisions) {
                            console.error('Your collision handling function is not returning a value');
                            continue;
                        }

                        // Convert the returned collection to the internal
                        // format (TODO - I don't like this)
                        var convertedSolvedCollisions = [];

                        for (var j=0; j<solvedCollisions.length; j++) {
                            var newEcc = new Wandrian.EntityCollisionCollection(
                                solvedCollisions[j].position,
                                [solvedCollisions[j].entity]
                            );

                            convertedSolvedCollisions.push(newEcc);
                        }

                        entitiesInPositions =
                            this.mergePositions(
                                entitiesInPositions,
                                convertedSolvedCollisions
                            );

                        // Break loop and try again, check if there are
                        // still collisions to fix
                        break;
                    }
                }
            }
            while (thereAreStillCollisions);

            return entitiesInPositions;
        };

        this.loopMoveEveryone = function(entitiesInPositions) {
            // No more collisions: move everyone
            for (var i=0; i<entitiesInPositions.length; i++) {
                var ecc = entitiesInPositions[i];

                if (ecc.entities.length) {
                    var entity = ecc.entities[0];
                    entity.move(ecc.position);
                }
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
            var entitiesInPositions = this.loopEntities();
            entitiesInPositions = this.loopHandleCollisions(entitiesInPositions);
            this.loopMoveEveryone(entitiesInPositions);
            this.loopRedraw();
            console.timeEnd('loop');
        };
    },


    Game: function(gameData) {
        this.loopInterval;
        this.loopPeriod = gameData.loopPeriod;
        this.gameIsOver = false;
        this.paused = false;

        // TODO - These are temporary variables, no need to store them forever
        this.squares = gameData.squares;
        this.entities = gameData.entities;
        this.player = gameData.player;

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
            if (!this.world.handleCollision) {
                console.error(
                    'Missing collision handling function. Game will not work!'
                );

                return;
            }

            this.world.genesis(
                this.squares,
                this.entities,
                this.player
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

        if (!params.name) {
            params.name = '';
        }

        return function(world) {
            params.extends.call(this, world);

            this.el = $('<div>').addClass(params.name);

            for (var p in params) {
                this[p] = params[p];
            }

            if (this.init) {
                this.init();
            }
        }
    },

    SquareBuilder: function(params) {
        if (!params.name) {
            params.name = '';
        }

        if (!params.blocking) {
            params.blocking = false;
        }

        return function(position, world) {
            Wandrian.Square.call(this, position, world);

            this.el = $('<div>').addClass(params.name);

            for (var p in params) {
                this[p] = params[p];
            }
        }
    },

    Types: {
        Game: 'GameBuilder',
        Entity: 'EntityBuilder',
        Square: 'SquareBuilder',
    },

    build: function(params) {
        if (!params.type) {
            console.error("Missing 'type' parameter in build function");
            return;
        }

        return window['Wandrian'][params.type](params);
    },

}
