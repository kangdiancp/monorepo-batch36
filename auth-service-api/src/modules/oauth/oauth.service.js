const crypto          = require('crypto');
const { v4: uuid }    = require('uuid');
const AppError        = require('../../shared/utils/AppError');
const tokenHelper     = require('../../shared/utils/tokenHelper');
const OAuthRepository = require('./oauth.repository');
const AuthRepository  = require('../auth/auth.repository');

//Helpers

 /* Generate random state string untuk CSRF protection */
const generateState = () => crypto.randomBytes(32).toString('hex');

 /* Generate PKCE code verifier — random 43-128 char */
const generateCodeVerifier = () =>
  crypto.randomBytes(64).toString('base64url').slice(0, 128);

 /* Generate PKCE code challenge dari verifier — SHA256 + base64url */
const generateCodeChallenge = (verifier) =>
  crypto.createHash('sha256').update(verifier).digest('base64url');

 /* Generate unique username dari data provider
 * Kalau email ada, pakai bagian sebelum @
 * Tambah suffix angka kalau sudah ada */
const generateUsername = (providerData) => {
  const base = (
    providerData.provider_username ||
    providerData.provider_email?.split('@')[0] ||
    providerData.provider_name?.toLowerCase().replace(/\s+/g, '_') ||
    'user'
  ).replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 40);

  // Tambah suffix random 4 digit untuk uniqueness
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${base}_${suffix}`;
};

 /* Parse token expires — konversi seconds ke Date */
const parseTokenExpiry = (expiresIn) => {
  if (!expiresIn) return null;
  return new Date(Date.now() + Number(expiresIn) * 1000);
};

 /* Build JWT payload — sama strukturnya dengan auth.service.js */
const buildJwtPayload = (user, roles, permissions) => ({
  sub:         user.user_id,
  username:    user.username,
  email:       user.email,
  fullName:    user.full_name,
  roles:       roles.map(r => r.role_code),
  permissions: permissions.map(p => p.permission_code),
});

const parseExpiry = (str) => {
  const num = parseInt(str);

  if (str.endsWith('m')) return num * 60 * 1000;
  if (str.endsWith('h')) return num * 60 * 60 * 1000;
  if (str.endsWith('d')) return num * 24 * 60 * 60 * 1000;
  return 15 * 60 * 1000;
};


const OAuthService = {
  // 1. GET PROVIDERS — list provider yang tersedia
  async getProviders() {
    const providers = await OAuthRepository.findAllProviders();
    return providers.map(p => ({
      providerCode: p.provider_code,
      providerName: p.provider_name,
      // URL untuk login button di frontend
      loginUrl: `/api/auth/oauth/${p.provider_code}/authorize`,
    }));
  },


  // 2. GENERATE AUTHORIZE URL — redirect user ke provider
   /* Buat URL untuk redirect user ke halaman login provider
   * Simpan state + PKCE ke DB untuk verifikasi saat callback
   * @param {string} providerCode - 'google' | 'github' | 'linkedin'
   * @param {object} meta         - { redirectAfter, deviceInfo, ipAddress }
 */
  async generateAuthorizeUrl(providerCode, meta = {}) {
    // 1. Cari provider config
    const provider = await OAuthRepository.findProviderByCode(providerCode);
    if (!provider) {
      throw new AppError(`Provider '${providerCode}' tidak ditemukan atau tidak aktif`, 404);
    }

    // 2. Generate state + PKCE
    const stateValue     = generateState();
    const codeVerifier   = generateCodeVerifier();
    const codeChallenge  = generateCodeChallenge(codeVerifier);

    // 3. Simpan state ke DB
    await OAuthRepository.createState({
      stateValue,
      providerCode,
      codeVerifier,
      codeChallenge,
      redirectAfter: meta.redirectAfter || null,
      deviceInfo:    meta.deviceInfo    || null,
      ipAddress:     meta.ipAddress     || null,
    });

    // 4. Build authorization URL
    const params = new URLSearchParams({
      client_id:             provider.client_id,
      redirect_uri:          provider.redirect_uri,
      response_type:         'code',
      scope:                 provider.scope,
      state:                 stateValue,
      // PKCE
      code_challenge:        codeChallenge,
      code_challenge_method: 'S256',
      // Google specific
      ...(providerCode === 'google' && { access_type: 'offline', prompt: 'consent' }),
    });

    console.log(`params : ${provider.authorization_url}?${params.toString()}`)

    return {
      authorizeUrl: `${provider.authorization_url}?${params.toString()}`,
      state:        stateValue,
      expiresIn:    600, // 10 menit
    };
  },


  // 3. HANDLE CALLBACK — proses setelah user approve di provider
   /* Proses callback dari OAuth provider
   * Flow:
   *   1. Verifikasi state (CSRF check)
   *   2. Tukar authorization code → access token
   *   3. Ambil profile user dari provider
   *   4. Cari / buat user di DB kita
   *   5. Return JWT kita sendiri
   *
   * @param {string} providerCode - 'google' | 'github'
   * @param {string} code         - authorization code dari provider
   * @param {string} stateValue   - state yang dikirim provider, harus cocok
   * @param {object} meta         - { ipAddress, userAgent }
 */
  async handleCallback(providerCode, code, stateValue, meta = {}) {
    //Step 1: Verifikasi state 
    const state = await OAuthRepository.verifyAndConsumeState(stateValue);
    if (!state) {
      throw new AppError('State OAuth tidak valid atau sudah expired. Ulangi proses login.', 400);
    }
    if (state.provider_code !== providerCode) {
      throw new AppError('Provider tidak cocok dengan state yang tersimpan.', 400);
    }

    //Step 2: Ambil provider config 
    const provider = await OAuthRepository.findProviderByCode(providerCode);
    if (!provider) {
      throw new AppError(`Provider '${providerCode}' tidak ditemukan`, 404);
    }

    //Step 3: Tukar code → token 
    const tokenData = await this._exchangeCodeForToken({
      provider,
      code,
      codeVerifier: state.code_verifier,
    });

    //Step 4: Ambil profile dari provider 
    const providerProfile = await this._fetchUserProfile(provider, tokenData.access_token);

    //Step 5: Cari oauth_account yang sudah ada 
    let oauthAccount = await OAuthRepository.findOAuthAccount(
      providerCode,
      providerProfile.id
    );

    let user;
    let isNewUser = false;

    if (oauthAccount) {
      //EXISTING USER — sudah pernah OAuth dengan provider ini
      user = await AuthRepository.findUserById(oauthAccount.user_id);

      if (!user || !user.is_active) {
        throw new AppError('Akun tidak aktif atau sudah dihapus.', 403);
      }

      // Update token terbaru dari provider
      await OAuthRepository.updateOAuthTokens(oauthAccount.oauth_account_id, {
        accessToken:    tokenData.access_token,
        refreshToken:   tokenData.refresh_token,
        tokenExpiresAt: parseTokenExpiry(tokenData.expires_in),
      });

      await OAuthRepository.touchOAuthAccount(oauthAccount.oauth_account_id);

    } else {
      //NEW OAUTH — belum pernah pakai provider ini
      // Cek apakah email dari provider sudah ada di DB kita
      const existingUser = providerProfile.email
        ? await OAuthRepository.findUserByEmail(providerProfile.email)
        : null;

      if (existingUser) {
        //EMAIL SUDAH ADA — link provider ke user yang sudah ada 
        user = existingUser;

        // Cek apakah user ini sudah punya provider lain yang di-link
        const alreadyLinked = await OAuthRepository.findOAuthAccountByUserAndProvider(
          existingUser.user_id,
          providerCode
        );

        if (!alreadyLinked) {
          // Buat link baru
          oauthAccount = await OAuthRepository.createOAuthAccount({
            userId:           existingUser.user_id,
            providerId:       provider.provider_id,
            providerCode,
            providerUserId:   providerProfile.id,
            providerUsername: providerProfile.username,
            providerEmail:    providerProfile.email,
            providerName:     providerProfile.name,
            providerAvatarUrl: providerProfile.avatar_url,
            accessToken:      tokenData.access_token,
            refreshToken:     tokenData.refresh_token,
            tokenExpiresAt:   parseTokenExpiry(tokenData.expires_in),
            idToken:          tokenData.id_token,
            rawProfile:       providerProfile.raw,
          });
        }

        // Audit log
        await AuthRepository.createAuditLog({
          userId:    existingUser.user_id,
          action:    'OAUTH_LINK',
          status:    'SUCCESS',
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          detail:    `Provider ${providerCode} di-link ke akun yang sudah ada`,
        });

      } else {
        //BRAND NEW USER — register via OAuth
        isNewUser = true;

        const username = generateUsername(providerProfile);

        const { user: newUser, oauthAccount: newOAuthAccount } =
          await OAuthRepository.registerWithOAuth({
            // user
            email:             providerProfile.email,
            fullName:          providerProfile.name,
            username,
            profilePictureUrl: providerProfile.avatar_url,
            authProvider:      providerCode,
            // oauth
            providerId:        provider.provider_id,
            providerCode,
            providerUserId:    providerProfile.id,
            providerUsername:  providerProfile.username,
            providerEmail:     providerProfile.email,
            providerName:      providerProfile.name,
            accessToken:       tokenData.access_token,
            refreshToken:      tokenData.refresh_token,
            tokenExpiresAt:    parseTokenExpiry(tokenData.expires_in),
            idToken:           tokenData.id_token,
            rawProfile:        providerProfile.raw,
          });

        user         = newUser;
        oauthAccount = newOAuthAccount;

        // Assign default role USER
        await AuthRepository.assignDefaultRole(user.user_id);

        // Audit log
        await AuthRepository.createAuditLog({
          userId:    user.user_id,
          action:    'OAUTH_REGISTER',
          status:    'SUCCESS',
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
          detail:    `Register baru via ${providerCode}`,
        });
      }
    }

    //Step 6: Issue JWT kita sendiri
    const { roles, permissions } = await AuthRepository.getUserRolesAndPermissions(user.user_id);
    const payload      = buildJwtPayload(user.toJSON ? user.toJSON() : user, roles, permissions);
    const accessToken  = tokenHelper.signAccess(payload);
    const refreshToken = uuid();
    const decoded      = tokenHelper.decode(accessToken);
    const config       = require('../../../config');

    await Promise.all([
      AuthRepository.saveToken({
        userId:     user.user_id,
        tokenType:  'ACCESS_JTI',
        tokenValue: decoded.jti,
        expiresAt:  new Date(decoded.exp * 1000),
        ipAddress:  meta.ipAddress,
      }),
      AuthRepository.saveToken({
        userId:     user.user_id,
        tokenType:  'REFRESH',
        tokenValue: refreshToken,
        expiresAt:  new Date(Date.now() + parseExpiry(config.jwt.refreshExpiresIn)),
        deviceInfo: meta.userAgent,
        ipAddress:  meta.ipAddress,
      }),
    ]);

    // Audit log login
    await AuthRepository.createAuditLog({
      userId:    user.user_id,
      action:    'OAUTH_LOGIN',
      status:    'SUCCESS',
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      detail:    `Login via ${providerCode}`,
    });

    return {
      isNewUser,
      redirectAfter: state.redirect_after,
      user: {
        userId:            user.user_id,
        username:          user.username,
        email:             user.email,
        fullName:          user.full_name,
        profilePictureUrl: user.profile_picture_url,
        isActive:          user.is_active,
        hasPassword:       user.has_password,
        authProvider:      user.auth_provider,
      },
      roles:       roles.map(r => ({ roleId: r.role_id, roleCode: r.role_code, roleName: r.role_name })),
      permissions: permissions.map(p => ({ permissionCode: p.permission_code, module: p.module, action: p.action })),
      accessToken,
      refreshToken,
      accessTokenExpiry: new Date(decoded.exp * 1000).toISOString(),
    };
  },


  // 4. LINK PROVIDER — link provider baru ke user yang sudah login
  async getLinkUrl(providerCode, userId, meta = {}) {
    // Cek apakah provider sudah di-link
    const existing = await OAuthRepository.findOAuthAccountByUserAndProvider(userId, providerCode);
    if (existing) {
      throw new AppError(`Provider ${providerCode} sudah di-link ke akun ini.`, 409);
    }

    return this.generateAuthorizeUrl(providerCode, meta);
  },


  // 5. UNLINK PROVIDER
  async unlinkProvider(userId, providerCode) {
    // Pastikan user masih punya cara login lain
    const linkedProviders = await OAuthRepository.findOAuthAccountsByUserId(userId);
    const user            = await AuthRepository.findUserById(userId);

    // Kalau hanya punya 1 provider dan tidak punya password — tidak boleh unlink
    if (linkedProviders.length <= 1 && !user.has_password) {
      throw new AppError(
        'Tidak bisa unlink provider. Tambah password atau link provider lain terlebih dahulu.',
        400
      );
    }

    const success = await OAuthRepository.unlinkOAuthAccount(userId, providerCode);
    if (!success) {
      throw new AppError(`Provider ${providerCode} tidak ditemukan atau sudah di-unlink.`, 404);
    }

    await AuthRepository.createAuditLog({
      userId,
      action:  'OAUTH_UNLINK',
      status:  'SUCCESS',
      detail:  `Provider ${providerCode} di-unlink`,
    });

    return { message: `Provider ${providerCode} berhasil di-unlink.` };
  },


  // 6. GET LINKED PROVIDERS — list semua provider yang di-link user
  async getLinkedProviders(userId) {
    const accounts = await OAuthRepository.findOAuthAccountsByUserId(userId);
    return accounts.map(a => ({
      oauthAccountId:  a.oauth_account_id,
      providerCode:    a.provider_code,
      providerName:    a.provider?.provider_name,
      providerEmail:   a.provider_email,
      providerUsername: a.provider_username,
      avatarUrl:       a.provider_avatar_url,
      lastUsedAt:      a.last_used_at,
      linkedAt:        a.created_at,
    }));
  },


  // PRIVATE — internal helpers
   /* Tukar authorization code dengan access token dari provider */
  async _exchangeCodeForToken({ provider, code, codeVerifier }) {
    const body = new URLSearchParams({
      client_id:     provider.client_id,
      client_secret: provider.client_secret,
      code,
      redirect_uri:  provider.redirect_uri,
      grant_type:    'authorization_code',
      ...(codeVerifier && { code_verifier: codeVerifier }),
    });

    const res = await fetch(provider.token_url, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept':       'application/json',
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new AppError(`Gagal tukar token dengan ${provider.provider_name}: ${errText}`, 502);
    }

    const data = await res.json();

    if (data.error) {
      throw new AppError(`OAuth error dari ${provider.provider_name}: ${data.error_description || data.error}`, 400);
    }

    return {
      access_token:  data.access_token,
      refresh_token: data.refresh_token || null,
      expires_in:    data.expires_in    || null,
      token_type:    data.token_type    || 'Bearer',
      id_token:      data.id_token      || null,
      scope:         data.scope         || null,
    };
  },

   /* Ambil profile user dari userinfo endpoint provider
   * Normalize ke format yang konsisten */

  async _fetchUserProfile(provider, accessToken) {
    if (!provider.userinfo_url) {
      throw new AppError(`Provider ${provider.provider_name} tidak mendukung userinfo endpoint`, 500);
    }

    const res = await fetch(provider.userinfo_url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept':        'application/json',
        // GitHub butuh User-Agent
        'User-Agent':    'AuthService/1.0',
      },
    });

    if (!res.ok) {
      throw new AppError(`Gagal ambil profile dari ${provider.provider_name}`, 502);
    }

    const raw = await res.json();

    // Normalize berdasarkan provider
    return this._normalizeProfile(provider.provider_code, raw);
  },

   /* Normalize profile dari berbagai provider ke format yang konsisten */
  _normalizeProfile(providerCode, raw) {
    switch (providerCode) {
      case 'google':
        return {
          id:         raw.sub,
          email:      raw.email,
          name:       raw.name,
          username:   null,
          avatar_url: raw.picture,
          raw,
        };

      case 'github':
        return {
          id:         String(raw.id),
          email:      raw.email,
          name:       raw.name || raw.login,
          username:   raw.login,
          avatar_url: raw.avatar_url,
          raw,
        };

      case 'facebook':
        return {
          id:         raw.id,
          email:      raw.email,
          name:       raw.name,
          username:   null,
          avatar_url: raw.picture?.data?.url || null,
          raw,
        };

      case 'microsoft':
        return {
          id:         raw.id,
          email:      raw.mail || raw.userPrincipalName,
          name:       raw.displayName,
          username:   raw.userPrincipalName?.split('@')[0],
          avatar_url: null,
          raw,
        };

      default:
        // Generic fallback
        return {
          id:         raw.id   || raw.sub,
          email:      raw.email,
          name:       raw.name || raw.display_name,
          username:   raw.username || raw.login,
          avatar_url: raw.avatar_url || raw.picture,
          raw,
        };
    }
  },
};

module.exports = OAuthService;