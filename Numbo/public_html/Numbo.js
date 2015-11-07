
var game = new Phaser.Game(800, 600, Phaser.AUTO, '',
        {preload: preload, create: create, update: update});
var NEXT_BRICK_ID = 0;
var SPAWN_TIMER = 2;
var UI_WIDTH = 300;
var PLAY_WIDTH = game.width - UI_WIDTH;
var COLUMN_WIDTH = 100;
var NUM_COLUMNS = Math.floor(PLAY_WIDTH / COLUMN_WIDTH);
var NUM_ROWS = NUM_COLUMNS;
var MAX_RANDOM = 20;

var platforms;
var cursors;
var bricks;
var lit_bricks = [];
var brick_grid = []; //2d: [col][row]

var GAME_TIME = 0;
var score = 0;
var scoreText;

function preload() {
    game.load.image('logo', 'phaser.png');
    game.load.image('sky', 'assets/sky.png');
    game.load.image('ground', 'assets/platform.png');
    game.load.image('star', 'assets/star.png');
    game.load.image('brick_orange', 'assets/brick_orange_blank.png');
    game.load.image('brick_orange_highlight', 'assets/brick_orange_highlight.png');
    game.load.spritesheet('dude', 'assets/dude.png', 32, 48);
}

function create() {

    /* most of this crap should leave: */
    game.physics.startSystem(Phaser.Physics.ARCADE);
    var sky = game.add.sprite(0, 0, 'sky');
    sky.scale.setTo(5 / 8, 1);
    platforms = game.add.group();
    platforms.enableBody = true;
    var ground = platforms.create(0, game.world.height - 200, 'ground');
    ground.scale.setTo(1.25, 8);
    ground.body.immovable = true;
    ground.body.bounce.set(0);
    /* /leave */

    for (var i = 0; i < NUM_COLUMNS; ++i)
        brick_grid.push([]);

    bricks = game.add.group(game, game, true, true);
    bricks.enableBody = true;

    for (var i = 0; i < 1; ++i) {
        var brick = Brick(-1, -1, -1);
    }

    scoreText = game.add.text(PLAY_WIDTH + 16, 16, 'score: 0',
            {fontSize: '32px Helvetica', fill: '#ffffff', align: 'center'});


    game.time.events.add(Phaser.Timer.SECOND * SPAWN_TIMER, brickMaker, this);

    game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR).onDown.add(hitSpace);
}

function hitSpace() {
    console.log("spacebard!");
    for (b in lit_bricks) {
        lit_bricks[b].loadTexture('brick_orange');
        lit_bricks[b].highlighted = false;
    }
    lit_bricks.splice(0, lit_bricks.length); // empty lit_bricks
}

function brickMaker() {
    Brick(-1, -1, -1);
    game.time.events.add(Phaser.Timer.SECOND * SPAWN_TIMER, brickMaker);
}

// negative params for defaults. x default: random colum. y default: 0.
// number default: random int in {1, 2, ..., MAX_RANDOM}
function Brick(x, y, number) {
    if (x < 0)
        x = COLUMN_WIDTH / 2
                + Math.floor(Math.random() * NUM_COLUMNS) * COLUMN_WIDTH;
    if (y < 0)
        y = 0;
    if (number < 0)
        number = Math.floor(Math.random() * MAX_RANDOM + 1);

    var brick = bricks.create(x, y, 'brick_orange');
    brick.id = NEXT_BRICK_ID++; // unique id of THIS brick
    bricks.add(brick);
    brick.number = number
    brick.anchor.set(.5);
    brick.scale.setTo(.55, .55);
    brick.body.gravity.y = 20 + brick.number;
    brick.body.bounce.x = 0.5;
    brick.body.bounce.y = 0.2;

    // brick number text:    
    var text = game.add.text(0, 0, brick.number.toString(),
            {font: "42px Helvetica", fill: "#aaffff"});
    text.anchor.set(0.5);
    brick.addChild(text);

    // brick mouse event:
    brick.highlighted = false;
    brick.inputEnabled = true;
    brick.events.onInputDown.add(clickBrick, this);

    //insert brick into brick_grid
    var col = Math.floor(brick.x / COLUMN_WIDTH);
    var row = findTopOfColumn(col);
    brick_grid[col][row] = brick;
    //console.log("num=" + brick.number + ", col= " + col + ', row=' + row);
    return brick;
}

function findTopOfColumn(col) {
    if (col < 0 || col >= NUM_COLUMNS)
        return null;
    if (brick_grid[col].length < NUM_ROWS)
        return brick_grid[col].length;
    return -1; // flag: too many in this column
}

function removeBrickById(id) {
    for (var col = 0; col < NUM_COLUMNS; ++col) {
        for (var row = 0; row < brick_grid[col].length; ++row) {
            var brick = brick_grid[col][row];
            if (brick.id == id) {
                console.log("found brick id: " + id + ", col: "
                        + col + ", row: " + row + ", num: " + brick.number);
                brick_grid[col].splice(row, 1);
            }
        }
    }
}

function getCol(brick) {
    return Math.floor(brick.x / COLUMN_WIDTH);
}

function getRow(brick) {
    var col = getCol(brick);
    for (var row = 0; row < brick_grid[col].length; ++row) {
        if (brick_grid[col][row].id == brick.id) {
            return row;
        }
    }
}

function areAdjacent(b1, b2) {
    var c1 = getCol(b1);
    var c2 = getCol(b2);

    if (Math.abs(c1 - c2) > 1) {
        console.log("c1-c2 = " + Math.abs(c1 - c2));
        return false;
    }
    var r1 = getRow(b1);
    var r2 = getRow(b2);
    if (Math.abs(r1 - r2) > 1) {
        console.log("r1-r2 = " + Math.abs(r1 - r2));
        return false;
    }
    return true;
}

function clickBrick(brick) {
    //console.log("clicked brick #" + brick.id);

    if (lit_bricks.length > 0) {
        if (areAdjacent(brick, lit_bricks[lit_bricks.length - 1])) {
            console.log("adjacent!");
        }
        else {
            console.log("NOT adjacent");
        }
    }

    if (brick.highlighted) {
        brick.loadTexture('brick_orange');
        brick.highlighted = false;
    }
    else {
        brick.loadTexture('brick_orange_highlight');
        brick.highlighted = true;
        lit_bricks.push(brick);
        checkSum(brick);
    }


}

function checkSum(brick) {
    if (lit_bricks.length == 1)
        return;

    var sum = -2 * brick.number;
    for (b in lit_bricks)
        sum += lit_bricks[b].number;

    if (sum == 0) {
        score += lit_bricks.length;
        scoreText.text = 'Score: ' + score;
        for (b in lit_bricks) {
            console.log("killing brick, id:" + lit_bricks[b].id);
            removeBrickById(lit_bricks[b].id);
            lit_bricks[b].kill();
        }
        lit_bricks.splice(0, lit_bricks.length); // empty lit_bricks
    }
}


function update() {
    ++GAME_TIME;

    game.physics.arcade.collide(bricks, platforms);
    game.physics.arcade.collide(bricks, bricks);

}