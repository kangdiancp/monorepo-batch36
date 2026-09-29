const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('UserToken', {
    token_id: {
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
      }
    },
    token_type: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    token_value: {
      type: DataTypes.STRING(500),
      allowNull: false
    },
    device_info: {
      type: DataTypes.STRING(255),
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
    is_revoked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    revoked_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    revoked_by: {
      type: DataTypes.STRING(50),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'user_tokens',
    schema: 'account',
    timestamps: false,
    indexes: [
      {
        name: "idx_ut_expires",
        fields: [
          { name: "expires_at" },
          { name: "is_revoked" },
        ]
      },
      {
        name: "idx_ut_token_value",
        fields: [
          { name: "token_value" },
        ]
      },
      {
        name: "idx_ut_user_type",
        fields: [
          { name: "user_id" },
          { name: "token_type" },
          { name: "is_revoked" },
        ]
      },
      {
        name: "pk_user_tokens",
        unique: true,
        fields: [
          { name: "token_id" },
        ]
      },
    ]
  });
};
