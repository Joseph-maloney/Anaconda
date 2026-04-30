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
    let path = [];
    let lastMouseX, lastMouseY;
    const pathDistance = 10;
    const maxLength = 500;
    const normalSpeed = 1.25;
    const boostSpeed = 2;
    const maxTurnRate = 0.075;  // Maximum turn per frame
    const drift = 0.1;
    const startLength = 100;

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
      createPath(startX, startY, startLength);
    }

    function createPath(x, y, length) {
      snake = [];
      path = [];

      for (let i = 0; i < length; i++) {
        const px = x;
        const py = y + i * pathDistance;

        // Path (history trail)
        path.push({ x: px, y: py });

        // Snake (rendered segments)
        snake.push({ x: px, y: py });
      }
    }

    function update() {
      if (path.length < 2) return;

      const head = path[0];
      const neck = path[1];

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
        const turnAmount = Math.max(-maxTurnRate, Math.min(maxTurnRate, angle));

        if (Math.abs(turnAmount) > 0.001) {  // Small threshold to avoid jitter
          dir = rotate(dir, turnAmount);
          heading = { x: dir.x, y: dir.y };
        }
      }

      // --- 5. Move head forward
      let speed = normalSpeed;
      if (pointer.isDown) {
        speed = boostSpeed;
      }
      const newHead = {
        x: head.x + dir.x * speed,
        y: head.y + dir.y * speed
      };

      const distFromNeck = Math.hypot(newHead.x - neck.x, newHead.y - neck.y);
      if (distFromNeck >= pathDistance) {
        path.unshift(newHead);
        path.pop()
      } else {
        // Just move the head, don't add a new segment
        path[0].x = newHead.x;
        path[0].y = newHead.y;
        snake[0].x = newHead.x;
        snake[0].y = newHead.y;
      }

      // Turn radius shrinks - coils drift

      let adjustedpath = path.map(seg => ({ x: seg.x, y: seg.y })); // Create a copy

      for (let i = 2; i < path.length - 1; i++) {
        const last = path[i - 1];
        const next = path[i + 1];
        const curr = path[i];
        const a = { x: next.x - last.x, y: next.y - last.y };
        const b = { x: curr.x - last.x, y: curr.y - last.y };
        const theta = signedAngle(a, b);
        const denom = Math.hypot(next.y - last.y, next.x - last.x) || 1;

        const v = {
          x: (next.y - last.y) / denom,
          y: (last.x - next.x) / denom
        };
        adjustedpath[i].x = (drift * Math.hypot(b.x,b.y) * Math.sin(theta) * v.x) + curr.x;
        adjustedpath[i].y = (drift * Math.hypot(b.x,b.y) * Math.sin(theta) * v.y) + curr.y;
      }
      path = adjustedpath;

      //------------------------
      // Place segments on Path
      //------------------------

      const scaledHeadDist = distFromNeck / pathDistance;
        for (let i = 1; i < path.length; i++) {
        const last = path[i - 1]; 
        const curr = path[i]; 
        snake[i].x = scaledHeadDist * (last.x - curr.x) + last.x; 
        snake[i].y = scaledHeadDist * (last.y - curr.y) + last.y; 
      }

      // --- 7. Cap length
      if (path.length > maxLength) {
        path.pop();
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
      const outlineColor = 0x000000; // Black outline 
      const outlineWidth = 2; // Outline thickness
      
      for (let i = snake.length - 1; i >= 0; i--) {
        const size = i === 0 ? 22.5 : 22;
        
        // Draw outline (stroke)
        graphics.lineStyle(outlineWidth, outlineColor, 1);
        graphics.strokeCircle(snake[i].x, snake[i].y, size);
        
        // Draw fill
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