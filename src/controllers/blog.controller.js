const httpStatus = require("http-status");

const catchAsync = require("../utils/catchAsync");
const { blogService } = require("../services");
const pick = require("../utils/pick");
const responseWrapper = require("../config/responseWrapper");

const createBlog = catchAsync(async (req, res) => {
  const body = pick(req.body, ["heading", "description", "categories", "type"]);
  const response = await blogService.createBlog(body, req.files, req.body);
  return responseWrapper(res, response, "", httpStatus.OK);
});

const getAllBlogs = catchAsync(async (req, res) => {
  const blogs = await blogService.getAllBlogs();
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: blogs ? "Successfully Get all Blogs" : "Failed",
    data: blogs,
  });
});

const getBlogById = catchAsync(async (req, res) => {
  const response = await blogService.getBlogById(req.query.id);
  return responseWrapper(res, response, "", httpStatus.OK);
});

const updateBlog = catchAsync(async (req, res) => {
  const body = pick(req.body, [
    "blog_id",
    "heading",
    "description",
    "type",
    "categories",
  ]);
  const response = await blogService.updateBlog(body, req.files);
  return responseWrapper(res, response, "", httpStatus.OK);
});

const deleteBlog = catchAsync(async (req, res) => {
  await blogService.deleteBlog(req.body);
  res.status(httpStatus.OK).send({
    code: httpStatus.NO_CONTENT,
    message: "Delete Successfull.",
    data: "",
  });
});

const likeAndDislikeBlog = catchAsync(async (req, res) => {
  const body = pick(req.body, ["blog_id", "user"]);
  const response = await blogService.likeAndDislikeBlog(body);
  return responseWrapper(res, "", response, httpStatus.OK);
});

const getLikesCountAndUserLikeStatus = catchAsync(async (req, res) => {
  const response = await blogService.getLikesCountAndUserLikeStatus(
    req.body,
    req.query.blog_id
  );
  return responseWrapper(res, response, "", httpStatus.OK);
});

const createCommenetInBlog = catchAsync(async (req, res) => {
  const body = pick(req.body, ["blog_id", "comment", "user"]);
  const response = await blogService.createCommenetInBlog(body);
  return responseWrapper(res, response, "", httpStatus.OK);
});

const getAllCommentsByBlogId = catchAsync(async (req, res) => {
  const response = await blogService.getAllCommentsByBlogId(
    req.body,
    req.query.blog_id
  );
  return responseWrapper(res, response, "", httpStatus.OK);
});

const getAllLikesByBlogId = catchAsync(async (req, res) => {
  const response = await blogService.getAllLikesByBlogId(
    req.query.blog_id
  );
  return responseWrapper(res, response, "", httpStatus.OK);
});

//for Admin
const getCommentsByBlogId = catchAsync(async (req, res) => {
  const response = await blogService.getCommentsByBlogId(req.query.blog_id);
  return responseWrapper(res, response, "", httpStatus.OK);
});

const deleteCommentByAdmin = catchAsync(async (req, res) => {
  await blogService.deleteCommentByAdmin(req.body);
  return responseWrapper(res, "", "Comment Deleted.", httpStatus.OK);
});

module.exports = {
  createBlog,
  getAllBlogs,
  getBlogById,
  updateBlog,
  deleteBlog,
  likeAndDislikeBlog,
  createCommenetInBlog,
  getAllCommentsByBlogId,
  getAllLikesByBlogId,
  getLikesCountAndUserLikeStatus,
  deleteCommentByAdmin,
  getCommentsByBlogId,
};