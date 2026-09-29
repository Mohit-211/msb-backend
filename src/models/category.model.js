const { Sequelize, DataTypes, Model } = require("sequelize");
const sequelize = require("../config/central.db");
const slugify = require("slugify");

class Category extends Model {}
Category.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING,
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
    tableName: "categories",
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  }
);

Category.beforeValidate((Category) => {
  if (Category.title) {
    Category.slug = slugify(Category.title, { lower: true });
  }
});

Category.beforeUpdate((Category) => {
  Category.updated_at = new Date()
    .toISOString()
    .replace(/T/, " ")
    .replace(/\..+/g, "");
});

Category.beforeDestroy((Category) => {
  Category.deleted_at = new Date()
    .toISOString()
    .replace(/T/, " ")
    .replace(/\..+/g, "");
  Category.is_active = false;
});

module.exports = Category;
