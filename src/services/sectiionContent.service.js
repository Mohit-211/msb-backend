const httpStatus = require("http-status");
const slugify = require("slugify");

const { HomePageContent } = require("../models");
const ApiError = require("../utils/ApiError");

const createContent = async (reqBody, files) => {
  const contentObj = {
    order_number: reqBody.order_number,
    title: reqBody.title,
    description: reqBody.description,
    redirection_url: reqBody.redirection_url,
  };

  if (
    files &&
    Object.keys(files).length !== 0 &&
    files.images &&
    files.images.length !== 0
  ) {
    let currImage = files.images[0];
    contentObj["file_uri"] = "/images";
    contentObj["file_name"] = currImage.filename;
  }

  const contentDoc = await HomePageContent.create(contentObj);
  if (!contentDoc) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create new Content"
    );
  }
  return contentDoc ? true : false;
};

const getAllContent = async () => {
  const contentDoc = await HomePageContent.findAll({
    where: { is_active: true },
    order: [['order_number', 'ASC']], 
  });
  if (!contentDoc) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to get all HomePageContent"
    );
  }
  return contentDoc;
};

const findContentById = async (id) => {
  const contentDoc = await HomePageContent.findOne({
    where: { id: id },
  });
  return contentDoc ? contentDoc : {};
};

const updateContent = async (reqBody, files) => {
  const contentDoc = await HomePageContent.findOne({
    where: {
      id: reqBody.content_id,
    },
  });

  if (!contentDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Calculator not found");
  }
  if (
    reqBody.order_number &&
    reqBody.order_number !== "" &&
    typeof reqBody.order_number !== "undefined"
  ) {
    contentDoc["order_number"] = reqBody.order_number;
  }
  if (
    reqBody.title &&
    reqBody.title !== "" &&
    typeof reqBody.title !== "undefined"
  ) {
    contentDoc["title"] = reqBody.title;
  }
  if (
    reqBody.description &&
    reqBody.description !== "" &&
    typeof reqBody.description !== "undefined"
  ) {
    contentDoc["description"] = reqBody.description;
  }
  if (
    reqBody.redirection_url &&
    reqBody.redirection_url !== "" &&
    typeof reqBody.redirection_url !== "undefined"
  ) {
    contentDoc["redirection_url"] = reqBody.redirection_url;
  }

  if (
    files &&
    Object.keys(files).length !== 0 &&
    files.images &&
    files.images.length !== 0
  ) {
    let currImage = files.images[0];
    contentDoc["file_uri"] = "/images";
    contentDoc["file_name"] = currImage.filename;
  }

  await contentDoc.save();

  return contentDoc ? contentDoc : {};
};

const deleteContent = async (reqBody) => {
  const contentDoc = await HomePageContent.findOne({
    where: {
      id: reqBody.content_id,
    },
  });
  if (!contentDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "HomePageContent not found");
  }
  await contentDoc.destroy({
    where: { id: reqBody.content_id, is_active: true },
  });
};

module.exports = {
  createContent,
  getAllContent,
  findContentById,
  updateContent,
  deleteContent,
};
