const { Sequelize } = require('sequelize');
require('dotenv').config();

const DB_HOST = process.env.DB_HOST;
const DB_PORT = Number(process.env.DB_PORT || 4000);
const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS;
const DB_NAME = process.env.DB_NAME || 'tradezella_db';

let activeDialect = 'mysql';

// Connect directly to the existing TiDB database.
// No SQLite fallback and no CREATE DATABASE query.
const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: 'mysql',
  logging: false,

  dialectOptions: {
    ssl: {
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
    },
  },

  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

async function initializeDatabase() {
  try {
    console.log(
      `[Database] Connecting to TiDB at ${DB_HOST}:${DB_PORT}...`
    );

    await sequelize.authenticate();

    activeDialect = 'mysql';

    console.log(
      `[Database] Connected successfully to ${DB_NAME}.`
    );

    return sequelize;
  } catch (error) {
    console.error('[Database] TiDB connection failed:', error.message);
    throw error;
  }
}

module.exports = {
  sequelize,
  initializeDatabase,
  getSequelize: () => sequelize,
  getActiveDialect: () => activeDialect,
  dbConfig: { DB_HOST, DB_PORT, DB_USER, DB_NAME },
};
