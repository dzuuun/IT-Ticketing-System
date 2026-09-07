const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  multipleStatements: true,
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
};

let pool = null;

async function initDatabase() {
  try {
    const dbName = process.env.DB_NAME || 'ndmu_ticketing';

    // 1. First connect without DB specified to ensure DB exists
    const rootConnection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
    });

    await rootConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await rootConnection.end();

    // 2. Create the connection pool targeting the database
    pool = mysql.createPool({
      ...dbConfig,
      database: dbName,
    });

    console.log(`[Database] Connected to MySQL database "${dbName}" successfully.`);

    // 3. Bootstrap schema only for a new database. Re-running the legacy dump
    // would drop operational ticket data on every server restart.
    const schemaPath = path.join(__dirname, '../database.sql');
    const [existingUsersTable] = await pool.query("SHOW TABLES LIKE 'users'");
    if (existingUsersTable.length === 0 && fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await pool.query(schemaSql);
      console.log('[Database] Initial schema created.');
    }

    const migrationsDir = path.join(__dirname, 'migrations');
    if (fs.existsSync(migrationsDir)) {
      for (const file of fs.readdirSync(migrationsDir).filter((name) => name.endsWith('.sql')).sort()) {
        await pool.query(fs.readFileSync(path.join(migrationsDir, file), 'utf8'));
      }
      console.log('[Database] Migrations checked.');
    }

    // 4. Check if auto seed is needed
    const [users] = await pool.query('SELECT COUNT(*) as count FROM users');
    if (users[0].count === 0) {
      console.log('[Database] Empty database detected. Running seed script...');
      const seed = require('../scripts/seed');
      await seed.runSeed(pool);
    }

    const { normalizeLegacyData } = require('./normalizeLegacyData');
    await normalizeLegacyData(pool);
    console.log('[Database] Legacy relational data normalized.');
  } catch (error) {
    console.error('[Database Error] Failed to initialize MySQL:', error.message);
    console.warn('[Database Notice] Ensure MySQL is running on port ' + (process.env.DB_PORT || 3306));
    throw error;
  }
}

async function query(sql, params) {
  if (!pool) {
    throw new Error('Database pool has not been initialized.');
  }
  const [results] = await pool.query(sql, params);
  return results;
}

module.exports = {
  initDatabase,
  query,
  getPool: () => pool,
};
