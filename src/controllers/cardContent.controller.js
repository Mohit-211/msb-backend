const { status: httpStatus } = require("http-status");

const { cardContentService } = require("../services");
const responseWrapper = require("../config/responseWrapper");

const createCardContent = async (req, res) => {
  await cardContentService.createCardContent(req.body);
  return responseWrapper(
    res,
    "",
    "New Content Created Successfully.",
    httpStatus.OK
  );
};

const getAllCardContent = async (req, res) => {
  const contentDocs = await cardContentService.getAllCardContent();
  return responseWrapper(res, contentDocs, "");
};

const findCardContentById = async (req, res) => {
  const contentDoc = await cardContentService.findCardContentById(
    req.query.id
  );
  return responseWrapper(res, contentDoc, "");
};

const updateCardContent = async (req, res) => {
  const contentDoc = await cardContentService.updateCardContent(
    req.body
  );
  return responseWrapper(res, contentDoc, "Content Updated Successfully.");
};

const deleteCardContent = async (req, res) => {
  await cardContentService.deleteCardContent(req.body);
  return responseWrapper(res, "", "Deleted Successfull.");
};

module.exports = {
  createCardContent,
  getAllCardContent,
  findCardContentById,
  updateCardContent,
  deleteCardContent,
};
