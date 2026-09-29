const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('OauthAuthorizationCode', {
    code_id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    code_value: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: "uq_oauth_code_value"
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    client_id: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    redirect_uri: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    scope: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    code_challenge: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    code_challenge_method: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    is_used: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    used_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'oauth_authorization_codes',
    schema: 'account',
    timestamps: false,
    indexes: [
      {
        name: "idx_oac_code",
        fields: [
          { name: "code_value" },
          { name: "is_used" },
        ]
      },
      {
        name: "idx_oac_expires",
        fields: [
          { name: "expires_at" },
        ]
      },
      {
        name: "pk_oauth_auth_codes",
        unique: true,
        fields: [
          { name: "code_id" },
        ]
      },
      {
        name: "uq_oauth_code_value",
        unique: true,
        fields: [
          { name: "code_value" },
        ]
      },
    ]
  });
};
