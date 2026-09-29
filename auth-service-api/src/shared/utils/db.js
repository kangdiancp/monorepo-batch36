// Sequelize connection untuk PostgreSQL
const { Sequelize } = require('sequelize');
const config = require('../../../config');

const sequelize = new Sequelize(
  config.db.name,
  config.db.user,
  config.db.password,
  {
    host: config.db.host,
    port: config.db.port,
    dialect: 'postgres',
    pool: config.db.pool,
    logging: (sql) => {
      if (sql.includes('updated_at')) {
        console.error('Check updated_at:', sql);
      } else {
        console.log('[SQL]', sql);
      }
    },
    define: {
      // Semua model pake snake_case di DB, di JS kita gunakan camelCase 
      underscored: true,
      timestamps: false,    // ← disable createdAt + updatedAt
      paranoid: false,    // ← disable deletedAt
      freezeTableName: true,
    },
  }
);

const connectDB = async () => {
  // 1. Test koneksi
  await sequelize.authenticate();
  console.log(`PostgreSQL connected — ${config.db.host}:${config.db.port}/${config.db.name}`);

/*   // 2. Buat schema account kalau belum ada
  await sequelize.query('CREATE SCHEMA IF NOT EXISTS account;');
  console.log('Schema "account" ready');

  // 3. Load semua model ke sequelize instance INI
  //    WAJIB dipanggil sebelum sync() agar Sequelize tahu model apa saja
  const initModels = require('./models/accounts/init-models');
  initModels(sequelize);
  console.log('Models registered');

  // 4. Sync — buat tabel yang belum ada, alter yang sudah ada
  await sequelize.sync({ alter: true });
  console.log('Database sync complete'); */
};



const closeDB = async () => {
  await sequelize.close();
  console.log('PostgreSQL connection closed.');
};

module.exports = { sequelize, connectDB, closeDB };
