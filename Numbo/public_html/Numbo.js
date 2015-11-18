
var game = new Phaser.Game(800, 600, Phaser.AUTO, '',
        {preload: preload, create: create, update: update});

var SPAWN_TIMER = 2.00;             // param, defaut: 2.0
var TIMER_SCALAR = 0.85;            // param, default: 0.85
var MAX_RANDOM = 5;                 // param, default: 5
var COLLAPSE_EMPTY_COLUMNS = true;  // param, default: true
var ENABLE_LEVELUP = true;          // param, default: true
var NUM_COLUMNS = 6;                // param, default: 6
var NUM_ROWS = 6;                    // param, default: 6

var UI_WIDTH = 300;
var UI_HEIGHT = 200;
var PLAY_WIDTH = game.width - UI_WIDTH;
var PLAY_HEIGHT = game.height - UI_HEIGHT;
var COLUMN_WIDTH = Math.floor(PLAY_WIDTH / NUM_COLUMNS);
var ROW_HEIGHT = Math.floor(PLAY_HEIGHT / NUM_ROWS);
var NEXT_BRICK_ID = 0;
var GAME_TIME = 0;
var MAX_LEVEL_UP;

var platforms;
var operators;
var bricks;
var bottom_bricks;
var lit_bricks = [];
var brick_grid = []; //2d: [col][row]
var levelUpPoints;
var yay_text_database;
var text_group;
var random_weighted;

var current_operator;
var two_sides = false;
var LHS = 0;
var RHS = 0;
var score = 0;
var scoreText;
var level = 1;
var levelText;
var frequencyText;
var maxNumberText;
var yayText;

function preload() {
    game.load.image('logo', 'phaser.png');
    game.load.image('sky', 'assets/sky.png');
    game.load.image('ground', 'assets/platform.png');
    game.load.image('star', 'assets/star.png');
    game.load.image('brick_orange', 'assets/brick_orange_blank.png');
    game.load.image('brick_orange_highlight', 'assets/brick_orange_highlight.png');
    game.load.image('operator_pink', 'assets/operator_pink_blank.png');
    game.load.image('operator_pink_highlight', 'assets/operator_pink_highlight.png');
    game.load.spritesheet('dude', 'assets/dude.png', 32, 48);
}

function create() {

// create background:
    {
        var sky = game.add.sprite(0, 0, 'sky');
        sky.scale.setTo(5 / 8, 1);
        platforms = game.add.group();
        var ground = platforms.create(0,
                PLAY_HEIGHT + Math.floor(ROW_HEIGHT / 3), 'ground');
        ground.scale.setTo(1.25, 10);
    }

// initialize brick_grid, bricks, bottom_bricks:
    {
        for (var i = 0; i < NUM_COLUMNS; ++i)
            brick_grid.push([]);
        bricks = game.add.group(game, game, true, true);
        bottom_bricks = game.add.group(game, game, true, true);
    }

    // initialize operator buttons:
    {
        operators = game.add.group(game, game, true, true);

        Operator('×', Math.floor(PLAY_WIDTH + UI_WIDTH / 3),
                Math.floor(PLAY_HEIGHT - 2 * UI_HEIGHT / 3));
        Operator('÷', Math.floor(PLAY_WIDTH + 2 * UI_WIDTH / 3),
                Math.floor(PLAY_HEIGHT - 2 * UI_HEIGHT / 3));
        Operator('+', Math.floor(PLAY_WIDTH + UI_WIDTH / 3),
                Math.floor(PLAY_HEIGHT - UI_HEIGHT / 3));
        Operator('-', Math.floor(PLAY_WIDTH + 2 * UI_WIDTH / 3),
                Math.floor(PLAY_HEIGHT - UI_HEIGHT / 3));
        Operator('=', Math.floor(PLAY_WIDTH + UI_WIDTH / 2), PLAY_HEIGHT);

    }

    // initialize random weighted array:
    {
        random_weighted = [1, 1, 2, 3];
        for (var el = 1; el <= MAX_RANDOM; ++el) {
            random_weighted.push(el);
        }
    }

// create text objects
    {
        text_group = game.add.group(game, game, true, true);

        scoreText = game.add.text(PLAY_WIDTH + 16, 16, 'score: 0',
                {fontSize: '32px Helvetica', fill: '#ffffff', align: 'center'});
        text_group.add(scoreText);
        levelText = game.add.text(PLAY_WIDTH + 16, 56, 'level: 1',
                {fontSize: '32px Helvetica', fill: '#ffffff', align: 'center'});
        text_group.add(levelText);
        maxNumberText = game.add.text(PLAY_WIDTH + 16, 96,
                'max brick: ' + MAX_RANDOM,
                {fontSize: '32px Helvetica', fill: '#ffffff', align: 'center'});
        text_group.add(maxNumberText);
        frequencyText = game.add.text(PLAY_WIDTH + 16, 136,
                'frequency: ' + SPAWN_TIMER.toFixed(2) + 's',
                {fontSize: '32px Helvetica', fill: '#ffffff', align: 'center'});
        text_group.add(frequencyText);

        levelUpPoints = {1: 7, 2: 14, 3: 22, 4: 32, 5: 45, 6: 62, 7: 84, 8: 112, 9: 147,
            10: 190, 11: 242, 12: 304, 13: 377, 14: 462, 15: 560};
        MAX_LEVEL_UP = Object.keys(levelUpPoints).length;

        yay_text_database = {0: "w00t!", 1: "booya!", 2: "ya-hoo!",
            3: "ch'yea!", 4: "oh wow!", 5: "so gud!", 6: "holy crap"};
        yayText = game.add.text(PLAY_WIDTH + Math.floor(UI_WIDTH / 2), 250, "",
                {align: 'center', stroke: '#dddddd', fill: '#d94243', strokeThickness: 3});
        yayText.fontSize = 50;
        yayText.anchor.set(0.5);
        text_group.add(yayText);
    }


    game.time.events.add(Phaser.Timer.SECOND * SPAWN_TIMER, brickMaker, this);
    game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR).onDown.add(hitSpace);
    game.input.keyboard.addKey(Phaser.Keyboard.ENTER).onDown.add(hitEnter);
    game.input.keyboard.addKey(Phaser.Keyboard.Q).onDown.add(hitMultiply);
    game.input.keyboard.addKey(Phaser.Keyboard.W).onDown.add(hitDivide);
    game.input.keyboard.addKey(Phaser.Keyboard.A).onDown.add(hitAdd);
    game.input.keyboard.addKey(Phaser.Keyboard.S).onDown.add(hitSubtract);
    game.input.keyboard.addKey(Phaser.Keyboard.Z).onDown.add(hitEquals);
    game.input.keyboard.addKey(Phaser.Keyboard.X).onDown.add(hitEquals);

}

