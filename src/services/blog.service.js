const httpStatus = require("http-status");
const slugify = require("slugify");
const { Sequelize, Op } = require("sequelize");
const moment = require("moment-timezone");

const ApiError = require("../utils/ApiError");
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
} = require("../models");

const createBlog = async (body, files, reqBody) => {
  const { heading, description, categories, type } = body;

  const existingBlog = await Blogs.findOne({
    where: {
      heading: body.heading,
    },
  });
  if (existingBlog) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Story with the same title already exists"
    );
  }

  let blogObj = {
    created_by: reqBody.user.id,
  };
  if (heading && typeof heading !== "undefined" && heading !== "")
    blogObj["heading"] = heading;
  if (description && typeof description !== "undefined" && description !== "")
    blogObj["description"] = description;
  if (type && typeof type !== "undefined" && type !== "")
    blogObj["type"] = type;

  let blogDoc;

  let categoryArr = categories;

  try {
    const blogDoc = await Blogs.create(blogObj);
    for (const id of categoryArr) {
      const categoryObj = await Category.findOne({
        where: { id: id },
      });

      // return categoryObj

      if (categoryObj && blogDoc) {
        // Create entry in blog_category table
        await BlogCategory.create({
          blog_id: blogDoc.id,
          category_id: categoryObj.id,
          category_slug: categoryObj.slug,
          category_name: categoryObj.title,
        });
      } else {
        // Handle case where category is not found
        console.log(`Category '${id.trim()}' not found.`);
      }
    }

    if (!blogDoc)
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Failed to create New Blog"
      );

    if (
      files &&
      Object.keys(files).length !== 0 &&
      files.images &&
      files.images.length !== 0
    ) {
      for (let i = 0; i < files.images.length; i++) {
        let currImage = files.images[i];
        const blogAttachmentObj = {
          blog_id: blogDoc.id,
          file_type: "Image",
          file_name: currImage.filename,
          file_uri: "/images",
          file_size: currImage.size,
        };
        await BlogAttachment.create(blogAttachmentObj);
      }
    }
    ("");
    if (
      files &&
      Object.keys(files).length !== 0 &&
      files.videos &&
      files.videos.length !== 0
    ) {
      for (let i = 0; i < files.videos.length; i++) {
        let currVideo = files.videos[i];
        const blogAttachmentObj = {
          blog_id: blogDoc.id,
          file_type: "Video",
          file_name: currVideo.filename,
          file_uri: "/videos",
          file_size: currVideo.size,
        };
        await BlogAttachment.create(blogAttachmentObj);
      }
    }

    if (
      files &&
      Object.keys(files).length !== 0 &&
      files.docs &&
      files.docs.length !== 0
    ) {
      for (let i = 0; i < files.docs.length; i++) {
        let currDoc = files.docs[i];
        const blogAttachmentObj = {
          blog_id: blogDoc.id,
          file_type: "Video",
          file_name: currDoc.filename,
          file_uri: "/videos",
          file_size: currDoc.size,
        };
        await BlogAttachment.create(blogAttachmentObj);
      }
    }

    return blogDoc;
  } catch (error) {
    console.log(error);
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create New Blog"
    );
  }
};

