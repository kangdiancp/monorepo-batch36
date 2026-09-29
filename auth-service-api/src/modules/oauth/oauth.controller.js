const OAuthService = require('./oauth.service');
const response     = require('../../shared/utils/response');
const AppError     = require('../../shared/utils/AppError');

// Helper ambil meta dari request
const getMeta = (req) => ({
  ipAddress: req.ip || req.headers['x-forwarded-for'] || 'unknown',
  userAgent: req.headers['user-agent'] || 'unknown',
});

const OAuthController = {

  // GET /auth/oauth/providers
  // List semua provider yang aktif dan tersedia
  async getProviders(req, res, next) {
    try {
      const data = await OAuthService.getProviders();
      response.success(res, data, 'Daftar OAuth provider berhasil diambil');
    } catch (e) { next(e); }
  },

  // GET /auth/oauth/:provider/authorize
  // Generate authorize URL lalu redirect user ke provider
  async authorize(req, res, next) {
    try {
      const { provider }     = req.params;
      const { redirectAfter } = req.query;
      const meta             = getMeta(req);

      const { authorizeUrl } = await OAuthService.generateAuthorizeUrl(
        provider,
        { ...meta, redirectAfter }
      );

      // Redirect user ke halaman login provider
      // e.g. https://accounts.google.com/o/oauth/auth?client_id=...
      res.redirect(authorizeUrl);
    } catch (e) { next(e); }
  },

  // GET /auth/oauth/:provider/callback
  // Callback dari provider setelah user approve
  async callback(req, res, next) {
    try {
      const { provider }          = req.params;
      const { code, state, error, error_description } = req.query;
      const meta                  = getMeta(req);

      // User cancel atau provider return error
      if (error) {
        const msg = error_description || error;
        // Redirect ke frontend dengan error
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        return res.redirect(
          `${frontendUrl}/auth/oauth/error?message=${encodeURIComponent(msg)}&provider=${provider}`
        );
      }

      // Proses callback
      const result = await OAuthService.handleCallback(
        provider, code, state, meta
      );

      const frontendUrl     = process.env.FRONTEND_URL || 'http://localhost:3000';
      const redirectTarget  = result.redirectAfter || `${frontendUrl}/dashboard`;

      // Opsi A — Redirect ke frontend dengan token di query param
      // (frontend langsung simpan ke storage)
      // Kurang aman karena token kelihatan di URL
      //
      // return res.redirect(
      //   `${redirectTarget}?access_token=${result.accessToken}&refresh_token=${result.refreshToken}`
      // );

      // Opsi B — Return JSON (untuk SPA yang pakai fetch/axios)
      // Frontend handle redirect sendiri berdasarkan redirectAfter
      response.success(res, {
        isNewUser:        result.isNewUser,
        redirectAfter:    result.redirectAfter,
        user:             result.user,
        roles:            result.roles,
        permissions:      result.permissions,
        accessToken:      result.accessToken,
        refreshToken:     result.refreshToken,
        accessTokenExpiry: result.accessTokenExpiry,
      }, result.isNewUser ? 'Registrasi via OAuth berhasil' : 'Login via OAuth berhasil');

    } catch (e) { next(e); }
  },

  // GET /auth/oauth/me/providers
  // List semua provider yang sudah di-link user saat ini
  async getLinkedProviders(req, res, next) {
    try {
      const userId = req.user?.sub;
      if (!userId) return next(new AppError('Unauthorized', 401));

      const data = await OAuthService.getLinkedProviders(userId);
      response.success(res, data, 'Daftar provider yang di-link berhasil diambil');
    } catch (e) { next(e); }
  },

  // GET /auth/oauth/:provider/link
  // Generate URL untuk link provider baru ke akun yang sudah login
  async getLinkUrl(req, res, next) {
    try {
      const { provider }  = req.params;
      const userId        = req.user?.sub;
      const meta          = getMeta(req);

      if (!userId) return next(new AppError('Unauthorized', 401));

      const { authorizeUrl } = await OAuthService.getLinkUrl(provider, userId, meta);

      // Redirect ke provider untuk link
      res.redirect(authorizeUrl);
    } catch (e) { next(e); }
  },

  // DELETE /auth/oauth/unlink
  // Unlink provider dari akun user
  async unlinkProvider(req, res, next) {
    try {
      const userId         = req.user?.sub;
      const { provider }   = req.body;

      if (!userId) return next(new AppError('Unauthorized', 401));

      const data = await OAuthService.unlinkProvider(userId, provider);
      response.success(res, data, `Provider ${provider} berhasil di-unlink`);
    } catch (e) { next(e); }
  },
};

module.exports = OAuthController;