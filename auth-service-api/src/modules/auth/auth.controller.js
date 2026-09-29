const response = require('../../shared/utils/response');

const getMeta = (req) => ({
    ip: req.ip || req.headers['x-forwarded-for'] || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
});

const createAuthController = (authService) => ({
    // POST /auth/signup
    async signup(req, res, next) {
        try {
            const { username, email, password, fullName } = req.body;
            const data = await authService.signup(
                { username, email, password, fullName },
                getMeta(req)
            );
            response.success(res, data, 'Registrasi berhasil. Cek email untuk kode OTP.', 201);
        } catch (e) { next(e); }
    },
});

module.exports = createAuthController;