// negative params for defaults. x default: random column. y default: 0.
// number default: random int in {1, 2, ..., MAX_RANDOM}
function Brick(col, row, number) {
// try 20 times to find an empty row; if none found, assume all are full:
    var attempts = 0;
    while (attempts < 20 && (col < 0 || brick_grid[col].length >= NUM_ROWS)) {
        col = Math.floor(Math.random() * NUM_COLUMNS);
        ++attempts;
    }
    if (col < 0 || brick_grid[col].length >= NUM_ROWS)
        return null;
    if (row < 0)
        row = findTopOfColumn(col);
    if (number < 0)
        number = random_weighted[Math.floor(Math.random() * random_weighted.length)];

    // create brick:
    var brick = bricks.create(colToX(col), 0, 'brick_orange'); // maybe rowToY()?
    brick.id = NEXT_BRICK_ID++; // unique id of THIS brick
    bricks.add(brick);
    brick.number = number
    brick.anchor.set(.5);
    brick.scale.setTo(0.7, 0.7);
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
    if (COLLAPSE_EMPTY_COLUMNS)
        game.time.events.add(100, collapseColumns);
}

/*      ÷ × - + =         */
function Operator(op, x, y) {
    var operator = operators.create(x, y, 'operator_pink');
    operator.op = op;
    operators.add(operator);
    if (operator.op == '-')
        operator.anchor.set(.5, .5);
    else
        operator.anchor.set(.5, .55);

    operator.scale.setTo(0.7, 0.7);
    var text = game.add.text(0, 0, operator.op.toString(),
            {font: "84px Helvetica", fill: "#aaffff"});
    text.anchor.set(0.5);
    operator.addChild(text);

    // operator mouse event:
    operator.highlighted = false;
    operator.inputEnabled = true;
    operator.events.onInputDown.add(clickOperator, this);
}

function clickOperator(operator) {
    if (operator.op == "=" && two_sides == false) {
        two_sides = true;
        copyToBottom(operator);
    }
    else {

        operators.forEach(function (O) {
            if (O.highlighted) {
                O.highlighted = false;
                O.loadTexture('operator_pink');
            }
        }, this);
        current_operator = operator;
        operator.loadTexture('operator_pink_highlight');
        operator.highlighted = true;
    }
}

function hitEnter() {
    ;
}


function brickMaker() {
    Brick(-1, -1, -1);
    game.time.events.add(Phaser.Timer.SECOND * SPAWN_TIMER, brickMaker);
}

function sinkBrick(brick, row) {
    game.add.tween(brick).to({y: rowToY(row)}, 100,
            Phaser.Easing.Linear.In, true);
}
function sinkColumn(col) {
    for (var row = 0; row < brick_grid[col].length; ++row) {
        sinkBrick(brick_grid[col][row], row);
    }
}
function sinkAll() {
    for (var col = 0; col < brick_grid.length; ++col) {
        sinkColumn(col);
    }
}

