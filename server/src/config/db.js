import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn('[Database Warning] DATABASE_URL is not defined in environment variables.');
}

const isNeonDb = connectionString && connectionString.includes('neon.tech');

const pool = new Pool({
  connectionString,
  ssl: isNeonDb
    ? {
        rejectUnauthorized: false // Neon requires SSL; false permits self-signed cert checks in local node environments
      }
    : false
});

// Verify connection on startup
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('[Database] Connection failed. Verify DATABASE_URL. Error:', err.message);
  } else {
    console.log('[Database] Connected successfully to PostgreSQL. Server Time:', res.rows[0].now);
  }
});

export default pool;
