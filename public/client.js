window.addEventListener("DOMContentLoaded", () => {
  const playBtn = document.getElementById("playBtn");
  const themeBtn = document.getElementById("themeBtn");
  const themeLink = document.getElementById("themeStylesheet");
  const lobby = document.getElementById("lobby");
  const gameContainer = document.getElementById("game-container");

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

  // -------------------
  // PLAY BUTTON
  // -------------------
  playBtn.addEventListener("click", () => {
    lobby.style.display = "none";
    gameContainer.style.display = "block";
    startGame();
  });

  // -------------------
  // GAME
  // -------------------
  function startGame() {
    const config = {
      type: Phaser.AUTO,
      width: window.innerWidth,
      height: window.innerHeight,
      backgroundColor: "#111",
      parent: "game-container",
      scene: { create, update }
    };

    const game = new Phaser.Game(config);

    // Snake system
    let snake = [];
    const segmentDistance = 22;
    const maxLength = 500;
    const speed = 1;

    let heading = 0;
    const turnSpeed = 0.005;

    let pointer;
    let graphics;
    let camera;

    function create() {
      pointer = this.input.activePointer;
      graphics = this.add.graphics();
      camera = this.cameras.main;

      // Start snake
      createSnake(0, 0, 100);

      // Lock camera to head
      camera.startFollow({ x: 0, y: 0 }, true, 0.08, 0.08);
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
      const worldX = pointer.worldX;
      const worldY = pointer.worldY;

      // Direction toward pointer
      const dx = worldX - head.x;
      const dy = worldY - head.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Only turn if mouse far enough away
      const targetAngle = Math.atan2(dy, dx);
      let delta = targetAngle - heading;
      delta = Math.atan2(Math.sin(delta), Math.cos(delta));
      heading += delta * turnSpeed;

      // Move head
      const newHead = {
        x: head.x + Math.cos(heading) * speed,
        y: head.y + Math.sin(heading) * speed
      };

      snake.unshift(newHead);

      // Enforce spacing between segments
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

      // Limit length
      if (snake.length > maxLength) {
        snake.pop();
      }

      // Camera follows head exactly
      camera.centerOn(newHead.x, newHead.y);

      // Draw
      render();
    }

    function render() {
      graphics.clear();

      for (let i = snake.length - 1; i >= 0; i--) {
        const size = i === 0 ? 22 : 18;
        graphics.fillStyle(0x00ff88);
        graphics.fillCircle(snake[i].x, snake[i].y, size);
      }
    }
  }
});
