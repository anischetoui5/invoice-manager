require('dotenv').config();

const http             = require('http');
const { Server }       = require('socket.io');
const app              = require('./app');
const pool             = require('./config/db');
const setupChatSocket  = require('./modules/chat/chat.socket');

const port   = process.env.PORT || 3000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: '*', credentials: true },
});

setupChatSocket(io);

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  }
  console.log('Database connected at:', res.rows[0].now);
});

server.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
