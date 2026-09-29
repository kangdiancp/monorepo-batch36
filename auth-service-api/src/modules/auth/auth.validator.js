const { z } = require('zod');
const AppError = require('../../shared/utils/AppError');

//Schemas

const signupSchema = z.object({
  username: z
    .string({ required_error: 'username wajib diisi' })
    .min(3, 'username minimal 3 karakter')
    .max(50, 'username maksimal 50 karakter')
    .regex(/^[a-zA-Z0-9_]+$/, 'username hanya boleh huruf, angka, dan underscore'),

  email: z
    .string({ required_error: 'email wajib diisi' })
    .email('format email tidak valid')
    .max(150, 'email maksimal 150 karakter'),

  password: z
    .string({ required_error: 'password wajib diisi' })
    .min(8, 'password minimal 8 karakter')
    .max(100, 'password maksimal 100 karakter')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'password harus mengandung huruf besar, huruf kecil, dan angka'
    ),

  fullName: z
    .string({ required_error: 'fullName wajib diisi' })
    .min(2, 'fullName minimal 2 karakter')
    .max(200, 'fullName maksimal 200 karakter'),
});

const loginSchema = z.object({
  identifier: z
    .string({ required_error: 'email atau username wajib diisi' })
    .min(1, 'email atau username wajib diisi'),

  password: z
    .string({ required_error: 'password wajib diisi' })
    .min(1, 'password wajib diisi'),
});

const sendOtpSchema = z.object({
  email: z
    .string({ required_error: 'email wajib diisi' })
    .email('format email tidak valid'),

  purpose: z.enum(
    ['EMAIL_VERIFY', 'PASSWORD_RESET', 'TWO_FACTOR', 'PIN_SETUP', 'PIN_RESET'],
    { required_error: 'purpose wajib diisi' }
  ),
});

const verifyOtpSchema = z.object({
  email: z
    .string({ required_error: 'email wajib diisi' })
    .email('format email tidak valid'),

  otp: z
    .string({ required_error: 'otp wajib diisi' })
    .length(6, 'otp harus 6 digit')
    .regex(/^\d+$/, 'otp hanya boleh angka'),

  purpose: z.enum(
    ['EMAIL_VERIFY', 'PASSWORD_RESET', 'TWO_FACTOR', 'PIN_SETUP', 'PIN_RESET'],
    { required_error: 'purpose wajib diisi' }
  ),
});

const refreshSchema = z.object({
  refreshToken: z
    .string({ required_error: 'refreshToken wajib diisi' })
    .min(1, 'refreshToken wajib diisi'),
});

const logoutSchema = z.object({
  refreshToken: z
    .string({ required_error: 'refreshToken wajib diisi' })
    .min(1, 'refreshToken wajib diisi'),
});

//Middleware factory
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const errors = result.error.errors.map(e => e.message);
    return next(new AppError('Validasi gagal', 422, errors));
  }
  req.body = result.data; // pakai data yang sudah di-sanitize Zod
  next();
};

module.exports = {
  validateSignup: validate(signupSchema),
  validateLogin: validate(loginSchema),
  validateSendOtp: validate(sendOtpSchema),
  validateVerifyOtp: validate(verifyOtpSchema),
  validateRefresh: validate(refreshSchema),
  validateLogout: validate(logoutSchema),
};