const getAllBlogs = async () => {
  const blogDoc = await Blogs.findAll({
    where: { is_active: 1 },
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

  if (!blogDoc) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "|=> Failed to get all Blogs <=|"
    );
  }
  return blogDoc;
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
  let { blog_id, heading, description, type, categories } = body;
  const blogDoc = await Blogs.findOne({
    where: { id: blog_id },
  });

  if (!blogDoc) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid Blog Id");
  }
  let result = "";
  if (
    heading &&
    typeof heading !== "undefined" &&
    heading !== "" &&
    blogDoc["heading"] !== heading
  )
    blogDoc["heading"] = heading;
  if (
    description &&
    typeof description !== "undefined" &&
    description !== "" &&
    blogDoc["description"] !== description
  )
    blogDoc["description"] = description;
  if (
    type &&
    typeof type !== "undefined" &&
    type !== "" &&
    blogDoc["type"] !== type
  )
    blogDoc["type"] = type;

  try {
    result = await blogDoc.save();
    categories = categories.split(",").map((elm) => Number(elm));

    const existingCategories = await BlogCategory.findAll({
      where: { blog_id: blogDoc.id },
    });

    let matchCategoryIds = [];
    let removedCategoryIds = [];

    existingCategories.map((elm) => {
      if (!categories.includes(elm.category_id)) {
        removedCategoryIds.push(elm.category_id);
      } else {
        matchCategoryIds.push(elm.category_id);
        categories = categories.filter((item) => item !== elm.category_id);
      }
    });

    // return {categories, matchCategoryIds, removedCategoryIds};

    removedCategoryIds.map(async (id) => {
      await BlogCategory.destroy({
        where: { blog_id: blogDoc.id, category_id: id },
      });
    });

    for (const categoryId of categories) {
      const categoryObj = await Category.findOne({
        where: { id: categoryId },
      });

      if (categoryObj) {
        await BlogCategory.create({
          blog_id: blogDoc.id,
          category_id: categoryObj.id,
          category_slug: categoryObj.slug,
          category_name: categoryObj.title,
        });
      } else {
        // Handle case where category is not found
        console.log(`Category '${categoryId.trim()}' not found.`);
      }
    }

    // Create new image attachments
    if (
      files &&
      Object.keys(files).length !== 0 &&
      files.images &&
      files.images.length !== 0
    ) {
      // Delete previous image attachments
      await BlogAttachment.destroy({
        where: { blog_id: blog_id, file_type: "Image" },
      });

      for (let i = 0; i < files.images.length; i++) {
        let currImage = files.images[i];
        const blogAttachmentObj = {
          blog_id: blog_id,
          file_type: "Image",
          file_name: currImage.filename,
          file_uri: "/images",
          file_size: currImage.size,
        };
        await BlogAttachment.create(blogAttachmentObj);
      }
    }

    // Create new video attachments
    if (
      files &&
      Object.keys(files).length !== 0 &&
      files.videos &&
      files.videos.length !== 0
    ) {
      // Delete previous video attachments
      await BlogAttachment.destroy({
        where: { blog_id: blog_id, file_type: "Video" },
      });
      for (let i = 0; i < files.videos.length; i++) {
        let currVideo = files.videos[i];
        const blogAttachmentObj = {
          blog_id: blog_id,
          file_type: "Video",
          file_name: currVideo.filename,
          file_uri: "/videos",
          file_size: currVideo.size,
        };
        await BlogAttachment.create(blogAttachmentObj);
      }
    }

    return result;
  } catch (error) {
    console.log(error);
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to Update New Blog"
    );
  }
};

const deleteBlog = async (reqBody) => {
  const blogDoc = await Blogs.findOne({
    where: { id: reqBody.blog_id },
  });
  if (!blogDoc) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Blog not found");
  }
  await blogDoc.destroy();

  //destroy blogcategory
  const blogCategoryDocs = await BlogCategory.findAll({
    where: { blog_id: reqBody.blog_id },
  });

  // Iterate through each instance and destroy it
  for (const blogCategoryDoc of blogCategoryDocs) {
    await blogCategoryDoc.destroy();
  }

  //destroy blog comment
  const blogCommentDocs = await BlogComment.findAll({
    where: { blog_id: reqBody.blog_id },
  });

  // Iterate through each instance and destroy it
  for (const blogCommentDoc of blogCommentDocs) {
    await blogCommentDoc.destroy();
  }

  //destroy blog llike
  const blogLikeDoc = await BlogLike.findOne({
    where: { blog_id: reqBody.blog_id },
  });

  if (blogLikeDoc) {
    await blogLikeDoc.destroy();
  }

  //destroy blog view
  const blogViewDoc = await BlogViews.findOne({
    where: { blog_id: reqBody.blog_id },
  });

  if (blogViewDoc) {
    await blogViewDoc.destroy();
  }

  //destroy blog attachement
  const blogAttachmentDoc = await BlogAttachment.findOne({
    where: { blog_id: reqBody.blog_id },
  });

  if (blogAttachmentDoc) {
    await blogAttachmentDoc.destroy();
  }

  return blogDoc;
};

