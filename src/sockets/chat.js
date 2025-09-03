const { sanitizeMessage } = require('../utils/helpers');

module.exports = (io, socket, gameRooms) => {
  
  socket.on('sendMessage', (data) => {
    const { message, roomId } = data;
    
    if (!message || !roomId) return;
    
    const room = gameRooms.get(roomId);
    if (!room) return;
    
    const sanitizedMessage = sanitizeMessage(message);
    const chatMessage = {
      id: Date.now(),
      playerId: socket.id,
      playerName: socket.playerName || 'Anonymous',
      message: sanitizedMessage,
      timestamp: new Date().toISOString(),
      type: 'message'
    };
    
    // Check if message is a guess during game
    if (room.gameState === 'playing' && room.currentDrawer.id !== socket.id) {
      const isCorrect = room.makeGuess(socket.id, sanitizedMessage);
      
      if (isCorrect) {
        chatMessage.type = 'correct_guess';
        chatMessage.message = '*** Guessed correctly! ***';
      } else {
        chatMessage.type = 'guess';
      }
    }
    
    room.chatMessages.push(chatMessage);
    
    // Keep only last 50 messages
    if (room.chatMessages.length > 50) {
      room.chatMessages = room.chatMessages.slice(-50);
    }
    
    io.to(roomId).emit('newMessage', chatMessage);
  });
  
  // System messages
  socket.on('sendSystemMessage', (data) => {
    const { message, roomId, type = 'system' } = data;
    
    const systemMessage = {
      id: Date.now(),
      message,
      timestamp: new Date().toISOString(),
      type
    };
    
    const room = gameRooms.get(roomId);
    if (room) {
      room.chatMessages.push(systemMessage);
    }
    
    io.to(roomId).emit('newMessage', systemMessage);
  });
  
  // Get chat history
  socket.on('requestChatHistory', (roomId) => {
    const room = gameRooms.get(roomId);
    if (room) {
      socket.emit('chatHistory', {
        messages: room.chatMessages
      });
    }
  });
};