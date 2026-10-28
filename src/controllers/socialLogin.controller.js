const { status: httpStatus } = require("http-status");

const { socialLoginService } = require("../services");
const responseWrapper = require("../config/responseWrapper");

const createSocialLogin = async (req, res) => {
  await socialLoginService.createSocialLogin(req.body);
  return responseWrapper(
    res,
    "",
    "New Content Created Successfully.",
    httpStatus.OK
  );
};

const getAllSocialLogin = async (req, res) => {
  const contentDocs = await socialLoginService.getAllSocialLogin();
  return responseWrapper(res, contentDocs, "");
};

const findSocialLoginById = async (req, res) => {
  const contentDoc = await socialLoginService.findSocialLoginById(req.query.id);
  return responseWrapper(res, contentDoc, "");
};

const updateSocialLogin = async (req, res) => {
  const contentDoc = await socialLoginService.updateSocialLogin(
    req.body
  );
  return responseWrapper(res, contentDoc, "Content Updated Successfully.");
};

const deleteSocialLogin = async (req, res) => {
  await socialLoginService.deleteSocialLogin(req.body);
  return responseWrapper(res, "", "Deleted Successfull.");
};

module.exports = {
  createSocialLogin,
  getAllSocialLogin,
  findSocialLoginById,
  updateSocialLogin,
  deleteSocialLogin,
};
