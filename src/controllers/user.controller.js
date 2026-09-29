const httpStatus = require("http-status");

const catchAsync = require("../utils/catchAsync");

const { userService } = require("../services");
const pick = require("../utils/pick");
const responseWrapper = require("../config/responseWrapper");

const getProfile = catchAsync(async (req, res) => {
  const response = await userService.getProfile(req.body);
  return responseWrapper(res, response, "Successfully get profile");
});

const updateUserProfile = catchAsync(async (req, res) => {
  const body = pick(req.body, ["name", "mobile", "user"]);
  const response = await userService.updateUserProfile(body, req.files);
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: response ? "Profile Updated Successfully" : "Failed",
    data: response,
  });
});

const deactivateAccount = catchAsync(async (req, res) => {
  const response = await userService.deactivateAccount(req.body);
  return responseWrapper(res, response, "Account Successfully Deactivated.");
});

const searchUserByNameOrUsername = catchAsync(async (req, res) => {
  const body = pick(req.body, ["name", "user"]);
  const query = pick(req.query, ["sortBy", "limit", "page"]);
  const params = pick(req.params, []);

  if (!query["limit"]) {
    query["limit"] = config.defaultLimit;
  }
  if (!query["page"]) {
    query["page"] = 1;
  }
  if (!query["sortBy"] || query["sortBy"] === "") {
    query["sortBy"] = "ASC";
  }
  let offset = (query["page"] - 1) * query["limit"];
  query["offset"] = offset;
  const response = await userService.searchUserByNameOrUsername(
    body,
    query,
    params
  );
  return responseWrapper(res, response, "");
});

const notificationToogle = catchAsync(async (req, res) => {
  const body = pick(req.body, ["user"]);
  const response = await userService.notificationToogle(body);
  message =
    response.notification === true
      ? "Notification turned On!"
      : "Notification turned Off!";
  return responseWrapper(res, "", message);
});

const getBlogById = catchAsync(async (req, res) => {
  const response = await userService.getBlogById(req.params.blog_id, req.body);
  return responseWrapper(res, response, "", httpStatus.OK);
});

const searchBlog = catchAsync(async (req, res) => {
  const response = await userService.searchBlog(
    req.body.title,
    req.body.slug,
    req.body.heading
  );
  return responseWrapper(res, response, "Success", httpStatus.OK);
});

const getBlogFromCategory = catchAsync(async (req, res) => {
  const body = pick(req.body, ["category_slug"]);
  const query = pick(req.query, ["sortBy", "limit", "page"]);
  const params = pick(req.params, []);

  if (!query["limit"]) {
    query["limit"] = config.defaultLimit;
  }
  if (!query["page"]) {
    query["page"] = 1;
  }
  if (!query["sortBy"] || query["sortBy"] === "") {
    query["sortBy"] = "ASC";
  }
  let offset = (query["page"] - 1) * query["limit"];
  query["offset"] = offset;
  const response = await userService.getBlogFromCategory(body, query, params);
  return responseWrapper(res, response, "Success", httpStatus.OK);
});

const searchBlogByCategoryNameOrBlogHeadings = catchAsync(async (req, res) => {
  const query = pick(req.query, ["sortBy", "limit", "page", "query"]);
  if (!query["limit"]) {
    query["limit"] = 15;
  }
  if (!query["page"]) {
    query["page"] = 1;
  }
  if (!query["sortBy"] || query["sortBy"] === "") {
    query["sortBy"] = "ASC";
  }
  let offset = (query["page"] - 1) * query["limit"];
  query["offset"] = offset;
  const response = await userService.searchBlogByCategoryNameOrBlogHeadings(
    query
  );
  return responseWrapper(res, response, "Success", httpStatus.OK);
});

const markBlogAsViewed = catchAsync(async (req, res) => {
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
});

module.exports = {
  updateUserProfile,
  getProfile,
  deactivateAccount,
  searchUserByNameOrUsername,
  notificationToogle,
  getBlogById,
  searchBlog,
  getBlogFromCategory,
  searchBlogByCategoryNameOrBlogHeadings,
  markBlogAsViewed
};