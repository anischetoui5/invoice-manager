require('dotenv').config();

const app = require('./app');
const pool = require('./config/db');
const port = process.env.PORT || 3000;

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Database connection failed:', err.message);
    process.exit(1);
  }
  console.log('Database connected at:', res.rows[0].now);
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
}); 