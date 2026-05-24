const jwt = require('jsonwebtoken');
const { createMessage, deleteMessage } = require('./chat.service');

module.exports = function setupChatSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Unauthorized'));
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId   = decoded.userId;
      socket.userName = decoded.name;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    socket.on('join:workspace', (workspaceId) => {
      socket.join(`workspace:${workspaceId}`);
    });

    socket.on('join:conversation', (conversationId) => {
      socket.join(`conv:${conversationId}`);
    });

    socket.on('message:send', async ({ conversation_id, content }) => {
      if (!content?.trim() || !conversation_id) return;
      try {
        const message = await createMessage(conversation_id, socket.userId, content.trim());
        io.to(`conv:${conversation_id}`).emit('message:new', {
          ...message,
          sender_name: socket.userName || message.sender_name,
        });
      } catch (err) {
        socket.emit('message:error', { error: err.message });
      }
    });

    socket.on('message:delete', async ({ message_id, conversation_id }) => {
      if (!message_id || !conversation_id) return;
      try {
        await deleteMessage(message_id, socket.userId);
        io.to(`conv:${conversation_id}`).emit('message:deleted', { message_id, conversation_id });
      } catch (err) {
        socket.emit('message:error', { error: err.message });
      }
    });

    socket.on('typing:start', ({ conversation_id }) => {
      socket.to(`conv:${conversation_id}`).emit('typing', {
        user_id: socket.userId,
        user_name: socket.userName,
        conversation_id,
        typing: true,
      });
    });

    socket.on('typing:stop', ({ conversation_id }) => {
      socket.to(`conv:${conversation_id}`).emit('typing', {
        user_id: socket.userId,
        user_name: socket.userName,
        conversation_id,
        typing: false,
      });
    });
  });
};
