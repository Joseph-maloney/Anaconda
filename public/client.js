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
    const spacing = 8;
    const speed = 3;
    const worldSize = 3000;

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
      for (let i = 0; i < 25; i++) {
        const seg = this.add.circle(1500, 1500, 10, subColor);
        snake.push(seg);
      }

      // Camera follow
      this.cameras.main.startFollow(head, true, 0.05, 0.05);

      // Mouse movement
      this.input.on("pointermove", pointer => {
        this.target = pointer;
      });

      // Spawn food
      for (let i = 0; i < 250; i++) spawnFood(this);
    }

    function update() {
      const head = snake[0];
      if (!head || !this.target) return;

      const angle = Phaser.Math.Angle.Between(
        head.x, head.y,
        this.target.worldX, this.target.worldY
      );

      head.x += Math.cos(angle) * speed;
      head.y += Math.sin(angle) * speed;

      // Save path
      history.unshift({ x: head.x, y: head.y });

      // Move body
      for (let i = 1; i < snake.length; i++) {
        const point = history[i * spacing];
        if (point) {
          snake[i].x = point.x;
          snake[i].y = point.y;
        }
      }

      history = history.slice(0, 3000);

      // Eat food
      foods.forEach((food, i) => {
        if (Phaser.Math.Distance.Between(head.x, head.y, food.x, food.y) < 14) {
          food.destroy();
          foods.splice(i, 1);
          growSnake(this);
          spawnFood(this);
        }
      });
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
      const color = Phaser.Display.Color.HexStringToColor(css("--sub-color")).color;
      const seg = scene.add.circle(last.x, last.y, 10, color);
      snake.push(seg);
    }
  }
});