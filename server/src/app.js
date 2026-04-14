const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const authRoutes = require('./modules/auth/auth.routes');
const workspaceRoutes = require('./modules/workspace/workspace.routes');
const { authenticate } = require('./middlewares/auth.middleware');
const usersRoutes = require('./modules/users/users.routes');

const app = express();

app.use(helmet());
app.use(cors({ 
  origin: [process.env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true 
}));
app.use(morgan('dev'));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);

app.get('/api/me', authenticate, (req, res) => {
  res.json({ message: 'You are authenticated', user: req.user });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
app.use('/api/users', usersRoutes);

module.exports = app;