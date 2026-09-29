const { Sequelize, DataTypes, Model } = require("sequelize");
const sequelize = require("../config/central.db");

class SectionContent extends Model {}
SectionContent.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    section_content: {
      type: DataTypes.TEXT(),
      allowNull: false,
    },
    redirection_url: {
      type: DataTypes.STRING(),
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
    tableName: "section_content",
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  }
);

SectionContent.beforeUpdate((SectionContent) => {
  SectionContent.updated_at = new Date()
    .toISOString()
    .replace(/T/, " ")
    .replace(/\..+/g, "");
});

SectionContent.beforeDestroy((SectionContent) => {
  SectionContent.deleted_at = new Date()
    .toISOString()
    .replace(/T/, " ")
    .replace(/\..+/g, "");
  SectionContent.is_active = false;
});

module.exports = SectionContent;
