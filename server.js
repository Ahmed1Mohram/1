const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 100 * 1024 * 1024, // 100MB for file transfers
  cors: { origin: '*' }
});

app.use(express.static(path.join(__dirname, 'public')));

// Track connected users
const connectedUsers = new Map(); // socketId -> { name, room }
const rooms = new Map();          // roomId -> Set of socketIds

// ─── Message History (persistent per room until server restart) ───
// roomId -> [ { id, senderId, senderName, type, content, fileName, duration, timestamp, status } ]
const roomMessages = new Map();
const MAX_HISTORY = 500; // keep last 500 messages per room

function saveMessage(room, msg) {
  if (!roomMessages.has(room)) roomMessages.set(room, []);
  const history = roomMessages.get(room);
  history.push(msg);
  if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
}

io.on('connection', (socket) => {
  console.log(`[+] Client connected: ${socket.id}`);

  // ─── Join a room ───
  socket.on('join-room', ({ room, name }) => {
    socket.join(room);
    connectedUsers.set(socket.id, { name, room });

    if (!rooms.has(room)) rooms.set(room, new Set());
    rooms.get(room).add(socket.id);

    const roomMembers = rooms.get(room);
    console.log(`[*] ${name} joined room "${room}" (${roomMembers.size} users)`);

    // Send message history to the joining user
    const history = roomMessages.get(room) || [];
    socket.emit('room-history', { messages: history, myName: name });

    // Tell this user if partner is already there
    const others = [...roomMembers].filter(id => id !== socket.id);
    if (others.length > 0) {
      const partnerInfo = connectedUsers.get(others[0]);
      const partnerName = partnerInfo?.name || 'الطرف الآخر';
      socket.emit('partner-joined', { name: partnerName, partnerId: others[0] });
      // Tell the existing user that partner joined
      socket.to(room).emit('partner-joined', { name, partnerId: socket.id });
    } else {
      socket.emit('waiting-for-partner');
    }

    // Broadcast updated online status to room
    io.to(room).emit('user-status', { users: getOnlineUsers(room) });
  });

  // ─── Text message ───
  socket.on('send-message', (data) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    const msgData = {
      id: data.id,
      senderId: socket.id,
      senderName: user.name,
      type: 'text',
      content: data.content,
      timestamp: Date.now(),
      status: 'delivered'
    };

    saveMessage(user.room, msgData);
    socket.to(user.room).emit('receive-message', msgData);
    socket.emit('message-delivered', { id: data.id });
  });

  // ─── File message (image / video / audio) ───
  socket.on('send-file', (data) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    const msgData = {
      id: data.id,
      senderId: socket.id,
      senderName: user.name,
      type: data.fileType,
      content: data.content,
      fileName: data.fileName,
      duration: data.duration,
      timestamp: Date.now(),
      status: 'delivered'
    };

    saveMessage(user.room, msgData);
    socket.to(user.room).emit('receive-message', msgData);
    socket.emit('message-delivered', { id: data.id });
  });

  // ─── Mark messages as read ───
  socket.on('messages-read', ({ messageIds }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    // Update status in history
    const history = roomMessages.get(user.room) || [];
    messageIds.forEach(id => {
      const msg = history.find(m => m.id === id);
      if (msg) msg.status = 'seen';
    });

    socket.to(user.room).emit('messages-seen', { messageIds });
  });

  // ─── Typing indicator ───
  socket.on('typing', () => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    socket.to(user.room).emit('partner-typing');
  });

  socket.on('stop-typing', () => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    socket.to(user.room).emit('partner-stop-typing');
  });

  // ─── Disconnect ───
  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      const { room } = user;
      connectedUsers.delete(socket.id);
      if (rooms.has(room)) {
        rooms.get(room).delete(socket.id);
        if (rooms.get(room).size === 0) rooms.delete(room);
        // NOTE: we keep roomMessages even when room is empty so history persists
      }
      io.to(room).emit('partner-left');
      io.to(room).emit('user-status', { users: getOnlineUsers(room) });
      console.log(`[-] ${user.name} disconnected from room "${room}"`);
    }
  });
});

function getOnlineUsers(room) {
  if (!rooms.has(room)) return [];
  return [...rooms.get(room)].map(id => ({
    id,
    name: connectedUsers.get(id)?.name || 'Unknown'
  }));
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Chat server running on http://localhost:${PORT}`);
  console.log(`📱 On other device use your local IP (e.g. http://192.168.x.x:${PORT})\n`);
});
