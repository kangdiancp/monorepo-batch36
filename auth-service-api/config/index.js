// hindari call read file .env berulang karena ada proses I/O
//require('dotenv').config(); 

module.exports = {
  app: {
    port: parseInt(process.env.PORT) || 3000,
    env: process.env.NODE_ENV || 'development',
    isDev: process.env.NODE_ENV !== 'production',
    prefix: '/api',
  },

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    name: process.env.DB_NAME || 'hr_db_batch35',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
    pool: {
      max: parseInt(process.env.DB_POOL_MAX) || 10,
      min: parseInt(process.env.DB_POOL_MIN) || 2,
      idle: parseInt(process.env.DB_POOL_IDLE) || 10000,
    },
    //Tambahkan 2 Baris Ini Untuk Memisahkan SequelizeMeta 
    migrationStorage: 'sequelize', // default
    migrationStorageTableSchema: 'public', //force agar table SequelizeMeta disimpan di public schmema
  },

  storage: {
    // pilih mo disimpan di 'local' atau 'cloudinary'
    driver: process.env.STORAGE_DRIVER || 'local',

    local: {
      uploadDir: process.env.LOCAL_UPLOAD_DIR || 'uploads',
      baseUrl: process.env.LOCAL_BASE_URL || 'http://localhost:3000',
    },

    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      apiSecret: process.env.CLOUDINARY_API_SECRET,
      folder: process.env.CLOUDINARY_FOLDER || 'user_documents',
    },

    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB) || 10,
  },

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES || '7d',
  },

  argon2: {
    type: 2,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  },

  otp: {
    length: 6,
    expiryMinutes: 10,
    maxAttempts: 3,
  },

  lockout: {
    maxFailedAttempts: 5,
    lockMinutes: 30,
  },

  mail: {
    host: process.env.MAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.MAIL_PORT) || 587,
    secure: process.env.MAIL_SECURE === 'true',
    user: process.env.MAIL_USER,
    password: process.env.MAIL_PASSWORD,
    from: process.env.MAIL_FROM || '"App" <no-reply@app.com>',
    pin: {
      expiryMinutes: parseInt(process.env.PIN_EXPIRY_MINUTES) || 10,
      maxAttempts: parseInt(process.env.PIN_MAX_ATTEMPTS) || 3,
      length: parseInt(process.env.PIN_LENGTH) || 6,
    },
  },
};