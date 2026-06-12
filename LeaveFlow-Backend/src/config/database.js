const { Pool } = require('pg');
require('dotenv').config();

let pool = null;
let isConnected = false;

// Check if PostgreSQL environment variables are configured
const isPgConfigured = !!(process.env.DATABASE_URL || (process.env.DB_HOST && process.env.DB_NAME));

if (isPgConfigured) {
  const connectionConfig = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL }
    : {
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
      };

  pool = new Pool({
    ...connectionConfig,
    connectionTimeoutMillis: 3000, // wait up to 3 seconds for connection
  });
}

/**
 * Check if we can successfully query the PostgreSQL database
 * @returns {Promise<boolean>}
 */
async function testPgConnection() {
  if (!pool) {
    isConnected = false;
    return false;
  }
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW()');
    client.release();
    isConnected = !!res.rows[0];
    return isConnected;
  } catch (error) {
    console.warn('PostgreSQL connection failed. Falling back to local file database.', error.message);
    isConnected = false;
    return false;
  }
}

/**
 * Query the PostgreSQL database
 * @param {string} text 
 * @param {any[]} params 
 */
async function query(text, params) {
  if (!pool || !isConnected) {
    throw new Error('PostgreSQL pool is not connected or initialized.');
  }
  return pool.query(text, params);
}

module.exports = {
  pool,
  testPgConnection,
  query,
  isPgConfigured,
};
