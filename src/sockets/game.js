const { throttle } = require('../utils/helpers');

module.exports = (io, socket, gameRooms, players) => {
  
  // Handle drawing events with throttling
  const handleDrawing = throttle((data) => {
    const player = players.get(socket.id);
    if (!player || !player.roomId) return;
    
    const room = gameRooms.get(player.roomId);
    if (!room || room.currentDrawer.id !== socket.id) return;
    
    // Add drawing data to room
    room.drawingData.push({
      ...data,
      timestamp: Date.now()
    });
    
    // Broadcast to other players in room
    socket.to(player.roomId).emit('drawingData', data);
  }, 16); // ~60fps
  
  socket.on('drawing', handleDrawing);
  
  // Clear canvas
  socket.on('clearCanvas', () => {
    const player = players.get(socket.id);
    if (!player || !player.roomId) return;
    
    const room = gameRooms.get(player.roomId);
    if (!room || room.currentDrawer.id !== socket.id) return;
    
    room.drawingData = [];
    io.to(player.roomId).emit('canvasCleared');
  });
  
  // Start game
  socket.on('startGame', () => {
    const player = players.get(socket.id);
    if (!player || !player.roomId) return;
    
    const room = gameRooms.get(player.roomId);
    if (!room) return;
    
    if (room.startGame()) {
      io.to(player.roomId).emit('gameStarted', {
        gameState: room.getGameState(),
        currentDrawer: room.currentDrawer,
        roundTime: room.roundTimeLimit
      });
      
      // Send word only to drawer
      socket.emit('yourWord', { word: room.currentWord });
    }
  });
  
  // Make guess
  socket.on('makeGuess', (data) => {
    const player = players.get(socket.id);
    if (!player || !player.roomId) return;
    
    const room = gameRooms.get(player.roomId);
    if (!room || room.gameState !== 'playing') return;
    
    const isCorrect = room.makeGuess(socket.id, data.guess);
    
    if (isCorrect) {
      socket.emit('correctGuess', { points: room.scores.get(socket.id) });
      socket.to(player.roomId).emit('playerGuessedCorrectly', {
        player: player,
        word: room.currentWord
      });
    }
    
    // Broadcast updated scores
    io.to(player.roomId).emit('scoresUpdated', {
      scores: Array.from(room.scores.entries())
    });
  });
  
  // Get drawing history when joining mid-game
  socket.on('requestDrawingHistory', () => {
    const player = players.get(socket.id);
    if (!player || !player.roomId) return;
    
    const room = gameRooms.get(player.roomId);
    if (!room) return;
    
    socket.emit('drawingHistory', {
      drawingData: room.drawingData
    });
  });
  
  // Round events
  socket.on('roundEnded', () => {
    const player = players.get(socket.id);
    if (!player || !player.roomId) return;
    
    const room = gameRooms.get(player.roomId);
    if (!room) return;
    
    io.to(player.roomId).emit('roundEnded', {
      word: room.currentWord,
      scores: Array.from(room.scores.entries()),
      nextDrawer: room.currentDrawer
    });
  });
  
  // Game ended
  socket.on('gameEnded', () => {
    const player = players.get(socket.id);
    if (!player || !player.roomId) return;
    
    const room = gameRooms.get(player.roomId);
    if (!room) return;
    
    const sortedScores = Array.from(room.scores.entries())
      .sort((a, b) => b[1] - a[1]);
    
    io.to(player.roomId).emit('gameEnded', {
      finalScores: sortedScores,
      winner: sortedScores[0]
    });
  });
};