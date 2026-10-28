const { status: httpStatus } = require("http-status");
const { Op } = require("sequelize");

const { User, UserAttachment, Blogs, BlogAttachment, Category, BlogViews } = require("../models");

const ApiError = require("../utils/ApiError");


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

const getBlogById = async (blog_id) => {
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

const getBlogFromCategory = async (body, query) => {
  const { category_slug } = body;
  const { sortBy, limit, offset } = query;

  if (category_slug && category_slug != "all") {
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
    return blogDoc
  } else if (category_slug === "all" || !category_slug) {
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
  getBlogById,
  getBlogFromCategory,
  searchBlogByCategoryNameOrBlogHeadings,
  markBlogAsViewed,
};