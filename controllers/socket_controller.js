const shuffleList = require("../lib/functions");

let io = null; // socket.io server instance

const playerRooms = {};

const rooms = {};

const disconnectHandler = function () {
  const sockets = Array.from(io.sockets.sockets).map((socket) => socket[0]);
  io.to("public").emit("online users", sockets.length);

  // the rooms player is currently in
  const disconnectPlayerFrom = playerRooms[this.id];
  if (!disconnectPlayerFrom) return;
  disconnectPlayerFrom.forEach((roomId) => {
    if (!rooms[roomId]) return;
    const players = rooms[roomId].players;
    rooms[roomId].players = players.filter((player) => {
      if (player.id === this.id) {
        io.in(roomId).emit("leave room", player.username);
      }
      return player.id !== this.id;
    });

    io.in(roomId).emit("room update", rooms[roomId].players);
    if (rooms[roomId].players.length === 0) {
      delete rooms[roomId];
    }
  });

  // remove player
  delete playerRooms[this.id];
};

const startGameHander = function (roomId) {
  io.in(roomId).emit("words generated", rooms[roomId].toType);
  io.in(roomId).emit("start game");
  rooms[roomId].inGame = true;
};

const endGameHander = function (roomId, mode) {
  const toType = shuffleList(mode).join(" ");
  rooms[roomId] = {
    players: rooms[roomId].players,
    toType,
    inGame: false,
    winner: this.id,
  };
  console.log(this.id);
  io.in(roomId).emit("winner", rooms[roomId].winner);
  io.in(roomId).emit("end game", this.id);
};

const createRoomHandler = function (roomId, mode) {
  if (io.sockets.adapter.rooms.get(roomId)) {
    this.emit("room already exist");
  } else {
    const toType = shuffleList(mode).join(" ");
    rooms[roomId] = {
      players: [],
      toType,
      inGame: false,
      winner: null,
    };

    this.emit("words generated", rooms[roomId].toType);
    this.emit("create room success", roomId);
  }
};

const updateRoomHandler = function (user) {
  const { roomId } = user;
  if (!rooms[roomId]) return;
  const players = rooms[roomId].players;
  rooms[roomId].players = players.map((player) =>
    player.id !== user.id ? player : user
  );
  io.in(roomId).emit("room update", rooms[roomId].players);
};

const joinRoomHander = function ({ roomId, user }) {
  this.emit("end game");
  const room = rooms[roomId];
  if (!room) {
    this.emit("room invalid");
    return;
  } else if (rooms[roomId].inGame) {
    this.emit("room in game");
    return;
  } else {
    rooms[roomId].players = [...rooms[roomId].players, user];
    playerRooms[this.id] = [roomId];
  }

  this.join(roomId);
  this.emit("words generated", rooms[roomId].toType);
  io.in(roomId).emit("room update", rooms[roomId].players);
  this.to(roomId).emit("notify", `${user.username} is here.`);
  console.log("join", rooms);
};

const leaveRoomHandler = function (user) {
  const { roomId } = user;
  const players = rooms[roomId];
  if (!players) return;
  rooms[roomId].players = players.players.filter((player) => {
    if (player.id === user.id) {
      this.to(roomId).emit("leave room", player.username);
    }
    return player.id !== user.id;
  });

  io.in(roomId).emit("room update", rooms[roomId].players);
  if (rooms[roomId].players.length === 0) {
    delete rooms[roomId];
  }
  console.log("leave ", rooms);
};

/**
 * Export controller and attach handlers to events
 *
 */
module.exports = function (socket, _io) {
  // save a reference to the socket.io server instance
  io = _io;

  // console.log(io.sockets.adapter.rooms);
  // console.log(sockets);
  // console.log(socket.rooms);
  console.log("connected, player:", socket.id);

  // handle user disconnect
  socket.on("disconnect", disconnectHandler);

  // game handlers
  socket.on("start game", startGameHander);
  socket.on("end game", endGameHander);

  // room handlers
  socket.on("create room", createRoomHandler);
  socket.on("room update", updateRoomHandler);
  socket.on("join room", joinRoomHander);
  socket.on("leave room", leaveRoomHandler);
};
