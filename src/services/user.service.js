const { status: httpStatus } = require("http-status");
const { Op } = require("sequelize");

const {
  User,
  UserAttachment,
  Blogs,
  BlogAttachment,
  BlogCategory,
  Category,
  BlogViews,
} = require("../models");
const {
  accessSummary,
  canReadStory,
  presentStory,
  LOCKED_STORY_MESSAGE,
} = require("../utils/access");

const ApiError = require("../utils/ApiError");

// What story lists and search return with each story.
const listIncludes = () => [
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
];

const getProfile = async (body) => {
  const { user } = body;
  const result = await User.findOne({
    attributes: ["id", "name", "email", "mobile", "payment_status", "created_at"],
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

  // Lets the site show the trial or plan, and what it allows.
  return { ...result.toJSON(), access: accessSummary(result) };
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

// `viewer` is the signed-in user reading the story.
const getBlogById = async (blog_id, viewer) => {
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
    throw new ApiError(httpStatus.NOT_FOUND, "Story not found");
  return presentStory(blogDoc, viewer);
};

// Ids of the stories in a category, looked up by the category's current slug.
const blogIdsInCategory = async (slug) => {
  const category = await Category.findOne({ attributes: ["id"], where: { slug } });
  if (!category) return [];
  const links = await BlogCategory.findAll({
    attributes: ["blog_id"],
    where: { category_id: category.id },
  });
  return links.map((link) => link.blog_id);
};

const getBlogFromCategory = async (body, query, viewer) => {
  const { category_slug } = body;
  const { sortBy, limit, offset } = query;

  const where = { is_active: true };
  if (category_slug && category_slug !== "all") {
    // Filtering by id rather than through the include keeps paging right and each story's full category list.
    where.id = await blogIdsInCategory(category_slug);
  }

  const blogDoc = await Blogs.findAndCountAll({
    distinct: true,
    where,
    include: listIncludes(),
    order: [["id", sortBy === "DESC" ? "DESC" : "ASC"]],
    limit,
    offset,
  });
  return {
    count: blogDoc.count,
    rows: blogDoc.rows.map((blog) => presentStory(blog, viewer)),
  };
};

const searchBlogByCategoryNameOrBlogHeadings = async (queryData, viewer) => {
  const { limit, offset, query } = queryData;
  if (typeof query !== "string" || query.trim() === "") return [];

  const like = { [Op.like]: `%${query.trim()}%` };
  // Searching "paid" or "unpaid" finds that kind of story. A partial match would also find UNPAID for "paid".
  const type = query.trim().toUpperCase();
  const categories = await Category.findAll({ attributes: ["id"], where: { title: like } });
  const links = categories.length
    ? await BlogCategory.findAll({
        attributes: ["blog_id"],
        where: { category_id: categories.map((category) => category.id) },
      })
    : [];

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
      is_active: true,
      [Op.or]: [
        { heading: like },
        ...(["PAID", "UNPAID"].includes(type) ? [{ type }] : []),
        { id: links.map((link) => link.blog_id) },
      ],
    },
    include: listIncludes(),
    order: [["id", "ASC"]],
    limit,
    offset,
  });
  return blogDoc.map((blog) => presentStory(blog, viewer));
};

const markBlogAsViewed = async (body, blog_id) => {
  const { user } = body;
  const blogDoc = await Blogs.findOne({ where: { id: blog_id, is_active: true } });
  if (!blogDoc) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Blog not found");
  }
  if (!canReadStory(blogDoc, user)) {
    throw new ApiError(httpStatus.FORBIDDEN, LOCKED_STORY_MESSAGE);
  }

  // One view per reader, however often they open the story.
  const [viewDoc, created] = await BlogViews.findOrCreate({
    where: { user_id: user.id, blog_id: blogDoc.id },
  });
  if (created) {
    await blogDoc.increment("views_count");
  }

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