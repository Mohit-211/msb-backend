const { Sequelize, DataTypes, Model } = require("sequelize");
const sequelize = require("../config/central.db");

class CardContent extends Model {}
CardContent.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    card_content: {
      type: DataTypes.TEXT(),
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
    tableName: "card_content",
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  }
);

CardContent.beforeUpdate((CardContent) => {
  CardContent.updated_at = new Date()
    .toISOString()
    .replace(/T/, " ")
    .replace(/\..+/g, "");
});

CardContent.beforeDestroy((CardContent) => {
  CardContent.deleted_at = new Date()
    .toISOString()
    .replace(/T/, " ")
    .replace(/\..+/g, "");
  CardContent.is_active = false;
});

module.exports = CardContent;
