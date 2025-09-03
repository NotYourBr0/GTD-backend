require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

// Import socket handlers
const gameSocketHandler = require('./sockets/game');
const chatSocketHandler = require('./sockets/chat');
const lobbySocketHandler = require('./sockets/lobby');

// Import game logic
const { generateRandomWord } = require('./game/wordGenerator');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN ? 
      process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()) : 
      ["https://guess-the-drawing-two.vercel.app", "http://localhost:5173"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Configure CORS with environment variables
const corsOptions = {
  origin: process.env.CORS_ORIGIN ? 
    process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()) : 
    ["https://guess-the-drawing-two.vercel.app", "http://localhost:5173"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// In-memory storage
const gameRooms = new Map();
const players = new Map();

// Game room structure
class GameRoom {
  constructor(roomId) {
    this.id = roomId;
    this.players = [];
    this.currentDrawer = null;
    this.currentWord = null;
    this.gameState = 'waiting'; // waiting, playing, ended
    this.round = 1;
    this.maxRounds = 3;
    this.roundTimeLimit = 60; // seconds
    this.roundTimer = null;
    this.scores = new Map();
    this.drawingData = [];
    this.guessedCorrectly = new Set();
    this.chatMessages = [];
  }

  addPlayer(player) {
    if (this.players.length >= 8) return false; // Max 8 players
    this.players.push(player);
    this.scores.set(player.id, 0);
    return true;
  }

  removePlayer(playerId) {
    this.players = this.players.filter(p => p.id !== playerId);
    this.scores.delete(playerId);
    
    if (this.currentDrawer && this.currentDrawer.id === playerId) {
      this.nextDrawer();
    }
  }

  startGame() {
    if (this.players.length < 2) return false;
    this.gameState = 'playing';
    this.currentDrawer = this.players[0];
    this.startRound();
    return true;
  }

  startRound() {
    this.currentWord = generateRandomWord();
    this.guessedCorrectly.clear();
    this.drawingData = [];
    this.startRoundTimer();
  }

  startRoundTimer() {
    if (this.roundTimer) clearTimeout(this.roundTimer);
    
    this.roundTimer = setTimeout(() => {
      this.endRound();
    }, this.roundTimeLimit * 1000);
  }

  endRound() {
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }

    // Award points to drawer if someone guessed correctly
    if (this.guessedCorrectly.size > 0) {
      const drawerScore = this.scores.get(this.currentDrawer.id) || 0;
      this.scores.set(this.currentDrawer.id, drawerScore + 10);
    }

    this.nextDrawer();
  }

  nextDrawer() {
    const currentIndex = this.players.findIndex(p => p.id === this.currentDrawer.id);
    const nextIndex = (currentIndex + 1) % this.players.length;
    
    if (nextIndex === 0) {
      this.round++;
    }

    if (this.round > this.maxRounds) {
      this.endGame();
    } else {
      this.currentDrawer = this.players[nextIndex];
      this.startRound();
    }
  }

  endGame() {
    this.gameState = 'ended';
    if (this.roundTimer) {
      clearTimeout(this.roundTimer);
      this.roundTimer = null;
    }
  }

  makeGuess(playerId, guess) {
    if (this.guessedCorrectly.has(playerId)) return false;
    if (this.currentDrawer.id === playerId) return false;
    
    const isCorrect = guess.toLowerCase().trim() === this.currentWord.toLowerCase();
    
    if (isCorrect) {
      this.guessedCorrectly.add(playerId);
      const currentScore = this.scores.get(playerId) || 0;
      const points = Math.max(15 - this.guessedCorrectly.size * 2, 5); // More points for faster guesses
      this.scores.set(playerId, currentScore + points);
      
      // If all players guessed correctly, end round early
      if (this.guessedCorrectly.size === this.players.length - 1) {
        this.endRound();
      }
    }
    
    return isCorrect;
  }

  getGameState() {
    return {
      id: this.id,
      players: this.players,
      currentDrawer: this.currentDrawer,
      currentWord: this.currentWord,
      gameState: this.gameState,
      round: this.round,
      maxRounds: this.maxRounds,
      scores: Array.from(this.scores.entries()),
      drawingData: this.drawingData,
      guessedCorrectly: Array.from(this.guessedCorrectly),
      chatMessages: this.chatMessages
    };
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Initialize socket handlers
  gameSocketHandler(io, socket, gameRooms, players);
  chatSocketHandler(io, socket, gameRooms);
  lobbySocketHandler(io, socket, gameRooms, players);

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    
    // Remove player from any rooms
    const player = players.get(socket.id);
    if (player && player.roomId) {
      const room = gameRooms.get(player.roomId);
      if (room) {
        room.removePlayer(socket.id);
        socket.to(player.roomId).emit('playerLeft', {
          player: player,
          gameState: room.getGameState()
        });

        // Delete room if empty
        if (room.players.length === 0) {
          gameRooms.delete(player.roomId);
        }
      }
    }
    
    players.delete(socket.id);
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.get('/api/rooms', (req, res) => {
  const roomsList = Array.from(gameRooms.values()).map(room => ({
    id: room.id,
    playerCount: room.players.length,
    gameState: room.gameState,
    maxPlayers: 8
  }));
  res.json(roomsList);
});

app.post('/api/rooms', (req, res) => {
  const { roomName } = req.body;
  const roomId = roomName || `room_${Date.now()}`;
  
  if (gameRooms.has(roomId)) {
    return res.status(400).json({ error: 'Room already exists' });
  }
  
  const room = new GameRoom(roomId);
  gameRooms.set(roomId, room);
  
  res.json({ roomId, message: 'Room created successfully' });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Export for testing
module.exports = { app, server, io, GameRoom };