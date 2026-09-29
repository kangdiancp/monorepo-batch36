const AppError = require('../utils/AppError');

/**
 * authorize —  middleware
 *
 * Contoh 2 role:
 * 1. authorize.roles('admin', 'manager')  → cek req.user.roles
 * 2. authorize.permissions('dept:write')  → cek req.user.permissions
 *
 * Usage di route:
 *   router.post('/', authenticate, authorize.roles('admin'), ctrl.store)
 *   router.post('/', authenticate, authorize.permissions('dept:write'), ctrl.store)
 */
const authorize = {

   //Cek apakah user punya salah satu dari role yang disebutkan
   // rest parameter
  roles(...allowedRoles) {
    return (req, res, next) => {
      if (!req.user)
        return next(new AppError('Unauthorized', 401));

      const userRoles = req.user.roles || [];
      const hasRole   = allowedRoles.some(r => userRoles.includes(r));

      if (!hasRole)
        return next(new AppError(
          `Akses ditolak — dibutuhkan role: ${allowedRoles.join(' / ')}`,
          403
        ));

      next();
    };
  },

  
   // Cek apakah user punya permission tertentu
  permissions(...requiredPerms) {
    return (req, res, next) => {
      if (!req.user)
        return next(new AppError('Unauthorized', 401));

      const userPerms  = req.user.permissions || [];
      const hasAllPerms = requiredPerms.every(p => userPerms.includes(p));

      if (!hasAllPerms)
        return next(new AppError(
          `Akses ditolak — dibutuhkan permission: ${requiredPerms.join(', ')}`,
          403
        ));

      next();
    };
  },
};

module.exports = authorize;
