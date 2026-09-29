const httpStatus = require("http-status");

const catchAsync = require("../utils/catchAsync");
const { cardContentService } = require("../services");
const responseWrapper = require("../config/responseWrapper");

const createCardContent = catchAsync(async (req, res) => {
  await cardContentService.createCardContent(req.body);
  return responseWrapper(
    res,
    "",
    "New Content Created Successfully.",
    httpStatus.OK
  );
});

const getAllCardContent = catchAsync(async (req, res) => {
  const contentDocs = await cardContentService.getAllCardContent();
  return responseWrapper(res, contentDocs, "");
});

const findCardContentById = catchAsync(async (req, res) => {
  const contentDoc = await cardContentService.findCardContentById(
    req.query.id
  );
  return responseWrapper(res, contentDoc, "");
});

const updateCardContent = catchAsync(async (req, res) => {
  const contentDoc = await cardContentService.updateCardContent(
    req.body
  );
  return responseWrapper(res, contentDoc, "Content Updated Successfully.");
});

const deleteCardContent = catchAsync(async (req, res) => {
  await cardContentService.deleteCardContent(req.body);
  return responseWrapper(res, "", "Deleted Successfull.");
});

module.exports = {
  createCardContent,
  getAllCardContent,
  findCardContentById,
  updateCardContent,
  deleteCardContent,
};