function clickBrick(brick) {
    if (lit_bricks.length == 0 || (lit_bricks.indexOf(brick) < 0 &&
            areAdjacent(brick, lit_bricks[lit_bricks.length - 1]))) {
        if (!brick.hightlighted) {
            brick.loadTexture('brick_orange_highlight');
            brick.highlighted = true;

            lit_bricks.push(brick);

            if (bottom_bricks.length > 0
                    && bottom_bricks.getTop().type == "number")
                copyToBottom(current_operator);
        }
        copyToBottom(brick);
        //if (lit_bricks.length >= 3)
        //    checkSum(brick);


        if (two_sides) {
            if (RHS == 0)
                RHS = brick.number;
            else {
                RHS = doOperation(current_operator.op, RHS, brick.number);
            }
        }
        else {
            if (LHS == 0)
                LHS = brick.number;
            else {
                LHS = doOperation(current_operator.op, LHS, brick.number);
            }
        }
        console.log("LHS: " + LHS + ", RHS: " + RHS);

        checkEquality();
    }
}


function checkEquality() {
    if (two_sides && LHS == RHS) {
        score += Math.floor(1.5 * lit_bricks.length - 1);
        scoreText.text = 'score: ' + score;
        for (b in lit_bricks) {
            removeBrickById(lit_bricks[b].id);
            lit_bricks[b].kill();
        }
        lit_bricks.splice(0, lit_bricks.length); // empty lit_bricks
        bottom_bricks.destroy(true, true);
        sinkAll();
        checkScore();
        yayEffect();

        LHS = 0;
        RHS = 0;
        two_sides = false;

        if (COLLAPSE_EMPTY_COLUMNS)
            game.time.events.add(100, collapseColumns);
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

function copyToBottom(brick) {
    var index = bottom_bricks.length;
    var bottomBrick;

    if (brick.parent == operators) {
        bottomBrick = bottom_bricks.create((index + 1) * COLUMN_WIDTH / 2, 500, 'operator_pink');
        bottomBrick.type = "operator";
        bottomBrick.op = brick.op;
        var text = game.add.text(0, 0, bottomBrick.op,
                {font: "42px Helvetica", fill: "#aaffff"});
    }
    else if (brick.parent == bricks) {
        bottomBrick = bottom_bricks.create((index + 1) * COLUMN_WIDTH / 2, 500, 'brick_orange');
        bottomBrick.type = "number";
        bottomBrick.number = brick.number;
        var text = game.add.text(0, 0, bottomBrick.number.toString(),
                {font: "42px Helvetica", fill: "#aaffff"});
    }
    bottom_bricks.add(bottomBrick);

    bottomBrick.anchor.set(0.5);
    bottomBrick.scale.setTo(.55, .55);
    text.anchor.set(0.5);
    bottomBrick.addChild(text);

    return bottomBrick;
}

// old version (dont work w/ operators)
/*
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
 */
function checkSum(brick) {
    if (lit_bricks.length == 1)
        return;
    var sum = -2 * brick.number;
    for (b in lit_bricks)
        sum += lit_bricks[b].number;
    if (sum == 0) {
        score += Math.floor(1.5 * lit_bricks.length - 1);
        scoreText.text = 'score: ' + score;
        for (b in lit_bricks) {
            removeBrickById(lit_bricks[b].id);
            lit_bricks[b].kill();
        }
        lit_bricks.splice(0, lit_bricks.length); // empty lit_bricks
        bottom_bricks.destroy(true, true);
        sinkAll();
        checkScore();
        yayEffect();

        if (COLLAPSE_EMPTY_COLUMNS)
            game.time.events.add(100, collapseColumns);
    }
}
function removeBrickById(id) {
    for (var col = 0; col < NUM_COLUMNS; ++col) {
        for (var row = 0; row < brick_grid[col].length; ++row) {
            var brick = brick_grid[col][row];
            if (brick.id == id) {
                brick_grid[col].splice(row, 1);
            }
        }
    }
}

function checkScore() {
    if (ENABLE_LEVELUP == false)
        return;
    if (level < MAX_LEVEL_UP && score >= levelUpPoints[level]) {
        ++level;
        levelText.text = "level: " + level;
        if (level & 1) {
            ++MAX_RANDOM;
            random_weighted.push(MAX_RANDOM);
            maxNumberText.text = 'max brick: ' + MAX_RANDOM;
        }
        else {
            SPAWN_TIMER *= TIMER_SCALAR;
            frequencyText.text = 'frequency: ' + SPAWN_TIMER.toFixed(3) + 's';
        }

        //yayEffect();
    }
}

function yayEffect() {
    yayText = game.add.text(0, 250, "",
            {align: 'center', stroke: '#dddddd', fill: '#d94243', strokeThickness: 3});
    text_group.add(yayText);
    yayText.fontSize = 20;
    yayText.anchor.set(0.5);

    var randIndex = Math.floor(Math.random() *
            Object.keys(yay_text_database).length);
    var randYayString = "" + yay_text_database[randIndex];
    yayText.text = randYayString;

    game.add.tween(yayText).to({fontSize: 80, x: game.world.centerX}, 100,
            Phaser.Easing.Linear.In, true);
    game.add.tween(yayText).to({fontSize: 80}, 150,
            Phaser.Easing.Linear.In, true);
    game.time.events.add(300, yayEffectEnd, this);

}
function yayEffectEnd() {
    game.add.tween(yayText).to({fontSize: 1, x: 2 * game.world.centerX - 1}, 100,
            Phaser.Easing.Linear.In, true);
    game.time.events.add(100, function () {
        yayText.destroy();
        yayText = null;
    }, this);

}

function hitAdd() {
    operators.forEach(function (O) {
        if (O.op == '+') {
            clickOperator(O);
            return;
        }
    }, this);
}

function hitSubtract() {
    operators.forEach(function (O) {
        if (O.op == '-') {
            clickOperator(O);
            return;
        }
    }, this);
}

function hitMultiply() {
    operators.forEach(function (O) {
        if (O.op == '×') {
            clickOperator(O);
            return;
        }
    }, this);

}
function hitDivide() {
    operators.forEach(function (O) {
        if (O.op == '÷') {
            clickOperator(O);
            return;
        }
    }, this);
}

function hitEquals() {
    operators.forEach(function (O) {
        if (O.op == '=') {
            clickOperator(O);
            return;
        }
    }, this);
}

function hitSpace() {
    LHS = 0;
    RHS = 0;
    two_sides = false;

    for (b in lit_bricks) {
        lit_bricks[b].loadTexture('brick_orange');
        lit_bricks[b].highlighted = false;
    }
    lit_bricks.splice(0, lit_bricks.length); // empty lit_bricks
    bottom_bricks.destroy(true, true);
}


/*      ÷ × - + =         */
function doOperation(operator, L, R) {
    operator = operator || "";
    if (operator == "=") {
        if (two_sides == false)
            two_sides = true;
        else {
            console.log("too many equalses!");
        }
    }
    else if (L !== undefined && R !== undefined) {
        switch (operator) {
            case '+':
                return L + R;
                break;
            case '-':
                return L - R;
                break;
            case '×':
                return L * R;
                break;
            case '÷':
                return L % R ? L : L / R;
                break;
            default:
                console.log("bad operator!");
                return 0;
        }
    }
    return 0;
}

function collapseColumns() {
    var middle_col = Math.floor(NUM_COLUMNS / 2);
    collapseLeftSide(middle_col);
    collapseRightSide(middle_col);
    scootColumns();
}

function collapseLeftSide(col) {
    for (; col >= 0; --col) {
        if (brick_grid[col].length == 0) {
            var target = col;
            while (target >= 0) {
                if (brick_grid[target].length != 0) {
                    swapBrickColumns(col, target);
                    break;
                }
                --target;
            }
        }
    }
}

function collapseRightSide(col) {
    for (; col < NUM_COLUMNS; ++col) {
        if (brick_grid[col].length == 0) {
            var target = col;
            while (target < NUM_COLUMNS) {
                if (brick_grid[target].length != 0) {
                    swapBrickColumns(col, target);
                    break;
                }
                ++target;
            }
        }
    }
}

function swapBrickColumns(i, j) {
    if (0 <= i && i < brick_grid.length && 0 <= j && j < brick_grid.length) {
        var temp = brick_grid[i];
        brick_grid[i] = brick_grid[j];
        brick_grid[j] = temp;
        return true;
    }
    else
        return false;
}

function scootColumns() {
    for (var col = 0; col < brick_grid.length; ++col)
        scootColumn(col)
}

function scootColumn(col) {
    for (var row = 0; row < brick_grid[col].length; ++row)
        game.add.tween(brick_grid[col][row]).to({x: colToX(col)}, 100,
                Phaser.Easing.Linear.In, true);
}

function findTopOfColumn(col) {
    if (col < 0 || col >= NUM_COLUMNS)
        return -2; // flag: invalid column
    if (brick_grid[col].length < NUM_ROWS)
        return brick_grid[col].length;
    return -1; // flag: too many bricks already in this column (it's full)
}

function colToX(col) {
    return Math.floor(COLUMN_WIDTH / 3) + col * COLUMN_WIDTH;
}

function rowToY(row) {
    return PLAY_HEIGHT - row * ROW_HEIGHT;
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

function update() {
    ++GAME_TIME;
}