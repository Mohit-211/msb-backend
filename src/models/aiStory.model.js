const { Sequelize, DataTypes, Model } = require("sequelize");
const sequelize = require("../config/central.db");
const slugify = require("slugify");
class AiStory extends Model { }
AiStory.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    input: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    heading: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    likes_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    comment_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    views_count: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    type: {
      type: DataTypes.ENUM,
      values: ["PAID", "UNPAID"],
      defaultValue: "UNPAID"
    },
    is_posted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_user_saved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    created_at: {
      type: DataTypes.DATE,
      defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
    },
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
    tableName: "ai-story",
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  }
);

AiStory.beforeValidate((AiStory) => {
  if (AiStory.input) {
    AiStory.slug = slugify(AiStory.input, { lower: true });
  }
});

AiStory.beforeUpdate((AiStory) => {
  AiStory.updated_at = new Date()
    .toISOString()
    .replace(/T/, " ")
    .replace(/\..+/g, "");
});

AiStory.beforeDestroy((AiStory) => {
  AiStory.deleted_at = new Date()
    .toISOString()
    .replace(/T/, " ")
    .replace(/\..+/g, "");
  AiStory.is_active = false;
});

module.exports = AiStory;