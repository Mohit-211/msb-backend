const { Sequelize, DataTypes, Model } = require("sequelize");
const sequelize = require("../config/central.db");

class BannerContent extends Model {}
BannerContent.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    banner_content: {
      type: DataTypes.TEXT(),
      allowNull: false,
    },
    
    file_type: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    file_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    file_uri: {
      type: DataTypes.STRING,
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
    tableName: "banner_content",
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  }
);

BannerContent.beforeUpdate((BannerContent) => {
  BannerContent.updated_at = new Date()
    .toISOString()
    .replace(/T/, " ")
    .replace(/\..+/g, "");
});

BannerContent.beforeDestroy((BannerContent) => {
  BannerContent.deleted_at = new Date()
    .toISOString()
    .replace(/T/, " ")
    .replace(/\..+/g, "");
  BannerContent.is_active = false;
});

module.exports = BannerContent;
