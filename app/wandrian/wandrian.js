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
    Vector: function(positionOrX, y) {
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
    Entity: function(world, size) {
        // Unique id
        this.id;

        // World reference
        this.world = world;

        // An entity can be larger than one square. It can be a rectangle, and
        // its size is defined here. Default: 1x1 square
        if (size) {
            this.size = new Wandrian.Vector(size);
        }
        else {
            this.size = new Wandrian.Vector(1, 1);
        }

        // HTML element which is the representation of this entity
        this.el;

        // DOM code
        this.el = document.createElement('div')
        this.el.className = 'w-entity';

        this.el.style.width = (this.world.squareSize * this.size.x) + 'px';
        this.el.style.height = (this.world.squareSize * this.size.y) + 'px';

        // Put the entity somewhere far away, so it doesn't appear on screen
        // while its true position is not updated
        this.el.style.top = '-10000px';
        this.el.style.left = '-10000px';

        this.world.el.appendChild(this.el);

        // Store the last position. It is useful in many games
        this.lastPosition;

        // Possible next position. It is set with setPosition, but may change
        // after collision handling
        this.nextPosition;

        // Square where this entity lives. Do not change directly.
        // Use square.setEntity to update all references accordingly.
        // If an entity has a size larger than 1, it still lives only in this
        // square, which is the top-left square
        this.square;

        // Type O'Negative =D
        this.type;

        // A dirty entity has to be redrawn
        this.dirty = true;

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
                position.x + this.size.x > this.world.sizeX ||
                position.y + this.size.y > this.world.sizeY) {
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
                }

                // Run square entered event
                if (newSquare.entered) {
                    newSquare.entered(this);
                }

                // Mark as dirty, so it is redrawn later
                this.dirty = true;
            }
        };

        this.setSprite = function(spriteName) {
            // Remove any existing sprite
            var index = this.el.className.indexOf('w-sprite');
            if (index != -1) {
                this.el.className = this.el.className.substr(0, index);
            }

            // Add sprite class
            this.el.className += ' w-sprite-' + spriteName;
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
    World: function(sizeX, sizeY, id, squareSize) {
        this.el = document.getElementById(id);

        if (!this.el.className) {
            this.el.className = 'w-world';
        }
        else {
            this.el.className += ' w-world';
        }

        this.sizeX = sizeX;
        this.sizeY = sizeY;

        this.squareSize = squareSize;

        this.el.style.width = (squareSize * this.sizeX) + 'px';
        this.el.style.height = (squareSize * this.sizeY) + 'px';

        this.entityIdCounter = 0;

        this.squares;

        // This array is redundant (because entities are essentially inside
        // squares), but is a good performance helper
        this.entities;

        // Permutations of all existing entities. Ex: if e1, e2, e3 exist in
        // the game, the permutations will be e1-e2, e1-e3 and e2-e3
        this.entityPermutations = [];

        this.player;

        // A list of collision handlers to be used in this game
        this.collisionHandlers = [];

        /*********************************************************************/

        this.isInside = function(position, size) {
            if (!size) {
                size = { x: 1, y: 1 };
            }

            if (position.x < 0 || position.y < 0) {
                return false;
            }

            if (position.x + size.x > this.sizeX ||
                position.y + size.y > this.sizeY) {
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

            var square = this.getSquare(new Wandrian.Vector(e.position));

            if (!square) {
                return null;
            }

            if (square.entity) {
                // There's already an entity here
                return null;
            }

            // Update position in square
            square.setEntity(entity);
            this.dirty = true;

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
                        entity.el.parentNode.removeChild(entity.el);

                        // Remove object
                        this.squares[i][j].setEntity(null);

                        // Remove from redundant entity array
                        var index = this.entities.indexOf(entity);
                        this.entities.splice(index, 1);

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

        this.areOverlapping = function(entity1, entity2) {
            var e1x1 = entity1.nextPosition.x;
            var e1x2 = entity1.nextPosition.x + entity1.size.x;
            var e2x1 = entity2.nextPosition.x;
            var e2x2 = entity2.nextPosition.x + entity2.size.x;

            var e1y1 = entity1.nextPosition.y;
            var e1y2 = entity1.nextPosition.y + entity1.size.y;
            var e2y1 = entity2.nextPosition.y;
            var e2y2 = entity2.nextPosition.y + entity2.size.y;

            if (e1x1 < e2x2 && e1x2 > e2x1 &&
                e1y1 < e2y2 && e1y2 > e2y1) {

                return true;
            }

            return false;
        };

        this.genesis = function(
            customSquares,
            entities,
            player,
            collisionHandlers
        ) {
            // Clean everything (in case of a restart)
            this.el.innerHTML = '';

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
                    this.createEmptySquare(new Wandrian.Vector(i, j));
                }
            }

            // Replace empty squares with custom squares
            for (var i=0; i<customSquares.length; i++) {
                var cs = customSquares[i];
                var square = new window[cs.type](new Wandrian.Vector(cs.position), this);
                this.setSquare(square);
            }

            // Create the world grid and add all squares to it
            for (var i=0; i<this.sizeY; i++) {
                for (var j=0; j<this.sizeX; j++) {
                    var sq = this.getSquare(new Wandrian.Vector(j, i));

                    if (sq.el) {
                        this.el.appendChild(sq.el);
                    }
                }
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
                if (iterationCounter >= 100000) {
                    console.error(
                        'The collision handling iteration loop has reached ' +
                        'more than 100000 iterations. Basically, your ' +
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
                        var areOverlapping = this.areOverlapping(p.entity1, p.entity2);

                        if (areOverlapping || (square && square.blocking)) {
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
            for (var i=0; i<this.entities.length; i++) {
                var entity = this.entities[i];

                if (!entity.dirty) { continue; }

                if (entity) {
                    entity.el.style.top = (this.squareSize * entity.square.position.y) + 'px';
                    entity.el.style.left = (this.squareSize * entity.square.position.x) + 'px';
                }

                entity.dirty = false;
            }
        };

        this.loop = function() {
            // console.time('loop');
            this.loopEntities();
            this.loopHandleCollisions();
            this.loopMoveEveryone();
            this.loopRedraw();
            // console.timeEnd('loop');
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

        this.events = {};

        Wandrian.Game.Audio = {};
        Wandrian.Game.Sprites = {};

        // Load resources in a static variable
        if (gameData.resources) {
            if (gameData.resources.audio) {
                var audioResources = gameData.resources.audio;

                for (var audio in audioResources) {
                    var src = audioResources[audio].src;
                    var loop = audioResources[audio].loop ? true : false;

                    var wAudio = new Wandrian.Audio(audio, 'audio/' + src, loop);
                    Wandrian.Game.Audio[audio] = wAudio;
                }
            }

            if (gameData.resources.sprites) {
                var spriteResources = gameData.resources.sprites;

                for (var sprite in spriteResources) {
                    var src = spriteResources[sprite].src;
                    var from = spriteResources[sprite].from;
                    var to = spriteResources[sprite].to;
                    var time = spriteResources[sprite].time;
                    var steps = spriteResources[sprite].steps;
                    var loop = spriteResources[sprite].loop ? true : false;

                    var wSprite = new Wandrian.Sprite(
                        sprite, 'sprites/' + src, from, to, time, steps, loop);
                    Wandrian.Game.Sprites[sprite] = wSprite;
                }
            }
        }

        this.world = new Wandrian.World(
            gameData.world.size.x,
            gameData.world.size.y,
            gameData.world.id,
            gameData.world.squareSize
        );

        this.gameOver = function() {
            if (!this.gameIsOver) {
                this.events.afterGameOver.call(this);
            }

            this.gameIsOver = true;

        };

        this.loop = function() {
            if (!this.gameIsOver) {
                this.events.beforeLoop.call(this);
                this.world.loop();
                this.events.afterLoop.call(this);
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

            if (!this.events) {
                this.events = {};
            }

            var gameEvents = [
                'afterGameOver',
                'beforeLoop',
                'afterLoop'
            ];

            for (var event in this.events) {
                if (gameEvents.indexOf(event) == -1) {
                    document.addEventListener(
                        event, this.events[event].bind(this), false);
                }
            }

            for(var i=0; i<gameEvents.length; i++) {
                var event = gameEvents[i];

                if (!this.events[event]) {
                    this.events[event] = function() {};
                }
            }

            this.loopInterval = setInterval(
                this.loop.bind(this), this.loopPeriod);
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
                    this.loop.bind(this), this.loopPeriod);
            }
        };
    },

    /****************************** RESOURCES *******************************/

    Audio: function(name, src, loop) {
        this.name = name;
        this.src = src;

        this.el = document.createElement('audio');
        this.el.src = this.src;

        this.setLoop = function(loop) {
            this.el.loop = loop;
        }

        this.setLoop(loop);

        this.play = function() {
            this.el.play();
        };

        this.stop = function() {
            this.el.pause();
            this.el.currentTime = 0;
        };

        this.pause = function() {
            this.el.pause();
        };
    },

    Sprite: function(name, src, from, to, time, steps, loop) {
        this.name = name;
        this.src = src;
        this.time = time;
        this.steps = steps;
        this.loop = loop;

        this.createCSSRule = function(rules) {
            var style = document.createElement('style');
            style.type = 'text/css';
            style.innerHTML = rules;

            document.getElementsByTagName('head')[0].appendChild(style);
        };

        // TODO - Could this be better? How?
        this.createCSSRule(
            '@-webkit-keyframes w-keyframes-' + this.name +
            ' { from { background-position: ' + from.x +
            'px; } to { background-position: ' + to.x + 'px; } }'
        );

        var loopStr = this.loop ? 'infinite' : '';

        this.createCSSRule(
            '.w-sprite-' + this.name + ' {' +
            // '    width: 50px;' +
            // '    height: 72px;' +
            '    background-image: url("' + this.src + '");' +
            '    -webkit-animation: w-keyframes-' + this.name + ' ' + this.time + 's steps(' + steps + ') ' + loopStr + ';' +
            '       -moz-animation: w-keyframes-' + this.name + ' ' + this.time + 's steps(' + steps + ') ' + loopStr + ';' +
            '        -ms-animation: w-keyframes-' + this.name + ' ' + this.time + 's steps(' + steps + ') ' + loopStr + ';' +
            '         -o-animation: w-keyframes-' + this.name + ' ' + this.time + 's steps(' + steps + ') ' + loopStr + ';' +
            '            animation: w-keyframes-' + this.name + ' ' + this.time + 's steps(' + steps + ') ' + loopStr + ';' +
            '}'
        );

        this.play = function() {

        };

        this.stop = function() {

        };

    },

    /******************************* BUILDERS *******************************/

    GameBuilder: function(params) {
        return function(gameData) {
            Wandrian.Game.call(this, gameData);

            for (var p in params) {
                this[p] = params[p];
            }
        }
    },

    EntityBuilder: function(params) {
        if (!params.extends) {
            params.extends = Wandrian.Entity;
        }

        return function(world) {
            if (params.size) {
                params.extends.call(this, world, params.size);
            }
            else {
                params.extends.call(this, world);
            }

            for (var p in params) {
                this[p] = params[p];
            }


            // TODO - I don't like this here
            if (params.className) {
                this.el.className += ' ' + params.className;
            }

            if (this.init) {
                this.init();
            }
        }
    },

    SquareBuilder: function(params) {
        if (!params.blocking) {
            params.blocking = false;
        }

        return function(position, world) {
            Wandrian.Square.call(this, position, world);

            // TODO - I don't like this here (should be in the constructor)
            this.el = document.createElement('div')
            this.el.className = 'w-square';

            this.el.style.width = world.squareSize + 'px';
            this.el.style.height = world.squareSize + 'px';

            this.el.style.top = (world.squareSize * position.y) + 'px';
            this.el.style.left = (world.squareSize * position.x) + 'px';

            if (params.className) {
                this.el.className += ' ' + params.className;
            }

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
