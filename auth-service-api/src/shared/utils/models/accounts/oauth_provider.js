const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('OauthProvider', {
    provider_id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    provider_code: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: "uq_oauth_provider_code"
    },
    provider_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    client_id: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    client_secret: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: "Simpan terenkripsi — jangan plain text di DB production"
    },
    authorization_url: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    token_url: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    userinfo_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    scope: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    redirect_uri: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    tableName: 'oauth_providers',
    schema: 'account',
    timestamps: false,
    indexes: [
      {
        name: "pk_oauth_providers",
        unique: true,
        fields: [
          { name: "provider_id" },
        ]
      },
      {
        name: "uq_oauth_provider_code",
        unique: true,
        fields: [
          { name: "provider_code" },
        ]
      },
    ]
  });
};
