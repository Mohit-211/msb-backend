const { Sequelize, DataTypes, Model } = require("sequelize");
const sequelize = require("../config/central.db");

class SocialLogins extends Model {}
SocialLogins.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    social_media_name: {
      type: DataTypes.STRING(),
      allowNull: false,
    },
    redirection_url: {
      type: DataTypes.STRING(),
      allowNull: false,
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
    tableName: "social_logins",
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  }
);

SocialLogins.beforeUpdate((SocialLogins) => {
  SocialLogins.updated_at = new Date()
    .toISOString()
    .replace(/T/, " ")
    .replace(/\..+/g, "");
});

SocialLogins.beforeDestroy((SocialLogins) => {
  SocialLogins.deleted_at = new Date()
    .toISOString()
    .replace(/T/, " ")
    .replace(/\..+/g, "");
  SocialLogins.is_active = false;
});

module.exports = SocialLogins;
