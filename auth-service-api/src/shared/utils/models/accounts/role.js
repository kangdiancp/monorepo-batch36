const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Role', {
    role_id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    role_code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: "uq_roles_code"
    },
    role_name: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  }, {
    sequelize,
    tableName: 'roles',
    schema: 'account',
    timestamps: false,
    indexes: [
      {
        name: "pk_roles",
        unique: true,
        fields: [
          { name: "role_id" },
        ]
      },
      {
        name: "uq_roles_code",
        unique: true,
        fields: [
          { name: "role_code" },
        ]
      },
    ]
  });
};
