const httpStatus = require("http-status");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { Sequelize, QueryTypes, Op } = require("sequelize");
const moment = require("moment");
const randomize = require("randomatic");
const jwt = require("jsonwebtoken");

const sequelize = require("../config/central.db");
const {
  User,
  UserAttachment,
  Blogs,
  BlogAttachment,
  BlogCategory,
  Category,
  BlogViews,
} = require("../models");

const ApiError = require("../utils/ApiError");

const firebaseAdmin = require("../config/firebaseAdmin");
const { result } = require("lodash");

const getProfile = async (body) => {
  const { user } = body;
  let result = "";

  result = await User.findOne({
    attributes: ["id", "name", "email", "mobile"],
    include: [
      {
        model: UserAttachment,
        as: "attachements",
        attributes: ["id", "title", "file_type", "file_name", "file_uri"],
        order: [["id", "desc"]],
        limit: 1,
      },
    ],
    where: { id: user?.id, is_active: true },
  });
  if (!result)
    throw new ApiError(httpStatus.BAD_REQUEST, "Failed to Get Profile.");

  return result;
};

const updateUserProfile = async (body, files) => {
  const { name, mobile, user } = body;
  let userObj = {};

  if (name && typeof name === "string" && name !== "" && user.name !== name)
    userObj["name"] = name;

  if (
    mobile &&
    typeof mobile === "string" &&
    mobile !== "" &&
    user.mobile !== mobile
  )
    userObj["mobile"] = mobile;

  const userDoc = await User.update(userObj, {
    where: { id: user?.id, is_active: true },
  });

  if (!userDoc)
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to Update Profile."
    );

  let profileImage; // Define profileImage variable before the loop

  if (
    files &&
    Object.keys(files).length !== 0 &&
    files.images &&
    files.images.length !== 0
  ) {
    // Delete existing user attachments
    await UserAttachment.destroy({
      where: { user_id: user.id, title: "Profile Image" },
    });

    // Insert new images
    for (let i = 0; i < files.images.length; i++) {
      let currImage = files.images[i];
      const userAttachmentObj = {
        user_id: user.id,
        title: "Profile Image",
        file_type: "Image",
        file_name: currImage.filename,
        file_uri: "/images",
        file_size: currImage.size,
      };
      await UserAttachment.create(userAttachmentObj);

      // Set profileImage variable to the updated image information
      profileImage = {
        file_name: currImage.filename,
        file_uri: "/images",
        file_size: currImage.size,
      };
    }
  }

  const newUpdatedUserDoc = await User.findOne({ where: { id: user?.id } });

  // Include profile picture information in the returned user document
  if (profileImage) {
    newUpdatedUserDoc.dataValues.profileImage = profileImage;
  }

  return newUpdatedUserDoc;
};

const deactivateAccount = async (reqBody) => {
  const { user } = reqBody;

  const isDeactivated = await User.destroy({ where: { id: user?.id } });

  if (!isDeactivated) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to Deactive your account."
    );
  }
  return "";
};

const searchUserByNameOrUsername = async (body, query, params) => {
  const { name } = body;
  if (name.length < 4)
    throw new ApiError(httpStatus.BAD_REQUEST, "Minimum 4 character needed");
  const { sortBy, limit, offset } = query;

  try {
    let result = [];
    result = await User.findAll({
      attributes: ["id", "name"],
      include: [
        {
          model: UserAttachment,
          as: "attachements",
          attributes: ["id", "title", "file_type", "file_name", "file_uri"],
          order: [["id", "desc"]],
          limit: 1,
        },
      ],
      where: {
        [Op.or]: [
          { name: { [Op.like]: `%${name}%` } },
          { mobile: { [Op.like]: `%${name}%` } },
        ],
      },
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [["created_at", `${sortBy}`]],
    });
    return result;
  } catch (error) {
    console.log(error);
    return [];
  }
};

const sendNotification = async (reqBody) => {
  const { title, body, url } = reqBody;

  try {
    await firebaseAdmin.messaging().sendMulticast({
      tokens,
      notification: {
        title,
        body,
        url,
      },
    });
    // Need to store in db
    return "Successfully sent notifications!";
  } catch (error) {
    console.log(error);
    return "Something went wrong While Sending Notification!";
  }
};

const notificationToogle = async (body) => {
  const { user } = body;
  user.notification = !user.notification;
  await user.save();
  return user;
};

const getBlogById = async (blog_id, body) => {
  const { user } = body;

  const blogDoc = await Blogs.findOne({
    where: { id: blog_id, is_active: true },
    include: [
      {
        model: BlogAttachment,
        as: "blog_attachment",
        attributes: ["id", "file_type", "file_name", "file_uri"],
      },
      {
        model: Category,
        through: {
          attributes: ["id", "category_slug", "blog_id"],
        },
        attributes: ["id", "title"],
      },
    ],
  });
  if (!blogDoc)
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to Get This blog"
    );
  return blogDoc;
};

