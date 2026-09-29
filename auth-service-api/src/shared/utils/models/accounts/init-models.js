var DataTypes = require("sequelize").DataTypes;
var _AuditLog = require("./audit_log");
var _OauthAuthorizationCode = require("./oauth_authorization_code");
var _OauthClient = require("./oauth_client");
var _OauthProvider = require("./oauth_provider");
var _OauthState = require("./oauth_state");
var _OtpCode = require("./otp_code");
var _Permission = require("./permission");
var _RolePermission = require("./role_permission");
var _Role = require("./role");
var _UserOauthAccount = require("./user_oauth_account");
var _UserRole = require("./user_role");
var _UserToken = require("./user_token");
var _User = require("./user");

function initModels(sequelize) {
  var AuditLog = _AuditLog(sequelize, DataTypes);
  var OauthAuthorizationCode = _OauthAuthorizationCode(sequelize, DataTypes);
  var OauthClient = _OauthClient(sequelize, DataTypes);
  var OauthProvider = _OauthProvider(sequelize, DataTypes);
  var OauthState = _OauthState(sequelize, DataTypes);
  var OtpCode = _OtpCode(sequelize, DataTypes);
  var Permission = _Permission(sequelize, DataTypes);
  var RolePermission = _RolePermission(sequelize, DataTypes);
  var Role = _Role(sequelize, DataTypes);
  var UserOauthAccount = _UserOauthAccount(sequelize, DataTypes);
  var UserRole = _UserRole(sequelize, DataTypes);
  var UserToken = _UserToken(sequelize, DataTypes);
  var User = _User(sequelize, DataTypes);

  Permission.belongsToMany(Role, { as: 'role_id_roles', through: RolePermission, foreignKey: "permission_id", otherKey: "role_id" });
  Role.belongsToMany(Permission, { as: 'permission_id_permissions', through: RolePermission, foreignKey: "role_id", otherKey: "permission_id" });
  Role.belongsToMany(User, { as: 'user_id_users', through: UserRole, foreignKey: "role_id", otherKey: "user_id" });
  User.belongsToMany(Role, { as: 'role_id_roles_user_roles', through: UserRole, foreignKey: "user_id", otherKey: "role_id" });
  UserOauthAccount.belongsTo(OauthProvider, { as: "provider", foreignKey: "provider_id" });
  OauthProvider.hasMany(UserOauthAccount, { as: "oauth_accounts",foreignKey: "provider_id" });
  RolePermission.belongsTo(Permission, { foreignKey: "permission_id" });
  Permission.hasMany(RolePermission, { foreignKey: "permission_id" });
  RolePermission.belongsTo(Role, { foreignKey: "role_id" });
  Role.hasMany(RolePermission, { foreignKey: "role_id" });
  UserRole.belongsTo(Role, { foreignKey: "role_id" });
  Role.hasMany(UserRole, { foreignKey: "role_id" });
  AuditLog.belongsTo(User, { foreignKey: "user_id" });
  User.hasMany(AuditLog, { foreignKey: "user_id" });
  OauthAuthorizationCode.belongsTo(User, { foreignKey: "user_id" });
  User.hasMany(OauthAuthorizationCode, { foreignKey: "user_id" });
  OauthClient.belongsTo(User, { foreignKey: "created_by" });
  User.hasMany(OauthClient, { foreignKey: "created_by" });
  OtpCode.belongsTo(User, { foreignKey: "user_id" });
  User.hasMany(OtpCode, { foreignKey: "user_id" });
  UserOauthAccount.belongsTo(User, { foreignKey: "user_id" });
  User.hasMany(UserOauthAccount, { foreignKey: "user_id" });
  UserRole.belongsTo(User, { foreignKey: "user_id" });
  User.hasMany(UserRole, { foreignKey: "user_id" });
  UserToken.belongsTo(User, { foreignKey: "user_id" });
  User.hasMany(UserToken, { foreignKey: "user_id" });

  return {
    AuditLog,
    OauthAuthorizationCode,
    OauthClient,
    OauthProvider,
    OauthState,
    OtpCode,
    Permission,
    RolePermission,
    Role,
    UserOauthAccount,
    UserRole,
    UserToken,
    User,
  };
}
module.exports = initModels;
module.exports.initModels = initModels;
module.exports.default = initModels;
