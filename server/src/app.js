const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const authRoutes = require('./modules/auth/auth.routes');
const workspaceRoutes = require('./modules/workspace/workspace.routes');
const usersRoutes = require('./modules/users/users.routes');
const invoicesRoutes = require('./modules/invoices/invoices.routes');
const documentsRoutes = require('./modules/documents/documents.routes');
const subscriptionRoutes = require('./modules/subscription/subscription.routes');
const companyRoutes = require('./modules/company/company.routes');
const invitationsRoutes = require('./modules/invitations/invitations.routes');
const { getAllInvoices } = require('./modules/invoices/invoices.controller');
const { authenticate, authorizeAdmin } = require('./middlewares/auth.middleware');


const app = express();

app.use(helmet());
app.use(cors({
  origin: [process.env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());

app.get('/api/invoices', authenticate, authorizeAdmin, getAllInvoices);

app.use('/api/workspaces/:workspace_id/invoices', invoicesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

app.use('/api/workspaces/:workspace_id/invoices', invoicesRoutes);
app.use('/api/workspaces/:workspace_id/invoices/:invoice_id/documents', documentsRoutes);

app.use('/api/company', companyRoutes);
app.use('/api/invitations', invitationsRoutes);

app.get('/api/me', authenticate, (req, res) => {
  res.json({ message: 'You are authenticated', user: req.user });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});


module.exports = app;