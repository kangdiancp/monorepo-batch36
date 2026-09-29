const { z }    = require('zod');
const AppError = require('../../shared/utils/AppError');

const SUPPORTED_PROVIDERS = ['google', 'github', 'facebook', 'microsoft', 'apple', 'linkedin'];

//Schemas 
const authorizeSchema = z.object({
  redirectAfter: z.string().url('redirectAfter harus berupa URL valid').optional(),
});

const callbackSchema = z.object({
  code:  z.string({ required_error: 'code wajib ada' }).min(1, 'code tidak boleh kosong'),
  state: z.string({ required_error: 'state wajib ada' }).min(1, 'state tidak boleh kosong'),
  // Error dari provider (kalau user cancel)
  error:             z.string().optional(),
  error_description: z.string().optional(),
});

const providerParamSchema = z.object({
  provider: z.enum(SUPPORTED_PROVIDERS, {
    errorMap: () => ({
      message: `Provider tidak valid. Pilihan: ${SUPPORTED_PROVIDERS.join(', ')}`,
    }),
  }),
});

const unlinkSchema = z.object({
  provider: z.enum(SUPPORTED_PROVIDERS, {
    errorMap: () => ({
      message: `Provider tidak valid. Pilihan: ${SUPPORTED_PROVIDERS.join(', ')}`,
    }),
  }),
});

//Middleware factory 
const validate = (schema, source = 'body') => (req, res, next) => {
  const data   = source === 'params' ? req.params : source === 'query' ? req.query : req.body;
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors = result.error.errors.map(e => e.message);
    return next(new AppError('Validasi gagal', 422, errors));
  }

  if (source === 'params') req.params = result.data;
  else if (source === 'query') req.query = result.data;
  else req.body = result.data;

  next();
};

module.exports = {
  validateProvider:  validate(providerParamSchema, 'params'),
  validateAuthorize: validate(authorizeSchema, 'query'),
  validateCallback:  validate(callbackSchema, 'query'),
  validateUnlink:    validate(unlinkSchema, 'body'),
};