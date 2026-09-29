const httpStatus = require("http-status");

const catchAsync = require("../utils/catchAsync");
const { sectionContentService } = require("../services");
const responseWrapper = require("../config/responseWrapper");

const createSectionContent = catchAsync(async (req, res) => {
  await sectionContentService.createSectionContent(req.body, req.files);
  return responseWrapper(
    res,
    "",
    "New Content Created Successfully.",
    httpStatus.OK
  );
});

const getAllSectionContent = catchAsync(async (req, res) => {
  const contentDocs = await sectionContentService.getAllSectionContent();
  return responseWrapper(res, contentDocs, "");
});

const findSectionContentById = catchAsync(async (req, res) => {
  const contentDoc = await sectionContentService.findSectionContentById(
    req.query.id
  );
  return responseWrapper(res, contentDoc, "");
});

const updateSectionContent = catchAsync(async (req, res) => {
  const contentDoc = await sectionContentService.updateSectionContent(
    req.body,
    req.files
  );
  return responseWrapper(res, contentDoc, "Content Updated Successfully.");
});

const deleteSectionContent = catchAsync(async (req, res) => {
  await sectionContentService.deleteSectionContent(req.body);
  return responseWrapper(res, "", "Deleted Successfull.");
});

module.exports = {
  createSectionContent,
  getAllSectionContent,
  findSectionContentById,
  updateSectionContent,
  deleteSectionContent,
};
