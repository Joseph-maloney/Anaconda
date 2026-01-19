// Basic Phaser 3 config
const config = {
  type: Phaser.AUTO,              // WebGL if possible, otherwise Canvas
  width: 800,
  height: 600,
  backgroundColor: '#222222',
  parent: 'game-container',       // Div container
  physics: {
    default: 'arcade',            // Simple 2D physics engine
    arcade: {
      debug: false
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};

// Create the game
const game = new Phaser.Game(config);

// Player variables
let player;

function preload() {
  // Load a sprite for the player
  this.load.image('player', 'https://examples.phaser.io/assets/sprites/block.png');
}

function create() {
  // Add player sprite to the scene
  player = this.physics.add.sprite(400, 300, 'player');

  // Set player properties
  player.setCollideWorldBounds(true);
}

function update() {
  // Basic movement with arrow keys
  const cursors = this.input.keyboard.createCursorKeys();

  if (cursors.left.isDown) {
    player.setVelocityX(-200);
  } else if (cursors.right.isDown) {
    player.setVelocityX(200);
  } else {
    player.setVelocityX(0);
  }

  if (cursors.up.isDown) {
    player.setVelocityY(-200);
  } else if (cursors.down.isDown) {
    player.setVelocityY(200);
  } else {
    player.setVelocityY(0);
  }
}