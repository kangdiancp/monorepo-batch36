const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('RolePermission', {
    role_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'roles',
        key: 'role_id'
      }
    },
    permission_id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      references: {
        model: 'permissions',
        key: 'permission_id'
      }
    },
    granted_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.Sequelize.literal('CURRENT_TIMESTAMP')
    },
    granted_by: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'role_permissions',
    schema: 'account',
    timestamps: false,
    indexes: [
      {
        name: "idx_rp_role",
        fields: [
          { name: "role_id" },
        ]
      },
      {
        name: "pk_role_permissions",
        unique: true,
        fields: [
          { name: "role_id" },
          { name: "permission_id" },
        ]
      },
    ]
  });
};
