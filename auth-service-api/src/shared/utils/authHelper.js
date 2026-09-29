const config = require('../../../config'); 

const generateOtp = () => {
    const len = config.otp.length;
    const min = Math.pow(10, len - 1);
    const max = Math.pow(10, len) - 1;
    return String(Math.floor(min + Math.random() * (max - min + 1)));
};

const otpExpiresAt = () => {
    const d = new Date();
    d.setMinutes(d.getMinutes() + config.otp.expiryMinutes);
    return d;
};

const refreshExpiresAt = () => {
    const d = new Date();
    const str = config.jwt.refreshExpiresIn;
    const num = parseInt(str);
    if (str.endsWith('d')) d.setDate(d.getDate() + num);
    if (str.endsWith('h')) d.setHours(d.getHours() + num);
    return d;
};

const parseExpiry = (str) => {
    const num = parseInt(str);
    if (str.endsWith('m')) return num * 60 * 1000;
    if (str.endsWith('h')) return num * 60 * 60 * 1000;
    if (str.endsWith('d')) return num * 24 * 60 * 60 * 1000;
    return 15 * 60 * 1000;
};

// Build JWT payload dari Sequelize model instances
const buildJwtPayload = (user, roles, permissions) => ({
    sub: user.user_id,
    username: user.username,
    email: user.email,
    fullName: user.full_name,
    roles: roles.map(r => r.role_code),
    permissions: permissions.map(p => p.permission_code),
});

// Build response JSON untuk login / verify OTP
const buildAuthResponse = (user, roles, permissions, accessToken, refreshToken) => ({
    user: {
        userId: user.user_id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        isActive: user.is_active,
    },
    roles: roles.map(r => ({
        roleId: r.role_id,
        roleCode: r.role_code,
        roleName: r.role_name,
    })),
    permissions: permissions.map(p => ({
        permissionCode: p.permission_code,
        module: p.module,
        action: p.action,
    })),
    accessToken,
    refreshToken,
    accessTokenExpiry: new Date(Date.now() + parseExpiry(config.jwt.accessExpiresIn)).toISOString(),
});

module.exports = {
    generateOtp,
    otpExpiresAt,
    refreshExpiresAt,
    parseExpiry,
    buildJwtPayload,
    buildAuthResponse
};