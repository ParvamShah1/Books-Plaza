const pool = require('./db');

async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('Successfully connected to Railway PostgreSQL database!');
    const result = await client.query('SELECT NOW()');
    console.log('Database time:', result.rows[0].now);
    await client.release();
  } catch (err) {
    console.error('Error connecting to database:', err);
  } finally {
    await pool.end();
  }
}

testConnection();