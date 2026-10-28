const { status: httpStatus } = require("http-status");

const { bannerContentService } = require("../services");
const responseWrapper = require("../config/responseWrapper");

const createBannerContent = async (req, res) => {
  await bannerContentService.createBannerContent(req.body, req.files);
  return responseWrapper(
    res,
    "",
    "New Content Created Successfully.",
    httpStatus.OK
  );
};

const getAllBannerContent = async (req, res) => {
  const contentDocs = await bannerContentService.getAllBannerContent();
  return responseWrapper(res, contentDocs, "");
};

const findBannerContentById = async (req, res) => {
  const contentDoc = await bannerContentService.findBannerContentById(
    req.query.id
  );
  return responseWrapper(res, contentDoc, "");
};

const updateBannerContent = async (req, res) => {
  const contentDoc = await bannerContentService.updateBannerContent(
    req.body,
    req.files
  );
  return responseWrapper(res, contentDoc, "Content Updated Successfully.");
};

const deleteBannerContent = async (req, res) => {
  await bannerContentService.deleteBannerContent(req.body);
  return responseWrapper(res, "", "Deleted Successfull.");
};

module.exports = {
  createBannerContent,
  getAllBannerContent,
  findBannerContentById,
  updateBannerContent,
  deleteBannerContent,
};
