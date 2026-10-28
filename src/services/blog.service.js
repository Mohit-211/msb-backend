const { status: httpStatus } = require("http-status");
const { Op } = require("sequelize");

const ApiError = require("../utils/ApiError");
const pageOf = require("../helpers/pageOf");
const parseCategoryIds = require("../helpers/parseCategoryIds");
const filledIfSent = require("../helpers/filledIfSent");
const { sanitizeRichText } = require("../utils/sanitizeHtml");
const { canReadStory, LOCKED_STORY_MESSAGE } = require("../utils/access");
const {
  BlogAttachment,
  Blogs,
  Category,
  BlogLike,
  BlogComment,
  User,
  UserAttachment,
  BlogCategory,
  Admin,
  BlogViews,
  AiStory,
} = require("../models");

// UNPAID is the free kind of story.
const STORY_TYPES = ["PAID", "UNPAID"];

// blogs.heading is VARCHAR(150); a longer title would fail in the database with a 500.
const MAX_HEADING_LENGTH = 150;
const checkHeadingLength = (heading) => {
  if (typeof heading === "string" && heading.trim().length > MAX_HEADING_LENGTH) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Story titles can be at most ${MAX_HEADING_LENGTH} characters`
    );
  }
};

// Likes and comments are counted from their own tables, so the totals on the story can't drift.
const recountBlog = async (blogId, transaction) => {
  const likes = await BlogLike.count({ where: { blog_id: blogId, is_active: true }, transaction });
  const comments = await BlogComment.count({ where: { blog_id: blogId, is_active: true }, transaction });
  await Blogs.update(
    { likes_count: likes, comment_count: comments },
    { where: { id: blogId }, transaction, silent: true }
  );
};

// Makes the story's categories exactly `ids`, refusing ids that don't exist.
const setBlogCategories = async (blogId, ids, transaction) => {
  const categories = ids.length
    ? await Category.findAll({ where: { id: ids }, transaction })
    : [];
  if (categories.length !== ids.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, "One or more categories don't exist");
  }

  // Removed links are soft-deleted but still hold the unique (blog, category) pair, so bring those back
  // instead of inserting the pair again.
  const existing = await BlogCategory.findAll({
    where: { blog_id: blogId },
    paranoid: false,
    order: [["id", "ASC"]],
    transaction,
  });
  const linked = new Set();
  for (const link of existing) {
    if (ids.includes(link.category_id) && !linked.has(link.category_id)) {
      linked.add(link.category_id);
      if (link.isSoftDeleted()) await link.restore({ transaction });
    } else if (!link.isSoftDeleted()) {
      await link.destroy({ transaction });
    }
  }
  for (const category of categories) {
    if (!linked.has(category.id)) {
      await BlogCategory.create(
        {
          blog_id: blogId,
          category_id: category.id,
          category_slug: category.slug,
          category_name: category.title,
        },
        { transaction }
      );
    }
  }
};

// Records uploaded images and videos for a story. New uploads replace the story's earlier ones of that kind.
const saveAttachments = async (blogId, files, transaction) => {
  const kinds = [
    ["images", "Image", "/images"],
    ["videos", "Video", "/videos"],
  ];
  for (const [field, fileType, fileUri] of kinds) {
    const uploads = files?.[field] ?? [];
    if (!uploads.length) continue;

    await BlogAttachment.destroy({ where: { blog_id: blogId, file_type: fileType }, transaction });
    for (const file of uploads) {
      await BlogAttachment.create(
        {
          blog_id: blogId,
          file_type: fileType,
          file_name: file.filename,
          file_uri: fileUri,
          file_size: file.size,
        },
        { transaction }
      );
    }
  }
};

const createBlog = async (body, files, reqBody) => {
  const { heading, description, type } = body;
  const categoryIds = parseCategoryIds(body.categories) ?? [];

  if (!STORY_TYPES.includes(type)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "type must be PAID or UNPAID");
  }
  checkHeadingLength(heading);

  const existingBlog = await Blogs.findOne({
    where: {
      heading: heading,
    },
  });
  if (existingBlog) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Story with the same title already exists"
    );
  }

  // One transaction, so a bad category or upload leaves no half-created story behind.
  return Blogs.sequelize.transaction(async (transaction) => {
    const blogDoc = await Blogs.create(
      {
        created_by: reqBody.user.id,
        heading,
        description: sanitizeRichText(description),
        type,
      },
      { transaction }
    );
    await setBlogCategories(blogDoc.id, categoryIds, transaction);
    await saveAttachments(blogDoc.id, files, transaction);
    return blogDoc;
  });
};

// ?search= matches the title. With ?limit= (and ?page=) the result is one page, as { count, rows }.
const getAllBlogs = async (query = {}) => {
  const where = { is_active: 1 };
  if (typeof query.search === "string" && query.search.trim() !== "") {
    where.heading = { [Op.like]: `%${query.search.trim()}%` };
  }
  const options = {
    where,
    order: [["id", "ASC"]],
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
  };

  if (query.limit) {
    const { count, rows } = await Blogs.findAndCountAll({ ...options, ...pageOf(query, 50), distinct: true });
    return { count, rows };
  }
  return Blogs.findAll(options);
};

const getBlogById = async (id) => {
  const blogDoc = await Blogs.findOne({
    where: { id: id, is_active: true },
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
      {
        model: Admin,
        as: "blog_admin",
        attributes: ["name"],
      },
    ],
  });
  if (!blogDoc)
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to Get All Blogs"
    );
  return blogDoc;
};

const updateBlog = async (body, files) => {
  const { blog_id, type } = body;
  const categoryIds = parseCategoryIds(body.categories);

  const blogDoc = await Blogs.findOne({
    where: { id: blog_id },
  });

  if (!blogDoc) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid Blog Id");
  }
  const heading = filledIfSent(body, "heading");
  const description = filledIfSent(body, "description");
  // An empty type is refused like any other value that isn't PAID or UNPAID.
  if (type !== undefined && !STORY_TYPES.includes(type)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "type must be PAID or UNPAID");
  }
  if (heading !== undefined && heading !== blogDoc.heading) {
    checkHeadingLength(heading);
    const duplicate = await Blogs.findOne({
      where: { heading, id: { [Op.ne]: blogDoc.id } },
    });
    if (duplicate) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Story with the same title already exists"
      );
    }
  }

  // One transaction, so a failure part-way leaves the story exactly as it was.
  return Blogs.sequelize.transaction(async (transaction) => {
    if (heading !== undefined) blogDoc.heading = heading;
    if (description !== undefined) blogDoc.description = sanitizeRichText(description);
    if (type !== undefined) blogDoc.type = type;
    await blogDoc.save({ transaction });

    // Leaving categories out keeps them as they are; an empty list removes them all.
    if (categoryIds !== undefined) {
      await setBlogCategories(blogDoc.id, categoryIds, transaction);
    }
    await saveAttachments(blogDoc.id, files, transaction);
    return blogDoc;
  });
};

const deleteBlog = async (reqBody) => {
  const blogDoc = await Blogs.findOne({
    where: { id: reqBody.blog_id },
  });
  if (!blogDoc) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Blog not found");
  }

  // Everything attached to the story goes with it, in one transaction.
  await Blogs.sequelize.transaction(async (transaction) => {
    const where = { blog_id: blogDoc.id };
    for (const Model of [BlogCategory, BlogComment, BlogLike, BlogViews, BlogAttachment]) {
      await Model.destroy({ where, transaction });
    }
    await blogDoc.destroy({ transaction });
    // A deleted AI story goes back to unpublished, so the admin's AI story list stays right.
    if (blogDoc.ai_story_id) {
      await AiStory.update(
        { is_posted: false },
        { where: { id: blogDoc.ai_story_id }, transaction }
      );
    }
  });

  return blogDoc;
};

const likeAndDislikeBlog = async (body) => {
  const { blog_id, user } = body;

  const likeObj = {
    user_id: user.id,
    blog_id: blog_id,
  };
  let message;
  let postDoc = await Blogs.findOne({
    where: { id: blog_id, is_active: true },
  });
  if (!postDoc) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid Blog Id.");
  }
  if (!canReadStory(postDoc, user)) {
    throw new ApiError(httpStatus.FORBIDDEN, LOCKED_STORY_MESSAGE);
  }

  let likeDoc = await BlogLike.findOne({
    where: { user_id: user.id, blog_id: blog_id },
  });
  if (!likeDoc) {
    await BlogLike.create(likeObj);
    message = "User Liked This Post.";
  } else {
    message = likeDoc.is_active
      ? "User Dislike Successfully."
      : "User Liked Successfully.";
    likeDoc.is_active = !likeDoc.is_active;
    await likeDoc.save();
  }
  await recountBlog(postDoc.id);
  return message;
};

const getLikesCountAndUserLikeStatus = async (body, blog_id) => {
  const { user } = body;

  const blogDoc = await Blogs.findOne({
    where: { id: blog_id },
  });

  if (!blogDoc) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid Blog Id.");
  }

  // Get total count of likes for the specified blog
  const totalLikesCount = await BlogLike.count({
    where: { blog_id: blog_id, is_active: true },
  });

  // Check if the user has liked the blog
  const userLikeStatus = await BlogLike.findOne({
    where: { blog_id: blog_id, user_id: user.id, is_active: true },
  });

  // If userLikeStatus is not null, the user has liked the blog; otherwise, they haven't.
  const is_like = !!userLikeStatus;

  return { total_likes: totalLikesCount, is_like: is_like };
};

const createCommenetInBlog = async (body) => {
  const { blog_id, comment, user } = body;

  if (typeof comment !== "string" || comment.trim() === "") {
    throw new ApiError(httpStatus.BAD_REQUEST, "Please write a comment");
  }
  const postDoc = await Blogs.findOne({ where: { id: blog_id, is_active: true } });
  if (!postDoc)
    throw new ApiError(httpStatus.BAD_REQUEST, "Inavalid Blog Id");
  if (!canReadStory(postDoc, user)) {
    throw new ApiError(httpStatus.FORBIDDEN, LOCKED_STORY_MESSAGE);
  }

  const commentObj = {
    user_id: user.id,
    blog_id: blog_id,
    comment: comment,
  };
  let commnetDoc = await BlogComment.create(commentObj);
  if (!commnetDoc)
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create Comment In Blog"
    );
  await recountBlog(postDoc.id);
  return commnetDoc;
};

const getAllCommentsByBlogId = async (body, blog_id) => {
  const { user } = body;

  const commentDoc = await BlogComment.findAll({
    where: { blog_id: blog_id, is_active: true },
    include: [
      {
        model: User,
        as: "commented_by",
        attributes: ["id", "name"],
        where: { is_active: true },
        include: [
          {
            model: UserAttachment,
            as: "attachements",
            attributes: ["id", "title", "file_type", "file_name", "file_uri"],
            order: [["id", "desc"]],
            limit: 1,
          },
        ],
      },
    ],
  });

  if (!commentDoc) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to Get All Comment"
    );
  }

  // Separate comments by the user whose token is passed and sort accordingly
  const sortedComments = commentDoc.sort((a, b) => {
    if (a.commented_by.id === user.id) return -1;
    if (b.commented_by.id === user.id) return 1;
    return 0;
  });

  return sortedComments;
};

const getAllLikesByBlogId = async (blog_id) => {
  const commentDoc = await BlogLike.findAndCountAll({
    where: { blog_id: blog_id, is_active: true },
    include: [
      {
        model: User,
        as: "liked_by",
        attributes: ["id", "name"],
        where: { is_active: true },
        include: [
          {
            model: UserAttachment,
            as: "attachements",
            attributes: ["id", "title", "file_type", "file_name", "file_uri"],
            order: [["id", "desc"]],
            limit: 1,
          },
        ],
      },
    ],
  });

  if (!commentDoc) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to Get All Comment"
    );
  }

  return commentDoc;
};

const getCommentsByBlogId = async (blog_id) => {
  const commentDoc = await BlogComment.findAndCountAll({
    where: { blog_id: blog_id, is_active: true },
    include: [
      {
        model: User,
        as: "commented_by",
        attributes: ["id", "name"],
        where: { is_active: true },
      },
    ],
  });

  if (!commentDoc) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to Get All Comment"
    );
  }

  return commentDoc;
};

const deleteCommentByAdmin = async (reqBody) => {
  const blogDoc = await BlogComment.findOne({
    where: {
      id: reqBody.comment_id,
    },
  });
  if (!blogDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Comment not found");
  }
  await blogDoc.destroy();
  await recountBlog(blogDoc.blog_id);
};

module.exports = {
  STORY_TYPES,
  checkHeadingLength,
  recountBlog,
  setBlogCategories,
  saveAttachments,
  createBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
  likeAndDislikeBlog,
  createCommenetInBlog,
  getAllCommentsByBlogId,
  getLikesCountAndUserLikeStatus,
  getCommentsByBlogId,
  deleteCommentByAdmin,
  getAllLikesByBlogId,
};