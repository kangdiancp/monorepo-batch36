const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('User', {
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    username: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: "uq_users_username"
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: "uq_users_email"
    },
    password_hash: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    full_name: {
      type: DataTypes.STRING(200),
      allowNull: true
    },
    phone_number: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    profile_picture_url: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    is_email_verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    email_verified_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    failed_attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    locked_until: {
      type: DataTypes.DATE,
      allowNull: true
    },
    last_login_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    last_login_ip: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    password_reset_token: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    password_reset_expires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    auth_provider: {
      type: DataTypes.STRING(30),
      allowNull: true,
      defaultValue: "local",
      comment: "Provider pertama yang dipakai saat register — local artinya email+password"
    },
    has_password: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: "FALSE = user OAuth-only, belum punya password — perlu set password dulu kalau mau login local"
    }
  }, {
    sequelize,
    tableName: 'users',
    schema: 'account',
    timestamps: false,
    paranoid: true,
    indexes: [
      {
        name: "idx_users_active",
        fields: [
          { name: "is_active" },
          { name: "deleted_at" },
        ]
      },
      {
        name: "idx_users_auth_provider",
        fields: [
          { name: "auth_provider" },
        ]
      },
      {
        name: "idx_users_email",
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "idx_users_has_password",
        fields: [
          { name: "has_password" },
        ]
      },
      {
        name: "idx_users_username",
        fields: [
          { name: "username" },
        ]
      },
      {
        name: "pk_users",
        unique: true,
        fields: [
          { name: "user_id" },
        ]
      },
      {
        name: "uq_users_email",
        unique: true,
        fields: [
          { name: "email" },
        ]
      },
      {
        name: "uq_users_username",
        unique: true,
        fields: [
          { name: "username" },
        ]
      },
    ]
  });
};
