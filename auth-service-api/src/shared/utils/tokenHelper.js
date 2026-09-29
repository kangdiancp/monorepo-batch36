const config = require('../../../config');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');


const tokenHelper = {
  /**
   * Sign access token — payload berisi user info, roles, permissions
   * jti (JWT ID) dipakai untuk blacklist/revoke
   */
  signAccess(payload) {
    return jwt.sign(
      { ...payload, jti: uuidv4() },
      config.jwt.accessSecret,
      { expiresIn: config.jwt.accessExpiresIn, algorithm: 'HS256' }
    );
  },

  signRefresh(payload) {
    return jwt.sign(
      { sub: payload.sub, jti: uuidv4() },
      config.jwt.refreshSecret,
      { expiresIn: config.jwt.refreshExpiresIn, algorithm: 'HS256' }
    );
  },



  verifyAccess(token) {return jwt.verify(token, config.jwt.accessSecret);},
  verifyRefresh(token) { return jwt.verify(token, config.jwt.refreshSecret); },

  /**
   * Decode tanpa verify — untuk baca expiry token yang sudah expired
   */
  decode(token) { return jwt.decode(token); },
};

module.exports = tokenHelper;
