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

// Keep-alive: ping self every 10 minutes so Render free tier doesn't spin down.
// No-op outside Render (RENDER_EXTERNAL_URL is only set there) so local dev is unaffected.
const cron = require('node-cron');
function pingSelf() {
  const url = process.env.RENDER_EXTERNAL_URL;
  if (!url) return;
  require('https').get(`${url}/api/health`, () => {}).on('error', () => {});
}
pingSelf(); // ping immediately on boot/deploy, don't wait for the first 10-minute tick
cron.schedule('*/10 * * * *', pingSelf);
