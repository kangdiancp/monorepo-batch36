const express = require('express');
const OAuthController = require('./oauth.controller');
const {
  validateProvider,
  validateAuthorize,
  validateCallback,
  validateUnlink,
} = require('./oauth.validator');
const authenticate = require('../../shared/middlewares/authenticate');

const router = express.Router();

// PUBLIC routes — tidak butuh JWT
/**
 * @route  GET /auth/oauth/providers
 * @desc   List semua OAuth provider yang aktif
 * @access Public
 */
router.get('/providers', OAuthController.getProviders);

/**
 * @route  GET /auth/oauth/:google/authorize
 * @desc   Redirect user ke halaman login provider
 * @access Public
 * @query  redirectAfter — URL tujuan setelah OAuth selesai (opsional)
 */
router.get(
  '/:provider/authorize',
  validateProvider,
  validateAuthorize,
  OAuthController.authorize
);

/**
 * @route  GET /auth/oauth/:provider/callback
 * @desc   Callback dari provider — proses code, return JWT
 * @access Public (dipanggil oleh provider, bukan user langsung)
 */
router.get(
  '/:provider/callback',
  validateProvider,
  validateCallback,
  OAuthController.callback
);

// PROTECTED routes=>butuh JWT 
/**
 * @route  GET /auth/oauth/me/providers
 * @desc   List semua provider yang sudah di-link ke akun saat ini
 * @access Private
 */
router.get(
  '/me/providers',
  authenticate,
  OAuthController.getLinkedProviders
);

/**
 * @route  GET /auth/oauth/:provider/link
 * @desc   Generate URL untuk link provider baru ke akun yang sudah login
 * @access Private
 */
router.get(
  '/:provider/link',
  authenticate,
  validateProvider,
  OAuthController.getLinkUrl
);

/**
 * @route  DELETE /auth/oauth/unlink
 * @desc   Unlink provider dari akun user
 * @access Private
 * @body   { provider: 'google' | 'github' | ... }
 */
router.delete(
  '/unlink',
  authenticate,
  validateUnlink,
  OAuthController.unlinkProvider
);

module.exports = router;