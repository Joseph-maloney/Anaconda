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
    const segmentDistance = 1000;
    const maxLength = 500;
    const speed = 0.5;

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
      createSnake(startX, startY, 20); // start with 20 segments
    }

    function createSnake(x, y, length) {
      snake = [];
      for (let i = 0; i < length; i++) {
        snake.push({ 
          x: x - 0.05*i * segmentDistance,  // Space them out horizontally
          y: y 
        });
      }
    }

    function update() {
      if (snake.length < 2) return;

      const head = snake[0];
      const neck = snake[1];

      // Mouse in world space
      const mouseScreenX = pointer.x;
      const mouseScreenY = pointer.y;
      const mouseX = mouseScreenX + camera.scrollX;
      const mouseY = mouseScreenY + camera.scrollY;

      // --- 1. Current direction (from neck → head)
      let dir = {
        x: head.x - neck.x,
        y: head.y - neck.y
      };

      // Normalize direction
      let len = Math.hypot(dir.x, dir.y);
      if (len < 0.1) {  // If segments are too close, use last known heading
        dir = { ...heading };
      } else {
        dir.x /= len;
        dir.y /= len;
        heading = { ...dir };  // Store valid heading for later
      }

      // --- 2. Vector from head → mouse
      const toMouse = {
        x: mouseX - head.x,
        y: mouseY - head.y
      };

      const distToMouse = Math.hypot(toMouse.x, toMouse.y);

      // --- 3. Signed angle between vectors
      if (distToMouse > 50) {
        const angle = signedAngle(dir, toMouse);

        // --- 4. Turn the full angle, but cap at max turn rate
        const maxTurnRate = 0.02;  // Maximum turn per frame
        const turnAmount = Math.max(-maxTurnRate, Math.min(maxTurnRate, angle));

        if (Math.abs(turnAmount) > 0.001) {  // Small threshold to avoid jitter
          dir = rotate(dir, turnAmount);
          heading = { x: dir.x, y: dir.y };
        }
      }

      // --- 5. Move head forward
      const newHead = {
        x: head.x + dir.x * speed,
        y: head.y + dir.y * speed
      };

      snake.unshift(newHead);

      // --- 6. Enforce spacing between segments
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

      // --- 7. Cap length
      if (snake.length > maxLength) {
        snake.pop();
      }

      // --- 8. Camera lock
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
