const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('UserOauthAccount', {
    oauth_account_id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      },
      unique: "uq_oauth_user_provider"
    },
    provider_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'oauth_providers',
        key: 'provider_id'
      },
      unique: "uq_oauth_user_provider"
    },
    provider_code: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    provider_user_id: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: "uq_oauth_provider_user"
    },
    provider_username: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    provider_email: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    provider_name: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    provider_avatar_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    access_token: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Enkripsi sebelum simpan — AES-256 atau vault"
    },
    refresh_token: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Enkripsi sebelum simpan — dipakai untuk refresh token provider tanpa login ulang"
    },
    token_expires_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    id_token: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    raw_profile: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: "Full JSON dari provider userinfo endpoint — untuk audit\/debugging"
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    last_used_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'user_oauth_accounts',
    schema: 'account',
    timestamps: false,
    indexes: [
      {
        name: "idx_uoa_provider_code",
        fields: [
          { name: "provider_code" },
        ]
      },
      {
        name: "idx_uoa_provider_user",
        fields: [
          { name: "provider_id" },
          { name: "provider_user_id" },
        ]
      },
      {
        name: "idx_uoa_user_id",
        fields: [
          { name: "user_id" },
        ]
      },
      {
        name: "pk_user_oauth_accounts",
        unique: true,
        fields: [
          { name: "oauth_account_id" },
        ]
      },
      {
        name: "uq_oauth_provider_user",
        unique: true,
        fields: [
          { name: "provider_id" },
          { name: "provider_user_id" },
        ]
      },
      {
        name: "uq_oauth_user_provider",
        unique: true,
        fields: [
          { name: "user_id" },
          { name: "provider_id" },
        ]
      },
    ]
  });
};
