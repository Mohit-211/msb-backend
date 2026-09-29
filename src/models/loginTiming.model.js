const { Sequelize, DataTypes, Model } = require("sequelize");
const sequelize = require("../config/central.db");

class LoginTiming extends Model {}
LoginTiming.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },

    token: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    login_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    logout_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "user_login_timing",
    timestamps: true,
    underscored: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

LoginTiming.beforeUpdate(async (LoginTiming) => {
  LoginTiming.updated_at = new Date()
    .toISOString()
    .replace(/T/, " ")
    .replace(/\..+/g, "");
});

LoginTiming.beforeDestroy(async (LoginTiming) => {
  LoginTiming.deleted_at = new Date()
    .toISOString()
    .replace(/T/, " ")
    .replace(/\..+/g, "");
});

module.exports = LoginTiming;