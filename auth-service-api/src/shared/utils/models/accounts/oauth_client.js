const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('OauthClient', {
    client_id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    client_name: {
      type: DataTypes.STRING(200),
      allowNull: false
    },
    client_key: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: "uq_oauth_client_key"
    },
    client_secret_hash: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    client_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "CONFIDENTIAL",
      comment: "CONFIDENTIAL=ada secret (server app), PUBLIC=no secret (SPA\/mobile) wajib PKCE"
    },
    allowed_redirect_uris: {
      type: DataTypes.JSONB,
      allowNull: false
    },
    allowed_scopes: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    allowed_grants: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: ["authorization_code"]
    },
    access_token_ttl: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 900
    },
    refresh_token_ttl: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 604800
    },
    app_description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    app_logo_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    app_website_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    contact_email: {
      type: DataTypes.STRING(150),
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    },
    is_trusted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: "TRUE = skip consent screen (first-party apps)"
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    }
  }, {
    sequelize,
    tableName: 'oauth_clients',
    schema: 'account',
    timestamps: false,
    indexes: [
      {
        name: "pk_oauth_clients",
        unique: true,
        fields: [
          { name: "client_id" },
        ]
      },
      {
        name: "uq_oauth_client_key",
        unique: true,
        fields: [
          { name: "client_key" },
        ]
      },
    ]
  });
};
