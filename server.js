const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

const players = {};

io.on("connection", socket => {
  console.log("Player joined:", socket.id);

  // Add player
  players[socket.id] = { x: 100, y: 100, color: "red" };

  // Update player position
  socket.on("move", data => {
    players[socket.id] = data;
  });

  // Remove player on disconnect
  socket.on("disconnect", () => {
    delete players[socket.id];
  });
});

// Broadcast state 30 times per second
setInterval(() => {
  io.emit("state", players);
}, 1000 / 30);

http.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

