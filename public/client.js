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
    let totalPathLength = 0;

    const segmentDistance = 12.5;
    const maxLength = 500;
    const normalSpeed = 1.25;
    const boostSpeed = 2;
    const maxTurnRate = 0.15;  //  jkMaximum turn per frame
    const drift = 0.1;
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
      path = [];
      totalPathLength = 0;

      for (let i = 0; i < length; i++) {
        snake.push({ 
          x: x,
          y: y + i * segmentDistance,
          z: 0
        });
      }

      // Build path from tail → head (IMPORTANT)
      for (let i = length - 1; i >= 0; i--) {
        const px = x;
        const py = y + i * segmentDistance;

        if (path.length > 0) {
          const last = path[path.length - 1];
          const dx = px - last.x;
          const dy = py - last.y;
          totalPathLength += Math.hypot(dx, dy);
        }

        path.push({ x: px, y: py, dx: 0, dy: 0 });
      }
    }

    function update() {
      if (snake.length < 2) return;

      const head = snake[0];
      const neck = snake[1];

      // Mouse in world space
      const mouseX = pointer.x + camera.scrollX;
      const mouseY = pointer.y + camera.scrollY;

      // --- 1. Direction head → neck
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

      // --- 2. Steering toward mouse
      const toMouse = {
        x: mouseX - head.x,
        y: mouseY - head.y
      };

      const distToMouse = Math.hypot(toMouse.x, toMouse.y);

      if (distToMouse > 50) {
        const angle = signedAngle(dir, toMouse);
        const turnAmount = Math.max(-maxTurnRate, Math.min(maxTurnRate, angle));

        if (Math.abs(turnAmount) > 0.001) {
          dir = rotate(dir, turnAmount);
          heading = { ...dir };
        }
      }

      // --- 3. Move head
      const speed = pointer.isDown ? boostSpeed : normalSpeed;

      const newHead = {
        x: head.x + dir.x * speed,
        y: head.y + dir.y * speed
      };

      snake[0].x = newHead.x;
      snake[0].y = newHead.y;

      // --- 4. Add to path
      const newPoint = { x: newHead.x, y: newHead.y, dx: 0, dy: 0 };

      const last = path[path.length - 1];
      if (last) {
        totalPathLength += Math.hypot(newPoint.x - last.x, newPoint.y - last.y);
      }

      path.push(newPoint);

      // --- 5. Drift (velocity field ONLY, no geometry mutation)
      for (let i = path.length - 2; i >= 1; i--) {
        const last = path[i - 1];
        const curr = path[i];
        const next = path[i + 1];

        if (!last || !next) continue;

        const a = { x: next.x - last.x, y: next.y - last.y };
        const b = { x: curr.x - last.x, y: curr.y - last.y };

        const lenA = Math.hypot(a.x, a.y);
        if (lenA < 0.0001) continue;

        const theta = signedAngle(a, b);

        // Midpoint of neighbors (local "center")
        const toPrev = {
          x: last.x - curr.x,
          y: last.y - curr.y
        };

        const toNext = {
          x: next.x - curr.x,
          y: next.y - curr.y
        };

        // true local center pull (THIS actually contracts)
        const inward = {
          x: (toPrev.x + toNext.x) * 0.5,
          y: (toPrev.y + toNext.y) * 0.5
        };

        // Keep your perpendicular force (for swirl)
        const tangent = {
          x: next.x - last.x,
          y: next.y - last.y
        };

        const len = Math.hypot(tangent.x, tangent.y) || 1;

        tangent.x /= len;
        tangent.y /= len;

        // perpendicular (clean swirl axis)
        const normal = {
          x: -tangent.y,
          y: tangent.x
        };

        // Strengths (tune these)
        const inwardStrength = drift * 1.2;   // pulls coils inward
        const swirlStrength  = drift * 0.4;   // keeps curvature motion

        const curvature = Math.sin(theta);

        // inward should NOT depend on curvature
        const fx = inward.x * 0.8 + normal.x * curvature * 0.4;
        const fy = inward.y * 0.8 + normal.y * curvature * 0.4;

        // IMPORTANT: damp based on distance from head
        const t = i / path.length;
        const decay = Math.pow(0.85, t * 6);

        curr.dx = (curr.dx + fx * decay) * 0.88;
        curr.dy = (curr.dy + fy * decay) * 0.88;

        const maxVel = 3;

        curr.dx = Math.max(-maxVel, Math.min(maxVel, curr.dx));
        curr.dy = Math.max(-maxVel, Math.min(maxVel, curr.dy));

        // store debug force
        curr.fx = fx;
        curr.fy = fy;


      }

      for (let i = 0; i < path.length; i++) {
      // clamp drift influence (prevents tail explosion)
      path[i].dx *= 0.6;
      path[i].dy *= 0.6;
}

      // --- 6. Apply drift to path
      for (let i = 0; i < path.length; i++) {
        path[i].x += path[i].dx;
        path[i].y += path[i].dy;
      }

      // --- 7. Recompute length (important for stability)
      totalPathLength = 0;

      for (let i = 1; i < path.length; i++) {
        totalPathLength += Math.hypot(
          path[i].x - path[i - 1].x,
          path[i].y - path[i - 1].y
        );
      }

      // --- 8. Trim path
      const maxPathLength = segmentDistance * (snake.length - 1);

      while (totalPathLength > maxPathLength && path.length > 2) {
        const first = path[0];
        const second = path[1];

        totalPathLength -= Math.hypot(
          second.x - first.x,
          second.y - first.y
        );

        path.shift();
      }

      // --- 9. Place snake along path (stable arc-length solver)
      snake[0].x = newHead.x;
      snake[0].y = newHead.y;

      let j = path.length - 1;
      let consumed = 0;
      let cursorDist = 0;

      for (let i = 1; i < snake.length; i++) {

        cursorDist += segmentDistance;

        while (j > 0) {
          const dx = path[j].x - path[j - 1].x;
          const dy = path[j].y - path[j - 1].y;
          const segLen = Math.hypot(dx, dy);

          if (consumed + segLen >= cursorDist) break;

          consumed += segLen;
          j--;
        }

        if (j > 0) {
          const dx = path[j].x - path[j - 1].x;
          const dy = path[j].y - path[j - 1].y;
          const segLen = Math.max(0.0001, Math.hypot(dx, dy));
          const t = (cursorDist - consumed) / segLen;

          snake[i].x = path[j].x - dx * t;
          snake[i].y = path[j].y - dy * t;
        } else {
          snake[i].x = path[0].x;
          snake[i].y = path[0].y;
        }
      }

      // --- 10. Cap length
      if (snake.length > maxLength) {
        snake.pop();
      }

      // --- 11. Camera
      cameraTarget.x = newHead.x;
      cameraTarget.y = newHead.y;

      render();
      console.log("head:", path[path.length - 1]);
      console.log("mid:", path[Math.floor(path.length / 2)]);
      console.log("tail:", path[0]);
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

      // -------------------------
      // DEBUG DRAW LAST (VISIBLE ON TOP)
      // -------------------------
      graphics.lineStyle(2, 0x00ff00, 1);

      for (let i = 0; i < path.length; i += 10) {
        const p = path[i];

        // path point
        graphics.fillStyle(0x00ff00, 1);
        graphics.fillCircle(p.x, p.y, 3);

        // direction hint
        graphics.beginPath();
        graphics.moveTo(p.x, p.y);
        graphics.lineTo(p.x + 6, p.y);
        graphics.strokePath();
      }

      // force vectors
      graphics.lineStyle(1, 0xff0000, 1);

      for (let i = 0; i < path.length; i += 10) {
        const p = path[i];

        if (!p.fx && !p.fy) continue;

        graphics.beginPath();
        graphics.moveTo(p.x, p.y);
        graphics.lineTo(p.x + p.fx * 200, p.y + p.fy * 200);
        graphics.strokePath();
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
