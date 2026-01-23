window.addEventListener("DOMContentLoaded", () => {
  const playBtn = document.getElementById("playBtn");
  const lobby = document.getElementById("lobby");
  const gameContainer = document.getElementById("game-container");

  const themeBtn = document.getElementById("themeBtn");
  const themeLink = document.getElementById("themeStylesheet");

  // -------------------
  // THEMES
  // -------------------
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

  playBtn.addEventListener("click", () => {
    lobby.style.display = "none";
    gameContainer.style.display = "block";
    startGame();
  });

  // ----------------------
  function startGame() {
    const config = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      parent: "game-container",
      scene: { create, update }
    };

    const game = new Phaser.Game(config);

    const world = {
      x: 0,
      y: 0,
      radius: 2000
    };

    // Snake settings
    let snake = [];
    const segmentDistance = 22;
    const maxLength = 500;
    const speed = 1;
    const turnSpeed = 0.015;
    const minTurnDistance = 10; // minimum distance before snake reacts to pointer

    let heading = 0;
    let pointer;
    let graphics;
    let camera;
    let cameraTarget;

    function create() {
      // Get theme color from CSS
      const bgColor = getCSSColor("--bg-color");
      const mainColor = getCSSColor("--main-color");

      this.cameras.main.setBackgroundColor(bgColor);

      camera = this.cameras.main;

      // Start snake in center of screen
      const startX = window.innerWidth / 2;
      const startY = window.innerHeight / 2;

      cameraTarget = this.add.rectangle(startX, startY, 1, 1, 0x000000, 0);
      camera.startFollow(cameraTarget, true, 1, 1);

      pointer = this.input.activePointer;
      graphics = this.add.graphics();

      // Initialize snake
      createSnake(startX, startY, 20); // start with 20 segments
    }

    function createSnake(x, y, length) {
      snake = [];
      for (let i = 0; i < length; i++) {
        snake.push({ x, y });
      }
    }

    function update() {
      if (!snake.length) return;

      const head = snake[0];

      // World-space pointer
      const worldX = pointer.worldX;
      const worldY = pointer.worldY;

      // Compute vector to pointer
      const dx = worldX - head.x;
      const dy = worldY - head.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Only turn if pointer is far enough
      if (dist > minTurnDistance) {
        const targetAngle = Math.atan2(dy, dx);
        let delta = targetAngle - heading;
        delta = Math.atan2(Math.sin(delta), Math.cos(delta));
        heading += delta * turnSpeed;
      }

      // Move head
      const newHead = {
        x: head.x + Math.cos(heading) * speed,
        y: head.y + Math.sin(heading) * speed
      };

      snake.unshift(newHead);

      // Update body positions to maintain spacing
      for (let i = 1; i < snake.length; i++) {
        const prev = snake[i - 1];
        const curr = snake[i];

        const dx = prev.x - curr.x;
        const dy = prev.y - curr.y;
        const d = Math.sqrt(dx * dx + dy * dy);

        if (d > segmentDistance) {
          const t = segmentDistance / d;
          curr.x = prev.x - dx * t;
          curr.y = prev.y - dy * t;
        }
      }

      // Limit snake length
      if (snake.length > maxLength) {
        snake.pop();
      }

      // Move camera target to head
      cameraTarget.x = newHead.x;
      cameraTarget.y = newHead.y;

      render();
    }

    function render() {
      graphics.clear();

      // Draw circular world border
      graphics.lineStyle(6, 0xffffff, 0.8);
      graphics.strokeCircle(world.x, world.y, world.radius);

      // Draw snake
      const snakeColor = cssToPhaserColor(getCSSColor("--main-color"));
      for (let i = snake.length - 1; i >= 0; i--) {
        const size = i === 0 ? 28 : 22; // head bigger than body
        graphics.fillStyle(snakeColor);
        graphics.fillCircle(snake[i].x, snake[i].y, size);
      }
    }
  }

  // ----------------------
  // Utility functions
  function getCSSColor(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName) || "#ffffff";
  }

  function cssToPhaserColor(cssColor) {
    // Convert #rrggbb to Phaser 0xRRGGBB
    return parseInt(cssColor.replace("#", "0x"));
  }
});
