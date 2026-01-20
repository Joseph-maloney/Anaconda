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
  // Utility: get CSS variable
  // -------------------
  function css(varName) {
    return getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  }

  // -------------------
  // Phaser Slither game
  // -------------------
  function startGame() {
    const config = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: "game-container",
      backgroundColor: css("--bg-color"),
      physics: {
        default: "arcade"
      },
      scene: { create, update }
    };

    const game = new Phaser.Game(config);

    let snake = [];
    let history = [];
    let foods = [];
    const spacing = 4;
    const speed = 1;
    const worldSize = 3000;
    const minMoveDistance = 40;

    function create() {
      this.physics.world.setBounds(0, 0, worldSize, worldSize);
      this.cameras.main.setBounds(0, 0, worldSize, worldSize);

      // Snake colors from theme
      const mainColor = Phaser.Display.Color.HexStringToColor(css("--main-color")).color;
      const subColor = Phaser.Display.Color.HexStringToColor(css("--sub-color")).color;

      // Head
      const head = this.add.circle(1500, 1500, 12, mainColor);
      snake.push(head);

      // Body
      for (let i = 0; i < 40; i++) {
        const seg = this.add.circle(1500, 1500, 10, mainColor);
        snake.push(seg);
      }

      // Camera follow
      this.cameras.main.startFollow(head, true, 1, 1);

      // Mouse movement
      this.input.on("pointermove", pointer => {
        this.target = pointer;
      });

      // Spawn food
      for (let i = 0; i < 300; i++) spawnFood(this);
    }

    let lastDir = { x: 1, y: 0 }; // default movement to the right

    function update() {
      const head = snake[0];
      if (!head || !this.target) return;

      const tx = this.target.worldX;
      const ty = this.target.worldY;

      let dx = tx - head.x;
      let dy = ty - head.y;

      // Angle to mouse
      const targetAngle = Math.atan2(dy, dx);

      // Shortest angular difference
      let delta = targetAngle - heading;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta)); // normalize to [-π, π]

      // Apply turn speed (limits turning rate)
      heading += delta * turnSpeed;

      // Move forward along heading
      head.x += Math.cos(heading) * speed;
      head.y += Math.sin(heading) * speed;
      
      // History
      history.unshift({ x: head.x, y: head.y });

      // Body follow
      for (let i = 1; i < snake.length; i++) {
        const point = history[i * spacing];
        if (point) {
          snake[i].x += (point.x - snake[i].x) * 0.8;
          snake[i].y += (point.y - snake[i].y) * 0.8;
        }
      }

      history = history.slice(0, 3000);
    }
    function spawnFood(scene) {
      const color = Phaser.Display.Color.HexStringToColor(css("--main-color")).color;
      const food = scene.add.circle(
        Phaser.Math.Between(0, worldSize),
        Phaser.Math.Between(0, worldSize),
        4,
        color
      );
      foods.push(food);
    }

    function growSnake(scene) {
      const last = snake[snake.length - 1];
      const color = Phaser.Display.Color.HexStringToColor(css("--main-color")).color;
      const seg = scene.add.circle(last.x, last.y, 10, color);
      snake.push(seg);
    }
  }
});