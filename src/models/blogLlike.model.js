const { Sequelize, DataTypes, Model } = require("sequelize");
const sequelize = require("../config/central.db");
const Blog = require("./blog.model");

class BlogLike extends Model {}
BlogLike.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id",
      },
    },
    blog_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "blogs",
        key: "id",
      },
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
    tableName: "blog_likes",
    timestamps: true,
    underscored: true,
    paranoid: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
  }
);

BlogLike.afterCreate(async (blogLike) => {
  try {
    const blog = await Blog.findByPk(blogLike.blog_id);
    if (blogLike.is_active) {
      blog.likes_count++;
    } else {
      blog.likes_count--;
    }
    await blog.save();
  } catch (error) {
    console.error("Error updating like count in Blog:", error);
    throw error;
  }
});

BlogLike.beforeUpdate((BlogLike) => {
  BlogLike.updated_at = new Date()
    .toISOString()
    .replace(/T/, " ")
    .replace(/\..+/g, "");
});

BlogLike.beforeDestroy((BlogLike) => {
  BlogLike.deleted_at = new Date()
    .toISOString()
    .replace(/T/, " ")
    .replace(/\..+/g, "");
  BlogLike.is_active = false;
});

module.exports = BlogLike;
