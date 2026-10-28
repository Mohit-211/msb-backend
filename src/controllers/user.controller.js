const { status: httpStatus } = require("http-status");


const { userService } = require("../services");
const config = require("../config/config");
const ApiError = require("../utils/ApiError");
const pageOf = require("../helpers/pageOf");
const pick = require("../utils/pick");
const responseWrapper = require("../config/responseWrapper");

const getProfile = async (req, res) => {
  const response = await userService.getProfile(req.body);
  return responseWrapper(res, response, "Successfully get profile");
};

const updateUserProfile = async (req, res) => {
  const body = pick(req.body, ["name", "mobile", "user"]);
  const response = await userService.updateUserProfile(body, req.files);
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: response ? "Profile Updated Successfully" : "Failed",
    data: response,
  });
};

const getBlogById = async (req, res) => {
  const response = await userService.getBlogById(req.params.blog_id, req.body.user);
  return responseWrapper(res, response, "", httpStatus.OK);
};

const getBlogFromCategory = async (req, res) => {
  const body = pick(req.body, ["category_slug"]);
  const query = {
    sortBy: req.query.sortBy === "DESC" ? "DESC" : "ASC",
    ...pageOf(req.query, config.defaultLimit),
  };
  const response = await userService.getBlogFromCategory(body, query, req.body.user);
  return responseWrapper(res, response, "Success", httpStatus.OK);
};

const searchBlogByCategoryNameOrBlogHeadings = async (req, res) => {
  const query = { query: req.query.query, ...pageOf(req.query, 15) };
  const response = await userService.searchBlogByCategoryNameOrBlogHeadings(
    query,
    req.body.user
  );
  return responseWrapper(res, response, "Success", httpStatus.OK);
};

const markBlogAsViewed = async (req, res) => {
  const blog = await userService.markBlogAsViewed(req.body,req.query.blog_id);

  if (!blog) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Unable to Mark as viewd"
    );
  }

  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    data: blog,
    message: "Succssfully marked as viewed",
  });
};

module.exports = {
  updateUserProfile,
  getProfile,
  getBlogById,
  getBlogFromCategory,
  searchBlogByCategoryNameOrBlogHeadings,
  markBlogAsViewed
};
