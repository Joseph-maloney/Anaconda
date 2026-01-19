window.addEventListener("DOMContentLoaded", () => {
  const playBtn = document.getElementById("playBtn");
  const themeBtn = document.getElementById("themeBtn");
  const themeLink = document.getElementById("themeStylesheet");
  const lobby = document.getElementById("lobby");
  const gameContainer = document.getElementById("game-container");

//themes
const themes = [
  "/mt_themes/arch.css",
  "/mt_themes/carbon.css",
  "/mt_themes/rainbow_trail.css",
];

 let currentTheme = 0;
  const savedTheme = localStorage.getItem("theme");
  if (savedTheme) {
    themeLink.href = savedTheme;
    currentTheme = themes.indexOf(savedTheme);
  }

  themeBtn.addEventListener("click", () => {
    currentTheme = (currentTheme + 1) % themes.length;
    themeLink.href = themes[currentTheme];
    localStorage.setItem("theme", themes[currentTheme]);
  });

  // -------------------
  // Play button
  // -------------------
  playBtn.addEventListener("click", () => {
    lobby.style.display = "none";
    gameContainer.style.display = "block";

    startGame();
  });

  // -------------------
  // Phaser game
  // -------------------
  function startGame() {
    const config = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: 'game-container',
      physics: {
        default: 'arcade',
        arcade: { debug: false }
      },
      scene: {
        preload,
        create,
        update
      }
    };

    const game = new Phaser.Game(config);
    let player;

    function preload() {
      this.load.image('player', 'https://i.imgur.com/1cRkY.png'); // placeholder player sprite
    }

    function create() {
      player = this.physics.add.sprite(400, 300, 'player');

      // Simple movement keys
      this.cursors = this.input.keyboard.createCursorKeys();
    }

    function update() {
      if (!player) return;

      player.setVelocity(0);

      if (this.cursors.left.isDown) player.setVelocityX(-200);
      if (this.cursors.right.isDown) player.setVelocityX(200);
      if (this.cursors.up.isDown) player.setVelocityY(-200);
      if (this.cursors.down.isDown) player.setVelocityY(200);
    }
  }
});