require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./db');

const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

pool.query(sql, (err) => {
  if (err) {
    console.error('Migration failed:', err.message);
    process.exit(1);
  }
  console.log('Schema migrated successfully!');
  process.exit(0);
});