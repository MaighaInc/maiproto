const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  port: 5432,
});

async function createTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      content TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
}

async function insertMessage(content) {
  const res = await pool.query('INSERT INTO messages(content) VALUES($1) RETURNING *', [content]);
  return res.rows[0];
}

async function getMessages() {
  const res = await pool.query('SELECT * FROM messages ORDER BY id DESC');
  return res.rows;
}

async function updateMessage(id, content) {
  const res = await pool.query('UPDATE messages SET content=$1 WHERE id=$2 RETURNING *', [content, id]);
  return res.rows[0];
}

async function deleteMessage(id) {
  await pool.query('DELETE FROM messages WHERE id=$1', [id]);
}

module.exports = { createTable, insertMessage, getMessages, updateMessage, deleteMessage };