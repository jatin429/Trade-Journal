const { Sequelize } = require('sequelize');
const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config();

const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_PORT = process.env.DB_PORT || 3306;
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASS || '';
const DB_NAME = process.env.DB_NAME || 'tradezella_db';

let sequelize;
let activeDialect = 'mysql';

async function initializeDatabase() {
  try {
    // 1. Try connecting to MySQL server and ensure DB exists
    console.log(`[Database] Attempting MySQL connection on ${DB_HOST}:${DB_PORT} (User: ${DB_USER})...`);
    const connection = await mysql.createConnection({
      host: DB_HOST,
      port: DB_PORT,
      user: DB_USER,
      password: DB_PASS,
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
    await connection.end();
    console.log(`[Database] MySQL Database "${DB_NAME}" confirmed/created.`);

    // 2. Initialize Sequelize with MySQL
    sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
      host: DB_HOST,
      port: DB_PORT,
      dialect: 'mysql',
      logging: false,
      pool: {
        max: 10,
        min: 0,
        acquire: 30000,
        idle: 10000,
      },
    });

    await sequelize.authenticate();
    activeDialect = 'mysql';
    console.log(`[Database] Successfully connected to MySQL (${DB_NAME}) via Sequelize.`);
    return sequelize;
  } catch (error) {
    console.warn(`[Database] MySQL connection failed: ${error.message}`);
    console.warn(`[Database] Tip: To use phpMyAdmin / MySQL, start MySQL in XAMPP Control Panel.`);
    console.log(`[Database] Seamlessly engaging fallback local SQLite engine to ensure zero downtime...`);

    // Fallback to SQLite so the app runs immediately even if XAMPP is paused
    sequelize = new Sequelize({
      dialect: 'sqlite',
      storage: path.join(__dirname, '..', 'tradezella_dev.sqlite'),
      logging: false,
    });

    await sequelize.authenticate();
    activeDialect = 'sqlite';
    console.log(`[Database] Local fallback database initialized successfully.`);
    return sequelize;
  }
}

// Default instance (will be replaced or instantiated by initializeDatabase)
sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, '..', 'tradezella_dev.sqlite'),
  logging: false,
});

module.exports = {
  sequelize,
  initializeDatabase,
  getSequelize: () => sequelize,
  getActiveDialect: () => activeDialect,
  dbConfig: { DB_HOST, DB_PORT, DB_USER, DB_NAME },
};
