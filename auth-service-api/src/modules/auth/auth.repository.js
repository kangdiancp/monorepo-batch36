const { Op } = require('sequelize');
const {
    User, Role, Permission,
    UserToken, OtpCode, AuditLog,
    UserRole, sequelize,
} = require('../../shared/utils/models');

const AuthRepository = {

    async findByEmail(email) {
        //  select  'user_id', 'username', 'email', 'password_hash',
        //  'full_name', 'is_active', 'is_email_verified',
        //  'failed_attempts', 'locked_until' from account.users 
        //  where email=:email and deleteAt is null
        return User.findOne({
            where: { email, deleted_at: null },
            attributes: [
                'user_id', 'username', 'email', 'password_hash',
                'full_name', 'is_active', 'is_email_verified',
                'failed_attempts', 'locked_until',
            ],
        });
    },

    async findByUsername(username) {
        return User.findOne({
            where: { username, deleted_at: null },
            attributes: [
                'user_id', 'username', 'email', 'password_hash',
                'full_name', 'is_active', 'is_email_verified',
                'failed_attempts', 'locked_until',
            ],
        });
    },

    async createUser({ username, email, passwordHash, fullName }) {
        // insert into account.users (username,email,password_hash,fullname)
        // values ($:1,$2)
        const user = await User.create({
            username,
            email,
            password_hash: passwordHash,
            full_name: fullName,
            is_active: false,
            is_email_verified: false,
        });
        return user.user_id;
    },

    async findUserById(userId) {
        return User.findOne({
            where: { user_id: userId, deleted_at: null },
            attributes: [
                'user_id', 'username', 'email', 'full_name',
                'phone_number', 'profile_picture_url',
                'is_active', 'created_at',
            ],
        });
    },


    async activateUser(userId) {
        await User.update(
            {
                is_active: true,
                is_email_verified: true,
                email_verified_at: new Date(),
            },
            { where: { user_id: userId } }
        );
    },

    async incrementFailedAttempts(userId, lockoutAt = null) {
        const updateData = { failed_attempts: sequelize.literal('failed_attempts + 1') };
        if (lockoutAt) updateData.locked_until = lockoutAt;
        await User.update(updateData, { where: { user_id: userId } });
    },

    async resetFailedAttempts(userId, ipAddress) {
        await User.update(
            {
                failed_attempts: 0,
                locked_until: null,
                last_login_at: new Date(),
                last_login_ip: ipAddress,
            },
            { where: { user_id: userId } }
        );
    },

    //ROLES & PERMISSIONS
    async assignDefaultRole(userId) {
        const defaultRole = await Role.findOne({
            where: { role_code: 'USER', is_active: true },
        });
        if (defaultRole) {
            await UserRole.create({
                user_id: userId,
                role_id: defaultRole.role_id,
                assigned_at: new Date(),
            });
        }
    },

    async getUserRolesAndPermissions(userId) {
        const user = await User.findOne({
            where: { user_id: userId },
            include: [
                {
                    model: Role,
                    //benerin ini  ?
                    //as: 'roles',
                    as: 'role_id_roles_user_roles',
                    where: { is_active: true },
                    required: false,
                    through: {
                        where: {
                            [Op.or]: [
                                { expires_at: null },
                                { expires_at: { [Op.gt]: new Date() } },
                            ],
                        },
                        attributes: [],
                    },
                    include: [
                        {
                            model: Permission,
                            //benerin ini : 
                            //as: 'permissions',
                            as: 'permission_id_permissions',
                            required: false,
                            through: { attributes: [] },
                        },
                    ],
                },
            ],
        });

        if (!user) return { roles: [], permissions: [] };

        const roles = user.roles || [];

        // Deduplicate permissions dari semua role
        const permMap = new Map();
        for (const role of roles) {
            for (const perm of (role.permissions || [])) {
                permMap.set(perm.permission_code, perm);
            }
        }

        return {
            roles,
            permissions: Array.from(permMap.values()),
        };
    },

    //TOKENS

    async saveToken({ userId, tokenType, tokenValue, expiresAt, deviceInfo, ipAddress }) {
        await UserToken.create({
            user_id: userId,
            token_type: tokenType,
            token_value: tokenValue,
            expires_at: expiresAt,
            device_info: deviceInfo || null,
            ip_address: ipAddress || null,
            is_revoked: false,
        });
    },

    async findRefreshToken(tokenValue) {
        return UserToken.findOne({
            where: {
                token_value: tokenValue,
                token_type: 'REFRESH',
                is_revoked: false,
                expires_at: { [Op.gt]: new Date() },
            },
            attributes: ['token_id', 'user_id', 'expires_at'],
        });
    },

    async revokeAllUserTokens(userId, revokedBy = 'LOGOUT') {
        await UserToken.update(
            { is_revoked: true, revoked_at: new Date(), revoked_by: revokedBy },
            { where: { user_id: userId, is_revoked: false } }
        );
    },

    async revokeToken(tokenValue, revokedBy = 'LOGOUT') {
        await UserToken.update(
            { is_revoked: true, revoked_at: new Date(), revoked_by: revokedBy },
            { where: { token_value: tokenValue } }
        );
    },

    async isJtiRevoked(jti) {
        const token = await UserToken.findOne({
            where: { token_value: jti, token_type: 'ACCESS_JTI', is_revoked: true },
            attributes: ['token_id'],
        });
        return !!token;
    },

    //OTP

    async createOtp({ userId, otpHash, purpose, expiresAt }) {
        await OtpCode.update(
            { is_used: true },
            {
                where: { user_id: userId, purpose, is_used: false },
                silent: true
            }
        );
        await OtpCode.create({
            user_id: userId,
            otp_hash: otpHash,
            purpose,
            expires_at: expiresAt,
            attempts: 0,
            max_attempts: 3,
            is_used: false,
        });
    },

    async findActiveOtp(userId, purpose) {
        return OtpCode.findOne({
            where: {
                user_id: userId,
                purpose,
                is_used: false,
                expires_at: { [Op.gt]: new Date() },
                [Op.and]: [
                    sequelize.where(
                        sequelize.col('attempts'),
                        { [Op.lt]: sequelize.col('max_attempts') }
                    ),
                ],
            },
            order: [['created_at', 'DESC']],
        });
    },

    async incrementOtpAttempts(otpId) {
        await OtpCode.update(
            { attempts: sequelize.literal('attempts + 1') },
            { where: { otp_id: otpId } }
        );
    },

    async markOtpUsed(otpId) {
        await OtpCode.update(
            { is_used: true, used_at: new Date() },
            { where: { otp_id: otpId } }
        );
    },

    //AUDIT

    async createAuditLog({ userId, action, status, ipAddress, userAgent, detail }) {
        await AuditLog.create({
            user_id: userId || null,
            action,
            status,
            ip_address: ipAddress || null,
            user_agent: userAgent || null,
            detail: detail || null,
        });
    },


    async findAllUsers({ page = 1, limit = 10, search } = {}) {
        const where = { deleted_at: null };

        if (search) {
            where[Op.or] = [
                { username: { [Op.iLike]: `%${search}%` } },
                { email: { [Op.iLike]: `%${search}%` } },
                { full_name: { [Op.iLike]: `%${search}%` } },
            ];
        }

        const offset = (page - 1) * limit;

        const { rows, count } = await User.findAndCountAll({
            where,
            limit,
            offset,
            attributes: [
                'user_id', 'username', 'email', 'full_name',
                'phone_number', 'profile_picture_url',
                'is_active', 'is_email_verified', 'created_at',
            ],
            include: [ //idem di sql
                {
                    model: Role,
                    as: 'role_id_roles_user_roles',
                    required: false,
                    attributes: ['role_id', 'role_code', 'role_name'],
                    through: { attributes: [] },
                    where: { is_active: true },
                },
            ],
            order: [['created_at', 'DESC']],
            distinct: true, // penting saat ada include agar count benar
        });

        return {
            data: rows,
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit),
                hasNext: page < Math.ceil(count / limit),
                hasPrev: page > 1,
            },
        }
    }

}

module.exports = AuthRepository;