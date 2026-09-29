const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('AuditLog', {
    log_id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'user_id'
      }
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(10),
      allowNull: false
    },
    ip_address: {
      type: DataTypes.STRING(45),
      allowNull: true
    },
    user_agent: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    detail: {
      type: DataTypes.STRING(1000),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'audit_logs',
    schema: 'account',
    timestamps: false,
    indexes: [
      {
        name: "idx_al_created",
        fields: [
          { name: "created_at" },
        ]
      },
      {
        name: "idx_al_user_action",
        fields: [
          { name: "user_id" },
          { name: "action" },
        ]
      },
      {
        name: "pk_audit_logs",
        unique: true,
        fields: [
          { name: "log_id" },
        ]
      },
    ]
  });
};
