module.exports = (io, socket, gameRooms, players) => {
  
  // Join room
  socket.on('joinRoom', (data) => {
    const { roomId, playerName } = data;
    
    if (!roomId || !playerName) {
      socket.emit('joinError', { message: 'Room ID and player name are required' });
      return;
    }
    
    let room = gameRooms.get(roomId);
    
    // Create room if it doesn't exist
    if (!room) {
      socket.emit('joinError', { message: 'Room does not exist' });
      return;
    }
    
    // Check if room is full
    if (room.players.length >= 8) {
      socket.emit('joinError', { message: 'Room is full' });
      return;
    }
    
    // Check if game is already in progress
    if (room.gameState === 'playing') {
      socket.emit('joinError', { message: 'Game is already in progress' });
      return;
    }
    
    const player = {
      id: socket.id,
      name: playerName,
      roomId: roomId,
      joinedAt: new Date().toISOString(),
      isReady: false
    };
    
    // Add player to room and global players map
    if (room.addPlayer(player)) {
      players.set(socket.id, player);
      socket.playerName = playerName;
      
      // Join socket room
      socket.join(roomId);
      
      // Notify player they joined successfully
      socket.emit('joinedRoom', {
        roomId,
        player,
        gameState: room.getGameState()
      });
      
      // Notify other players
      socket.to(roomId).emit('playerJoined', {
        player,
        gameState: room.getGameState()
      });
      
      // Send system message
      io.to(roomId).emit('newMessage', {
        id: Date.now(),
        message: `${playerName} joined the room`,
        timestamp: new Date().toISOString(),
        type: 'system'
      });
      
    } else {
      socket.emit('joinError', { message: 'Failed to join room' });
    }
  });
  
  // Leave room
  socket.on('leaveRoom', () => {
    const player = players.get(socket.id);
    if (!player || !player.roomId) return;
    
    const room = gameRooms.get(player.roomId);
    if (room) {
      room.removePlayer(socket.id);
      
      socket.leave(player.roomId);
      
      // Notify other players
      socket.to(player.roomId).emit('playerLeft', {
        player,
        gameState: room.getGameState()
      });
      
      // Send system message
      io.to(player.roomId).emit('newMessage', {
        id: Date.now(),
        message: `${player.name} left the room`,
        timestamp: new Date().toISOString(),
        type: 'system'
      });
      
      // Delete room if empty
      if (room.players.length === 0) {
        gameRooms.delete(player.roomId);
      }
    }
    
    players.delete(socket.id);
  });
  
  // Player ready status
  socket.on('toggleReady', () => {
    const player = players.get(socket.id);
    if (!player || !player.roomId) return;
    
    const room = gameRooms.get(player.roomId);
    if (!room) return;
    
    player.isReady = !player.isReady;
    
    io.to(player.roomId).emit('playerReadyChanged', {
      playerId: socket.id,
      isReady: player.isReady,
      gameState: room.getGameState()
    });
  });
  
  // Get room list
  socket.on('getRooms', () => {
    const roomsList = Array.from(gameRooms.values()).map(room => ({
      id: room.id,
      playerCount: room.players.length,
      gameState: room.gameState,
      maxPlayers: 8
    }));
    
    socket.emit('roomsList', roomsList);
  });
  
  // Create new room
  socket.on('createRoom', (data) => {
    const { roomName } = data;
    const roomId = roomName || `room_${Date.now()}`;
    
    if (gameRooms.has(roomId)) {
      socket.emit('createRoomError', { message: 'Room already exists' });
      return;
    }
    
    socket.emit('createRoomError', { message: 'Use API endpoint to create rooms' });
  });
};