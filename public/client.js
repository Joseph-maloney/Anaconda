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

  function getCSSColor(varName) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(varName)
    .trim();
  }

  function cssToPhaserColor(cssColor) {
  return parseInt(cssColor.replace("#", "0x"));
  } 

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
      parent: "game-container",
      scene: { create, update }
    };

    const game = new Phaser.Game(config);

    const world = {
    x: 0,
    y: 0,
    radius: 2000
    };

    // Snake system
    let snake = [];
    const segmentDistance = 22;
    const maxLength = 500;
    const speed = 1;

    let heading = 0;
    const turnSpeed = 0.02;

    let pointer;
    let graphics;
    let camera;
    let cameraTarget;

    function create() {

      this.cameras.main.setBackgroundColor(getCSSColor("--bg-color"));

      // Lock camera to head
      camera = this.cameras.main;

      cameraTarget = this.add.rectangle(0, 0, 1, 1, 0x000000, 0);
      camera.startFollow({ x: 0, y: 0 }, true, 0.08, 0.08);

      pointer = this.input.activePointer;
      graphics = this.add.graphics();
      
      // Start snake
      createSnake(0, 0, 100);

      
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
      cameraTarget.x = newHead.x;
      cameraTarget.y = newHead.y;


      // Draw
      render();
    }
    
    function render() {
      graphics.clear();

      graphics.lineStyle(6, 0xffffff, 0.8);
      graphics.strokeCircle(world.x, world.y, world.radius);

      const snakeColor = cssToPhaserColor(getCSSColor("--main-color"));
      for (let i = snake.length - 1; i >= 0; i--) {
        const size = i === 0 ? 22 : 18;
        graphics.fillStyle(snakeColor);
        graphics.fillCircle(snake[i].x, snake[i].y, size);
      }
    }
  }
});