const searchBlog = async (title, slug, heading) => {
  let whereCondition = { is_active: true };

  if (title && slug) {
    whereCondition = {
      ...whereCondition,
      [Op.and]: [{ slug: slug }, { title: { [Op.iLike]: `%${title}%` } }],
    };
  } else if (slug) {
    whereCondition = {
      ...whereCondition,
      slug: slug,
    };
  } else if (title) {
    whereCondition = {
      ...whereCondition,
      name: { [Op.iLike]: `%${title}%` },
    };
  }

  if (heading && heading.length >= 3) {
    whereCondition = {
      ...whereCondition,
      "$Blogs.heading$": { [Op.iLike]: `%${heading}%` },
    };
  }

  const blogDoc = await Category.findOne({
    // where: { is_active: true, title: title },
    where: whereCondition,
    include: [
      {
        model: Blogs,
        as: "Blogs",
        include: [
          {
            model: BlogAttachment,
            as: "blog_attachment",
          },
        ],
      },
    ],
  });

  if (!blogDoc) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to Get Blog from this category"
    );
  }

  return blogDoc;
};

const getBlogFromCategory = async (body, query, params) => {
  const { category_slug } = body;
  console.log("categoyrslug====>", category_slug);
  const { sortBy, limit, offset } = query;
  const {} = params;

  if (category_slug && category_slug != "all") {
    // const blogCount = await BlogCategory.count({
    //   where: {
    //     is_active: true,
    //     category_slug: category_slug,
    //   },
    // });

    const blogDoc = await Blogs.findAndCountAll({
      distinct:true,
      where: {
        [Op.and]: [
          { is_active: true },
          {
            "$Categories.slug$": category_slug,
          },
        ],
      },
      include: [
        {
          model: BlogAttachment,
          as: "blog_attachment",
          attributes: ["id", "file_type", "file_name", "file_uri"],
        },
        {
          model: Category,
          through: {
            attributes: [],
            limit: parseInt(limit),
            offset: parseInt(offset),
          },
          attributes: ["id", "title", "slug"],
        },
      ],
    });

    if (!blogDoc)
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to Get Blog from this category"
      );
    // return { total: blogCount, blogs: blogDoc };
    return blogDoc
  } else if (category_slug === "all" || !category_slug) {
    // const allBlogsCount = await Blogs.count({
    //   where: {
    //     is_active: true,
    //   },
    // });
    const allBlogs = await Blogs.findAndCountAll({
      distinct:true,
      include: [
        {
          model: BlogAttachment,
          as: "blog_attachment",
          attributes: ["id", "file_type", "file_name", "file_uri"],
        },
        {
          model: Category,
          through: {
            attributes: [],
          },
          attributes: ["id", "title", "slug"],
        },
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
    // return { total: allBlogsCount, blogs: allBlogs };
    return allBlogs
  }
};

const searchBlogByCategoryNameOrBlogHeadings = async (queryData) => {
  const { sortBy, limit, page, offset, query } = queryData;

  try {
    const blogDoc = await Blogs.findAll({
      attributes: [
        "id",
        "heading",
        "description",
        "likes_count",
        "is_active",
        "type",
      ],
      where: {
        [Op.or]: [
          { heading: { [Op.like]: `%${query}%` } },
          { type: { [Op.like]: `%${query}%` } },
          {
            "$Categories.title$": {
              [Op.like]: `%${query}%`,
            },
          },
        ],
      },
      include: [
        {
          model: BlogAttachment,
          as: "blog_attachment",
          attributes: ["id", "file_type", "file_name", "file_uri"],
        },
        {
          model: Category,
          through: {
            attributes: [],
          },
          attributes: ["id", "title", "slug"],
        },
      ],
    });
    if (!blogDoc) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to Get Blog from this category"
      );
    }
    return blogDoc;
  } catch (error) {
    return [];
  }
};

const markBlogAsViewed = async (body, blog_id) => {
  const { user } = body;
  const blogDoc = await Blogs.findOne({ where: { id: blog_id } });
  if (!blogDoc) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Blog not found");
  }

  // Check if the entry already exists
  // const existingEntry = await BlogViews.findOne({
  //   where: { user_id: user.id, blog_id: blog_id },
  // });

  // if (existingEntry) {
  //   return existingEntry;
  // }

  const viewObj = {
    user_id: user.id,
    blog_id: blog_id,
  };

  // Create a new entry
  const viewDoc = await BlogViews.create(viewObj);
  if (!viewDoc)
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to mark as viewed"
    );

  blogDoc.views_count = (blogDoc.views_count ? blogDoc.views_count : 0) + 1;
  await blogDoc.save();

  return viewDoc;
};

module.exports = {
  updateUserProfile,
  getProfile,
  deactivateAccount,
  searchUserByNameOrUsername,
  sendNotification,
  notificationToogle,
  getBlogById,
  searchBlog,
  getBlogFromCategory,
  searchBlogByCategoryNameOrBlogHeadings,
  markBlogAsViewed,
};