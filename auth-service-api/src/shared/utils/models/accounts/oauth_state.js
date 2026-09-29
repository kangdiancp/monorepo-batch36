const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('OauthState', {
    state_id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    state_value: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: "Random UUID\/string — dikirim ke provider sebagai ?state= param, dicek saat callback",
      unique: "uq_oauth_state_value"
    },
    code_verifier: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: "PKCE: random 43-128 char string, disimpan server side"
    },
    code_challenge: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: "PKCE: BASE64URL(SHA256(code_verifier)) — dikirim ke provider"
    },
    provider_code: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    redirect_after: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    device_info: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    ip_address: {
      type: DataTypes.STRING(45),
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
    tableName: 'oauth_states',
    schema: 'account',
    timestamps: false,
    indexes: [
      {
        name: "idx_oauth_states_expires",
        fields: [
          { name: "expires_at" },
        ]
      },
      {
        name: "idx_oauth_states_value",
        fields: [
          { name: "state_value" },
          { name: "is_used" },
        ]
      },
      {
        name: "pk_oauth_states",
        unique: true,
        fields: [
          { name: "state_id" },
        ]
      },
      {
        name: "uq_oauth_state_value",
        unique: true,
        fields: [
          { name: "state_value" },
        ]
      },
    ]
  });
};
