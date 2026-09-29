const { Op }      = require('sequelize');
const { sequelize } = require('../../shared/utils/db');
const {
  OauthProvider,
  UserOauthAccount,
  OauthState,
  User
} = require('../../shared/utils/models');


const OAuthRepository = {

   // Ambil semua provider yang aktif
  async findAllProviders() {
    return OauthProvider.findAll({
      where:      { is_active: true },
      attributes: [
        'provider_id', 'provider_code', 'provider_name',
        'authorization_url', 'scope', 'redirect_uri',
        // JANGAN return client_secret ke client
      ],
      order: [['provider_name', 'ASC']],
    });
  },

  /**
   * Ambil satu provider by code — include secret untuk server-side OAuth flow
   */
  async findProviderByCode(providerCode) {
    return OauthProvider.findOne({
      where: {
        provider_code: providerCode,
        is_active:     true,
      },
    });
  },


  /**
   * Simpan state sementara saat OAuth flow dimulai
   * State expired setelah 10 menit
   */
  async createState({
    stateValue,
    providerCode,
    codeVerifier  = null,
    codeChallenge = null,
    redirectAfter = null,
    deviceInfo    = null,
    ipAddress     = null,
  }) {
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 menit

    return OauthState.create({
      state_value:    stateValue,
      provider_code:  providerCode,
      code_verifier:  codeVerifier,
      code_challenge: codeChallenge,
      redirect_after: redirectAfter,
      device_info:    deviceInfo,
      ip_address:     ipAddress,
      expires_at:     expiresAt,
      is_used:        false,
    });
  },

  /**
   * Verifikasi state saat callback dari provider
   * Cek: value cocok=> belum dipakai=> belum expired
   */
  async verifyAndConsumeState(stateValue) {
    const state = await OauthState.findOne({
      where: {
        state_value: stateValue,
        is_used:     false,
        expires_at:  { [Op.gt]: new Date() },
      },
    });

    if (!state) return null;

    // Tandai sudah dipakai — one-time use
    await state.update({
      is_used: true,
      used_at: new Date(),
    });

    return state;
  },

  /**
   * Cleanup state yang expired — dipanggil oleh background job
   */
  async cleanupExpiredStates() {
    const deleted = await OAuthState.destroy({
      where: {
        expires_at: { [Op.lt]: new Date() },
      },
    });
    return deleted;
  },

  /**
   * Cari oauth account berdasarkan provider + provider_user_id
   * Dipakai saat callback untuk cek apakah user sudah pernah OAuth dengan provider ini
   */
  async findOAuthAccount(providerCode, providerUserId) {
    return UserOauthAccount.findOne({
      where: {
        provider_code:    providerCode,
        provider_user_id: providerUserId,
        is_active:        true,
      },
      include: [
        {
          model:      OauthProvider,
          as:         'provider',
          attributes: ['provider_id', 'provider_code', 'provider_name'],
        },
      ],
    });
  },

  /**
   * Cari semua provider yang di-link ke satu user
   */
  async findOAuthAccountsByUserId(userId) {
    return UserOauthAccount.findAll({
      where: {
        user_id:   userId,
        is_active: true,
      },
      include: [
        {
          model:      OauthProvider,
          as:         'provider',
          attributes: ['provider_id', 'provider_code', 'provider_name'],
        },
      ],
      attributes: [
        'oauth_account_id', 'provider_code', 'provider_code',
        'provider_username', 'provider_email', 'provider_name',
        'provider_avatar_url', 'last_used_at', 'created_at',
        // Tidak return token ke client
      ],
    });
  },

  /**
   * Cek apakah user sudah link provider tertentu
   */
  async findOAuthAccountByUserAndProvider(userId, providerCode) {
    return UserOauthAccount.findOne({
      where: {
        user_id:      userId,
        provider_code: providerCode,
        is_active:    true,
      },
    });
  },

  /**
   * Buat link baru antara user dan OAuth account
   * Dipanggil saat: register via OAuth atau link provider baru
   */
  async createOAuthAccount({
    userId,
    providerId,
    providerCode,
    providerUserId,
    providerUsername  = null,
    providerEmail     = null,
    providerName      = null,
    providerAvatarUrl = null,
    accessToken       = null,
    refreshToken      = null,
    tokenExpiresAt    = null,
    idToken           = null,
    rawProfile        = null,
  }) {
    return UserOauthAccount.create({
      user_id:             userId,
      provider_id:         providerId,
      provider_code:       providerCode,
      provider_user_id:    providerUserId,
      provider_username:   providerUsername,
      provider_email:      providerEmail,
      provider_name:       providerName,
      provider_avatar_url: providerAvatarUrl,
      access_token:        accessToken,
      refresh_token:       refreshToken,
      token_expires_at:    tokenExpiresAt,
      id_token:            idToken,
      raw_profile:         rawProfile,
      last_used_at:        new Date(),
    });
  },

  /**
   * Update token saat OAuth token di-refresh
   */
  async updateOAuthTokens(oauthAccountId, {
    accessToken,
    refreshToken  = null,
    tokenExpiresAt = null,
  }) {
    const updateData = {
      access_token:    accessToken,
      last_used_at:    new Date(),
    };
    if (refreshToken)   updateData.refresh_token   = refreshToken;
    if (tokenExpiresAt) updateData.token_expires_at = tokenExpiresAt;

    await UserOauthAccount.update(updateData, {
      where: { oauth_account_id: oauthAccountId },
    });
  },

  /**
   * Update last_used_at saat user login via provider ini
   */
  async touchOAuthAccount(oauthAccountId) {
    await UserOauthAccount.update(
      { last_used_at: new Date() },
      { where: { oauth_account_id: oauthAccountId } }
    );
  },

  /**
   * Unlink provider dari user (soft delete — set is_active = false)
   */
  async unlinkOAuthAccount(userId, providerCode) {
    const [affectedRows] = await UserOauthAccount.update(
      { is_active: false },
      {
        where: {
          user_id:       userId,
          provider_code: providerCode,
          is_active:     true,
        },
      }
    );
    return affectedRows > 0;
  },

  /**
   * Cari user by email — untuk cek apakah email dari OAuth sudah terdaftar
   */
  async findUserByEmail(email) {
    //const User = getUser();
    return User.findOne({
      where: {
        email,
        deleted_at: null,
      },
      attributes: [
        'user_id', 'username', 'email', 'full_name',
        'is_active', 'has_password', 'auth_provider',
        'profile_picture_url',
      ],
    });
  },

  /**
   * Buat user baru dari data OAuth — tidak punya password
   * Dipanggil saat user pertama kali OAuth dan belum punya akun
   */
  async createUserFromOAuth({
    email,
    fullName,
    username,
    profilePictureUrl = null,
    authProvider,
  }) {
    //onst User = getUser();
    return User.create({
      email,
      full_name:           fullName,
      username,
      password_hash:       '',      // kosong — user tidak punya password
      has_password:        false,
      auth_provider:       authProvider,
      is_active:           true,    // langsung aktif — email sudah diverifikasi provider
      is_email_verified:   true,
      email_verified_at:   new Date(),
      profile_picture_url: profilePictureUrl,
    });
  },

  /**
   * Update auth_provider di user jika pertama kali pakai OAuth
   */
  async updateUserAuthProvider(userId, authProvider) {
    //const User = getUser();
    await User.update(
      { auth_provider: authProvider },
      { where: { user_id: userId } }
    );
  },

  /**
   * Register user baru via OAuth + create oauth_account dalam satu transaction
   * Pastikan keduanya berhasil atau keduanya rollback
   */
  async registerWithOAuth({
    // user data
    email,
    fullName,
    username,
    profilePictureUrl = null,
    authProvider,
    // oauth data
    providerId,
    providerCode,
    providerUserId,
    providerUsername  = null,
    providerEmail     = null,
    providerName      = null,
    accessToken       = null,
    refreshToken      = null,
    tokenExpiresAt    = null,
    idToken           = null,
    rawProfile        = null,
  }) {
    //const User = getUser();

    return sequelize.transaction(async (t) => {
      // 1. Buat user baru
      const user = await User.create({
        email,
        full_name:           fullName,
        username,
        password_hash:       '',
        has_password:        false,
        auth_provider:       authProvider,
        is_active:           true,
        is_email_verified:   true,
        email_verified_at:   new Date(),
        profile_picture_url: profilePictureUrl,
      }, { transaction: t });

      // 2. Buat oauth_account — link user ke provider
      const oauthAccount = await UserOauthAccount.create({
        user_id:             user.user_id,
        provider_id:         providerId,
        provider_code:       providerCode,
        provider_user_id:    providerUserId,
        provider_username:   providerUsername,
        provider_email:      providerEmail,
        provider_name:       providerName,
        provider_avatar_url: profilePictureUrl,
        access_token:        accessToken,
        refresh_token:       refreshToken,
        token_expires_at:    tokenExpiresAt,
        id_token:            idToken,
        raw_profile:         rawProfile,
        last_used_at:        new Date(),
      }, { transaction: t });

      return { user, oauthAccount };
    });
  },
};

module.exports = OAuthRepository;