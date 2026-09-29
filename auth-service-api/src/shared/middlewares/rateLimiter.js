const Redis = require('ioredis');
const AppError = require('../utils/AppError');

// 1. Inisialisasi Redis client
const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1', 
  port: process.env.REDIS_PORT || 6379,
});

const createLimiter = ({ windowMs, max, message }) => {
  return async (req, res, next) => {
    try {
      const key = `rate-limit:${req.ip}:${req.path}`;
      const now = Date.now();
      const clearBefore = now - windowMs;

      // Menggunakan Redis Pipeline untuk efisiensi transaksi jaringan
      const pipeline = redis.pipeline();

      // Step 1: Hapus timestamp request yang sudah kedaluwarsa (di luar sliding window)
      pipeline.zremrangebyscore(key, 0, clearBefore);

      // Step 2: Tambahkan timestamp request saat ini ke Sorted Set (ZSET)
      // Member-nya diset unik menggunakan combination `${now}-${Math.random()}`
      pipeline.zadd(key, now, `${now}-${Math.random()}`);

      // Step 3: Hitung jumlah total request dalam sliding window saat ini
      pipeline.zcard(key);

      // Step 4: Atur Auto-Expiry pada Key agar Redis otomatis membersihkan memori jika IP pasif
      pipeline.pexpire(key, windowMs);

      // Run  all command dalam 1x round-trip ke Redis
      const results = await pipeline.exec();

      // Hasil zcard ada di indeks ke-2 dari hasil pipeline
      const totalRequests = results[2][1];

      // Jika jumlah request melebih batas 'max'
      if (totalRequests > max) {
        const retryAfter = Math.ceil(windowMs / 1000);
        res.setHeader('Retry-After', retryAfter);
        return next(new AppError(message || 'Terlalu banyak request. Coba lagi nanti.', 429));
      }

      next();
    } catch (error) {
      // Fail-open strategy: Jika Redis down/error, izinkan request lewat agar app tidak crash
      console.error('[REDIS ERROR] Rate limiter bypassed:', error.message);
      next();
    }
  };
};

// TIDAK PERLU PENGGUNAAN setInterval CLEANUP LAGI!
// Redis pexpire otomatis akan membersihkan key yang sudah habis masa aktifnya.

module.exports = {
  // 5 percobaan login per 15 menit per IP
  loginLimiter: createLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Terlalu banyak percobaan login. Coba lagi 15 menit.',
  }),

  // 3 kali kirim OTP per 10 menit per IP
  otpLimiter: createLimiter({
    windowMs: 10 * 60 * 1000,
    max: 3,
    message: 'Terlalu banyak permintaan OTP. Coba lagi 10 menit.',
  }),

  // General API limiter — 100 req per menit
  generalLimiter: createLimiter({
    windowMs: 60 * 1000,
    max: 100,
    message: 'Rate limit tercapai. Coba lagi sebentar.',
  }),
};