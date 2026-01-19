// Lobby selections
let playerSettings = { color: 'red', nickname: 'Player' };

document.querySelectorAll('.skin').forEach(btn => {
  btn.addEventListener('click', () => playerSettings.color = btn.dataset.color);
});

document.getElementById('nickname').addEventListener('input', e => {
  playerSettings.nickname = e.target.value || 'Player';
});

document.getElementById('playBtn').addEventListener('click', () => {
  document.getElementById('lobby').style.display = 'none';
  document.getElementById('game-container').style.display = 'block';
  startGame();
});

// Start Phaser game
function startGame() {
  const socket = io();

  const players = {};

  const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: { default: 'arcade', arcade: { debug: false } },
    scene: { preload, create, update }
  };

  const game = new Phaser.Game(config);

  function preload() {
    this.load.image('player', 'https://examples.phaser.io/assets/sprites/block.png');
  }

  function create() {
    this.playerSprite = this.physics.add.sprite(400, 300, 'player');

    this.cursors = this.input.keyboard.createCursorKeys();

    // Send join info to server
    socket.emit('join', playerSettings);

    socket.on('state', serverPlayers => {
      Object.assign(players, serverPlayers);
      // handle creating/updating sprites here
    });
  }

  function update() {
    const speed = 200;
    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown) vx = -speed;
    else if (this.cursors.right.isDown) vx = speed;

    if (this.cursors.up.isDown) vy = -speed;
    else if (this.cursors.down.isDown) vy = speed;

    this.playerSprite.setVelocity(vx, vy);

    // Emit current position
    socket.emit('move', {
      x: this.playerSprite.x,
      y: this.playerSprite.y,
      color: playerSettings.color,
      nickname: playerSettings.nickname
    });

    // Update other player sprites
  }
}