const likeAndDislikeBlog = async (body, io) => {
  const { blog_id, user } = body;

  const likeObj = {
    user_id: user.id,
    blog_id: blog_id,
  };
  let message = "";
  let postDoc = await Blogs.findOne({
    where: { id: blog_id, is_active: true },
  });
  if (!postDoc) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid Blog Id.");
  }

  let likeDoc = await BlogLike.findOne({
    where: { user_id: user.id, blog_id: blog_id },
  });
  if (!likeDoc) {
    await BlogLike.create(likeObj);
    postDoc.likes_count += 1;
    message = "User Liked This Post.";
  } else {
    if (likeDoc.is_active === true) {
      message = "User Dislike Successfully.";
      postDoc.likes_count =
        postDoc.likes_count > 0 ? postDoc.likes_count - 1 : 0;
    } else {
      message = "User Liked Successfully.";
      postDoc.likes_count += 1;
    }

    likeDoc.is_active = !likeDoc.is_active;
    await likeDoc.save();
  }
  await postDoc.save();
  return message;
};

const getAllUserLikedPostByBlogId = async (body, query, params) => {
  const { user } = body;
  const { sortBy, limit, offset } = query;
  const { blog_id } = params;

  const likeDoc = await BlogLike.findAll({
    attributes: [
      "id",
      [
        Sequelize.fn(
          "date_format",
          Sequelize.col("BlogLike.created_at"),
          "%d %b, %Y"
        ),
        "created_at",
      ],
    ],
    where: { blog_id: blog_id, is_active: true },
    include: [
      {
        model: User,
        as: "liked_by",
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
      },
    ],
    limit: parseInt(limit),
    offset: parseInt(offset),
    order: [["created_at", `${sortBy}`]],
  });
  if (!likeDoc)
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to Get All Likes User"
    );

  return likeDoc;
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

  const postDoc = await Blogs.findByPk(blog_id);
  if (!postDoc)
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Inavalid Blog Id");

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
  postDoc.comment_count =
    (postDoc.comment_count ? postDoc.comment_count : 0) + 1;
  await postDoc.save();
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

const getCommentByUserId = async (body) => {
  const { user, blogId } = body;
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
      {
        model: BlogComment,
        as: "user_commented_posts",
        where: { blog_id: blogId }, // Include this line to filter by blogId
        // attributes: ["id", "text", "createdAt"],
        // include: [
        //   {
        //     model: Blogs,
        //     where: { id: blogId }, // Include this line to filter by blogId
        //     as: "comments",
        //   },
        // ],
      },
    ],
    where: { id: user?.id, is_active: true },
  });

  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Failed to Get Comment.");
  }

  return result;
};

const updateComment = async (body) => {
  const { user, blog_id, comment } = body; // Assuming you also have an id field in the body
  let commentObj = {};

  if (comment && typeof comment === "string" && comment !== "") {
    commentObj["comment"] = comment;
  }

  const updatedRows = await BlogComment.update(commentObj, {
    where: { user_id: user?.id, blog_id: blog_id, is_active: true },
  });

  if (updatedRows === 0) {
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "Comment not found or not eligible for update."
    );
  }

  return commentObj;
};

const deleteCommentByUser = async (reqBody) => {
  const blogDoc = await BlogComment.findOne({
    where: {
      blog_id: reqBody.blog_id,
      user_id: reqBody.user.id,
    },
  });
  if (!blogDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Blog not found");
  }
  await blogDoc.destroy({
    where: {
      blog_id: reqBody.blog_id,
      user_id: reqBody.user.id,
      is_active: true,
    },
  });
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

const getCommentByCommentId = async (comment_id) => {
  const commentDoc = await BlogComment.findAll({
    where: { id: comment_id, is_active: true },
  });

  if (!commentDoc) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to  Comment");
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
  await blogDoc.destroy({
    where: {
      blog_id: blogDoc.blog_id,
      user_id: blogDoc.user_d,
      id: reqBody.comment_id,
      is_active: true,
    },
  });
};

module.exports = {
  createBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
  likeAndDislikeBlog,
  createCommenetInBlog,
  getAllCommentsByBlogId,
  getLikesCountAndUserLikeStatus,
  getAllUserLikedPostByBlogId,
  getCommentByUserId,
  updateComment,
  deleteCommentByUser,
  getCommentsByBlogId,
  getCommentByCommentId,
  deleteCommentByAdmin,
  getAllLikesByBlogId,
};