const config = require('../../../config');
const response  = require('../utils/response');
const AppError  = require('../utils/AppError');

const globalErrorHandler = (err, req, res, next) => {
  // AppError — error yang sudah kita throw sendiri
  if (err instanceof AppError) {
    return response.error(res, err.message, err.statusCode, err.errors);
  }

  // Oracle ORA- errors, let's populate
  if (err.errorNum) {
    const oraMessage = mapOracleError(err);
    return response.error(res, oraMessage, 400);
  }

  // SyntaxError dari JSON.parse (bad request body)
  if (err instanceof SyntaxError && err.status === 400) {
    return response.error(res, 'Invalid JSON payload', 400);
  }

  // Fallback — 500
  const message = config.app.isDev ? err.message : 'Internal Server Error';
  const stack   = config.app.isDev ? err.stack    : undefined;

  console.error('Unhandled Error:', err);

  return res.status(500).json({
    success:    false,
    statusCode: 500,
    message,
    ...(stack && { stack }),
    timestamp: new Date().toISOString(),
  });
};

function mapOracleError(err) {
  switch (err.errorNum) {
    case 1:      return 'Data sudah ada (unique constraint violated)';
    case 1400:   return 'Kolom wajib tidak boleh kosong (NOT NULL violated)';
    case 2291:   return 'Foreign key tidak ditemukan';
    case 2292:   return 'Data tidak bisa dihapus karena masih direferensi';
    case 12541:  return 'Tidak bisa konek ke Oracle — TNS no listener';
    default:     return `Oracle error ORA-${err.errorNum}: ${err.message}`;
  }
}

module.exports = globalErrorHandler;
