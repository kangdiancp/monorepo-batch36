const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  return sequelize.define('Permission', {
    permission_id: {
      type: DataTypes.UUID,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    permission_code: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: "uq_permissions_code"
    },
    module: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    action: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    description: {
      type: DataTypes.STRING(255),
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'permissions',
    schema: 'account',
    timestamps: false,
    indexes: [
      {
        name: "pk_permissions",
        unique: true,
        fields: [
          { name: "permission_id" },
        ]
      },
      {
        name: "uq_permissions_code",
        unique: true,
        fields: [
          { name: "permission_code" },
        ]
      },
    ]
  });
};
