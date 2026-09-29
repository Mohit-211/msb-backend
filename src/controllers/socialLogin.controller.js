const httpStatus = require("http-status");

const catchAsync = require("../utils/catchAsync");
const { socialLoginService } = require("../services");
const responseWrapper = require("../config/responseWrapper");

const createSocialLogin = catchAsync(async (req, res) => {
  await socialLoginService.createSocialLogin(req.body);
  return responseWrapper(
    res,
    "",
    "New Content Created Successfully.",
    httpStatus.OK
  );
});

const getAllSocialLogin = catchAsync(async (req, res) => {
  const contentDocs = await socialLoginService.getAllSocialLogin();
  return responseWrapper(res, contentDocs, "");
});

const findSocialLoginById = catchAsync(async (req, res) => {
  const contentDoc = await socialLoginService.findSocialLoginById(req.query.id);
  return responseWrapper(res, contentDoc, "");
});

const updateSocialLogin = catchAsync(async (req, res) => {
  const contentDoc = await socialLoginService.updateSocialLogin(
    req.body
  );
  return responseWrapper(res, contentDoc, "Content Updated Successfully.");
});

const deleteSocialLogin = catchAsync(async (req, res) => {
  await socialLoginService.deleteSocialLogin(req.body);
  return responseWrapper(res, "", "Deleted Successfull.");
});

module.exports = {
  createSocialLogin,
  getAllSocialLogin,
  findSocialLoginById,
  updateSocialLogin,
  deleteSocialLogin,
};
