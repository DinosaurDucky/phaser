
var game = new Phaser.Game(800, 600, Phaser.AUTO, '',
        {preload: preload, create: create, update: update});
var NEXT_BRICK_ID = 0;
var SPAWN_TIMER = 2;
var UI_WIDTH = 300;
var PLAY_WIDTH = game.width - UI_WIDTH;
var COLUMN_WIDTH = 70;
var NUM_COLUMNS = Math.floor(PLAY_WIDTH / COLUMN_WIDTH);
var NUM_ROWS = NUM_COLUMNS;
var COLUMN_HEIGHT = COLUMN_WIDTH;
var MAX_RANDOM = 5;

var platforms;
var cursors;
var bricks;
var bottom_bricks;
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

    /*
     //phys1
     game.physics.startSystem(Phaser.Physics.ARCADE);
     
     platforms.enableBody = true;
     ground.body.immovable = true;
     ground.body.bounce.set(0);
     */
    var sky = game.add.sprite(0, 0, 'sky');
    sky.scale.setTo(5 / 8, 1);
    platforms = game.add.group();
    var ground = platforms.create(0, game.world.height - 200, 'ground');
    ground.scale.setTo(1.25, 8);

    /* /leave */

    for (var i = 0; i < NUM_COLUMNS; ++i)
        brick_grid.push([]);

    /*
     // phys2
     bricks.enableBody = true;
     */
    bricks = game.add.group(game, game, true, true);

    for (var i = 0; i < 1; ++i) {
        var brick = Brick(-1, -1, -1);
    }

    bottom_bricks = game.add.group(game, game, true, true);

    scoreText = game.add.text(PLAY_WIDTH + 16, 16, 'score: 0',
            {fontSize: '32px Helvetica', fill: '#ffffff', align: 'center'});


    game.time.events.add(Phaser.Timer.SECOND * SPAWN_TIMER, brickMaker, this);

    game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR).onDown.add(hitSpace);
    game.input.keyboard.addKey(Phaser.Keyboard.A).onDown.add(twerkBottom);
}

// TODO: figure out why the fuck this shit odnt work
function twerkBottom() {
    if (bottom_bricks.length < 2)
        return;

    b1 = bottom_bricks.getAt(0);
    b2 = bottom_bricks.getAt(1);

    game.add.tween(b1).to({x: b2.x, y: b2.y}, 100, Phaser.Easing.Linear.In, true);
    game.add.tween(b2).to({x: b1.x, y: b1.y}, 100, Phaser.Easing.Linear.In, true);
}

function hitSpace() {
    console.log("spacebard!");
    for (b in lit_bricks) {
        lit_bricks[b].loadTexture('brick_orange');
        lit_bricks[b].highlighted = false;
    }
    lit_bricks.splice(0, lit_bricks.length); // empty lit_bricks
    bottom_bricks.destroy(true, true);
}

function brickMaker() {
    Brick(-1, -1, -1);
    game.time.events.add(Phaser.Timer.SECOND * SPAWN_TIMER, brickMaker);
}

function sinkBrick(brick, row) {
    game.add.tween(brick).to({y: rowToY(row)}, 100,
            Phaser.Easing.Linear.In, true);
}

function sinkAll(){
    for (var col = 0; col < brick_grid.length; ++col){
        sinkColumn(col);
    }
}
function sinkColumn(col){
    for (var row = 0; row < brick_grid[col].length; ++row){
        sinkBrick(brick_grid[col][row], row);
    }
    
}

// negative params for defaults. x default: random colum. y default: 0.
// number default: random int in {1, 2, ..., MAX_RANDOM}
function Brick(col, row, number) {
    if (col < 0)
        col = Math.floor(Math.random() * NUM_COLUMNS);
    if (row < 0)
        row = findTopOfColumn(col);
    if (number < 0)
        number = Math.floor(Math.random() * MAX_RANDOM + 1);

    // create brick:
    console.log("brick row:" + row + "rowtoy: " + rowToY(row));
    var brick = bricks.create(colToX(col), 0, 'brick_orange'); // maybe rowToY()?
    brick.id = NEXT_BRICK_ID++; // unique id of THIS brick
    bricks.add(brick);
    brick.number = number
    brick.anchor.set(.5);
    brick.scale.setTo(.55, .55);

    brick_grid[col][row] = brick;

    // brick number text:  
    var text = game.add.text(0, 0, brick.number.toString(),
            {font: "42px Helvetica", fill: "#aaffff"});
    text.anchor.set(0.5);
    brick.addChild(text);

    sinkBrick(brick, row);

    // brick mouse event:
    brick.highlighted = false;
    brick.inputEnabled = true;
    brick.events.onInputDown.add(clickBrick, this);

}

function copyToBottom(brick) {
    var index = lit_bricks.length;
    var bottomBrick = bottom_bricks.create(index * COLUMN_WIDTH / 2, 500, 'brick_orange');
    bottom_bricks.add(bottomBrick);
    bottomBrick.number = brick.number;
    bottomBrick.anchor.set(0.5);
    bottomBrick.scale.setTo(.55, .55);

    // brick number text:    
    var text = game.add.text(0, 0, bottomBrick.number.toString(),
            {font: "42px Helvetica", fill: "#aaffff"});
    text.anchor.set(0.5);
    bottomBrick.addChild(text);

    return bottomBrick;
}

function findTopOfColumn(col) {
    if (col < 0 || col >= NUM_COLUMNS)
        return -2; // flag: invalid column
    if (brick_grid[col].length < NUM_ROWS)
        return brick_grid[col].length;
    return -1; // flag: too many bricks already in this column (it's full)
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

function colToX(col) {
    return Math.floor(COLUMN_WIDTH / 3) + col * COLUMN_WIDTH;
}

function rowToY(row) {
    return 400 - row * COLUMN_HEIGHT;
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
    if (b1 == b2)
        return false;

    var c1 = getCol(b1);
    var c2 = getCol(b2);
    if (Math.abs(c1 - c2) > 1)
        return false;

    var r1 = getRow(b1);
    var r2 = getRow(b2);
    if (Math.abs(r1 - r2) > 1)
        return false;

    return true;
}

function clickBrick(brick) {
    if (lit_bricks.length == 0 ||
            areAdjacent(brick, lit_bricks[lit_bricks.length - 1])) {
        if (!brick.hightlighted) {
            brick.loadTexture('brick_orange_highlight');
            brick.highlighted = true;
            lit_bricks.push(brick);
            copyToBottom(brick);
            checkSum(brick);

        }
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
        bottom_bricks.destroy(true, true);
        sinkAll();
    }
}


function update() {
    ++GAME_TIME;

    /*
     //phys3
     game.physics.arcade.collide(bricks, platforms);
     game.physics.arcade.collide(bricks, bricks);
     */
}