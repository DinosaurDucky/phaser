
var game = new Phaser.Game(800, 600, Phaser.AUTO, '',
        {preload: preload, create: create, update: update});
var platforms;
var cursors;
var bricks;
var gametime = 0;

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

    game.physics.startSystem(Phaser.Physics.ARCADE);
    game.add.sprite(0, 0, 'sky');
    platforms = game.add.group();
    platforms.enableBody = true;
    var ground = platforms.create(0, game.world.height - 64, 'ground');
    ground.scale.setTo(2, 2);
    ground.body.immovable = true;
    var ledge = platforms.create(400, 400, 'ground');
    ledge.body.immovable = true;
    ledge = platforms.create(-150, 250, 'ground');
    ledge.body.immovable = true;

    bricks = game.add.group(game, game, true, true);
    bricks.enableBody = true;

    for (var i = 0; i < 30; ++i) {
        var brick = Brick(Math.floor(Math.random() * 800), 0,
                Math.floor(Math.random() * 20));
    }

}

function Brick(x, y, number) {
    var brick = bricks.create(x, y, 'brick_orange');
    bricks.add(brick);
    brick.number = number
    brick.anchor.set(.5);
    brick.scale.setTo(.5, .5);
    brick.body.gravity.y = 20 + brick.number;
    brick.body.bounce.x = 0.5;
    brick.body.bounce.y = 0.2;

    // brick number text:
    var dx = 0;
    if (brick.number >= 10) {
        dx = -15;
    }
    var text = game.add.text(dx - brick.width / 4, -brick.height / 2 - 3,
            brick.number, {font: "42px Arial", fill: "#ffffff"});
    brick.addChild(text);

    // brick mouse event:
    brick.highlighted = false;
    brick.inputEnabled = true;
    brick.events.onInputDown.add(clickBrick, this);
    return brick;
}

function clickBrick(brick) {
    console.log('clicked a brick!')
    if (brick.highlighted) {
        brick.loadTexture('brick_orange');
        brick.highlighted = false;
    }
    else {
        brick.loadTexture('brick_orange_highlight');
        brick.highlighted = true;
    }
}


function update() {
    ++gametime;
    
    game.physics.arcade.collide(bricks, platforms);
    game.physics.arcade.collide(bricks, bricks);

}