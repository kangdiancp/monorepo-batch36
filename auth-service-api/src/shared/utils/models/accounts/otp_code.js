const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('OtpCode', {
    otp_id: {
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
    otp_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    purpose: {
      type: DataTypes.STRING(30),
      allowNull: false
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    max_attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 3
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
    tableName: 'otp_codes',
    schema: 'account',
    timestamps: false,
    indexes: [
      {
        name: "idx_otp_expires",
        fields: [
          { name: "expires_at" },
          { name: "is_used" },
        ]
      },
      {
        name: "idx_otp_user_purpose",
        fields: [
          { name: "user_id" },
          { name: "purpose" },
          { name: "is_used" },
        ]
      },
      {
        name: "pk_otp_codes",
        unique: true,
        fields: [
          { name: "otp_id" },
        ]
      },
    ]
  });
};
