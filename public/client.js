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
    let prevSnake = []; // <-- required for Verlet
    let totalPathLength = 0;

    const segmentDistance = 12.5;
    const maxLength = 500;
    const normalSpeed = 4;
    const boostSpeed = 6;
    const maxTurnRate = 1;  //  jkMaximum turn per frame
    const drift = 0.5;
    const startLength = 100;
    const damping = 0.92;

    let pointer;
    let graphics;
    let camera;
    let cameraTarget;
    let heading = { x: 1, y: 0 }; // Initial direction (moving right)
    
    //Helper functions
    function rotate(v, angle) {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      return {
        x: v.x * cos - v.y * sin,
        y: v.x * sin + v.y * cos
      };
    }

    function signedAngle(a, b) {
      const dot = a.x * b.x + a.y * b.y;
      const cross = a.x * b.y - a.y * b.x;
      return Math.atan2(cross, dot);
    }

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

      // Initialize mouse position
      lastMouseX = pointer.worldX;
      lastMouseY = pointer.worldY;

      // Initialize snake
      createSnake(startX, startY, startLength);
    }

    function createSnake(x, y, length) {
      snake = [];
      prevSnake = [];

      for (let i = 0; i < length; i++) {
        const px = x;
        const py = y + i * segmentDistance;

        snake.push({ x: px, y: py });
        prevSnake.push({ x: px, y: py });
      }
    }

    function update() {
      if (snake.length < 2) return;

      const head = snake[0];
      const neck = snake[1];

      // -------------------------
      // Mouse in world space
      // -------------------------
      const mouseX = pointer.x + camera.scrollX;
      const mouseY = pointer.y + camera.scrollY;

      // -------------------------
      // 1. Direction (head → neck)
      // -------------------------
      let dir = {
        x: head.x - neck.x,
        y: head.y - neck.y
      };

      let len = Math.hypot(dir.x, dir.y);

      if (len < 0.0001) {
        dir = { ...heading };
      } else {
        dir.x /= len;
        dir.y /= len;
        heading = { ...dir };
      }

      // -------------------------
      // 2. Steering toward mouse
      // -------------------------
      const toMouse = {
        x: mouseX - head.x,
        y: mouseY - head.y
      };

      const distToMouse = Math.hypot(toMouse.x, toMouse.y);

      if (distToMouse > 50) {
        const angle = signedAngle(dir, toMouse);
        const turnAmount = Math.max(-maxTurnRate, Math.min(maxTurnRate, angle));

        dir = rotate(dir, turnAmount);
        heading = { ...dir };
      }

      // -------------------------
      // 3. MOVE HEAD (Verlet motion)
      // -------------------------
      const speed = pointer.isDown ? boostSpeed : normalSpeed;
      const speedScale = 0.8;

      const vx = dir.x * speed * speedScale;
      const vy = dir.y * speed * speedScale;

      // store previous head
      prevSnake[0].x = head.x;
      prevSnake[0].y = head.y;

      // move head
      head.x += vx;
      head.y += vy;

      // -------------------------
      // 4. VERLET INTEGRATION (all segments)
      // -------------------------
      const damping = 0.05;

      for (let i = 1; i < snake.length; i++) {
        const p = snake[i];
        const prev = prevSnake[i];

        const vx = (p.x - prev.x) * damping;
        const vy = (p.y - prev.y) * damping;

        prevSnake[i].x = p.x;
        prevSnake[i].y = p.y;

        p.x += vx;
        p.y += vy;
      }

      // -------------------------
      // 5. CONSTRAINT SOLVER (CRITICAL)
      // -------------------------
      const iterations = 10;

      for (let iter = 0; iter < iterations; iter++) {
        for (let i = 1; i < snake.length; i++) {
          const p0 = snake[i - 1];
          const p1 = snake[i];

          let dx = p1.x - p0.x;
          let dy = p1.y - p0.y;

          let dist = Math.hypot(dx, dy) || 1;

          let diff = (dist - segmentDistance) / dist;

          const offsetX = dx * 0.5 * diff;
          const offsetY = dy * 0.5 * diff;

          p0.x += offsetX;
          p0.y += offsetY;

          p1.x -= offsetX;
          p1.y -= offsetY;
        }
      }

      // -------------------------
      // 6. CAMERA
      // -------------------------
      cameraTarget.x = head.x;
      cameraTarget.y = head.y;

      render();
    }

    function render() {
      graphics.clear();

      // -------------------------
      // WORLD BOUNDARY
      // -------------------------
      graphics.lineStyle(6, 0xffffff, 0.8);
      graphics.strokeCircle(world.x, world.y, world.radius);

      // -------------------------
      // SNAKE FIRST (so debug is on top)
      // -------------------------
      const snakeColor = cssToPhaserColor(getCSSColor("--main-color"));

      for (let i = snake.length - 1; i >= 0; i--) {
        const size = i === 0 ? 22.5 : 22;

        graphics.lineStyle(2, 0x000000, 1);
        graphics.strokeCircle(snake[i].x, snake[i].y, size);

        graphics.fillStyle(snakeColor, 1);
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
