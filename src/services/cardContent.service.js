const httpStatus = require("http-status");

const { CardContent } = require("../models");
const ApiError = require("../utils/ApiError");

const createCardContent = async (reqBody) => {
  const contentObj = {
    card_content: reqBody.card_content,
    redirection_url: reqBody.redirection_url,
  };

  const contentDoc = await CardContent.create(contentObj);
  if (!contentDoc) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create new Content"
    );
  }
  return contentDoc ? true : false;
};

const getAllCardContent = async () => {
  const contentDoc = await CardContent.findAll({
    where: { is_active: true },
  });
  if (!contentDoc) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to get all CardContent"
    );
  }
  return contentDoc;
};

const findCardContentById = async (id) => {
  const contentDoc = await CardContent.findOne({
    where: { id: id },
  });
  return contentDoc ? contentDoc : {};
};

const updateCardContent = async (reqBody) => {
  const contentDoc = await CardContent.findOne({
    where: {
      id: reqBody.content_id,
    },
  });

  if (!contentDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Content not found");
  }
  if (
    reqBody.card_content &&
    reqBody.card_content !== "" &&
    typeof reqBody.card_content !== "undefined"
  ) {
    contentDoc["card_content"] = reqBody.card_content;
  }
  if (
    reqBody.redirection_url &&
    reqBody.redirection_url !== "" &&
    typeof reqBody.redirection_url !== "undefined"
  ) {
    contentDoc["redirection_url"] = reqBody.redirection_url;
  }
  await contentDoc.save();

  return contentDoc ? contentDoc : {};
};

const deleteCardContent = async (reqBody) => {
  const contentDoc = await CardContent.findOne({
    where: {
      id: reqBody.content_id,
    },
  });
  if (!contentDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "CardContent not found");
  }
  await contentDoc.destroy({
    where: { id: reqBody.content_id, is_active: true },
  });
};

module.exports = {
  createCardContent,
  getAllCardContent,
  findCardContentById,
  updateCardContent,
  deleteCardContent,
};
