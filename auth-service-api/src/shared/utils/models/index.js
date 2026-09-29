'use strict';

const Sequelize = require('sequelize');
const process = require('process');
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../../../../config/database.js')[env];

// Import init-models dari sub-folder modular
const initAuthModels = require('./accounts/init-models');

let sequelize;

const globalModelOptions = {
  define: {
    underscored: true,       // Memaksa semua model menggunakan snake_case
    timestamps: false,        // Mengaktifkan fitur timestamp otomatis
    paranoid: false,          // Mengaktifkan fitur soft-delete otomatis
    //createdAt: 'created_at', // Memetakan createdAt ke kolom 'created_at' di PostgreSQL
    //updatedAt: 'updated_at', // Memetakan updatedAt ke kolom 'updated_at' di PostgreSQL
    //deletedAt: 'deleted_at'  // Memetakan deletedAt ke kolom 'deleted_at' di PostgreSQL
  }
};

if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], { ...config, ...globalModelOptions });
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, { ...config, ...globalModelOptions });
}

// 1. Inisialisasi model menggunakan instance sequelize yang sama
const authModels = initAuthModels(sequelize);

// 2. Gabungkan langsung ke dalam satu object export
const db = {
  sequelize,
  Sequelize,
  ...authModels, // Otomatis mengekspor: user, role, otp_code, dll.
};

module.exports = db;