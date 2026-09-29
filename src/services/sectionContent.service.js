const httpStatus = require("http-status");
const slugify = require("slugify");

const ApiError = require("../utils/ApiError");
const SectionContent = require("../models/sectionContent.model");

const createSectionContent = async (reqBody, files) => {
  const contentObj = {
    section_content: reqBody.section_content,
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
    contentObj["file_type"] = "Image";
    contentObj["file_name"] = currImage.filename;
  }

  if (
    files &&
    Object.keys(files).length !== 0 &&
    files.videos &&
    files.videos.length !== 0
  ) {
    let currImage = files.videos[0];
    contentObj["file_uri"] = "/videos";
    contentObj["file_type"] = "Video";
    contentObj["file_name"] = currImage.filename;
  }

  const contentDoc = await SectionContent.create(contentObj);
  if (!contentDoc) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create new Content"
    );
  }
  return contentDoc ? true : false;
};

const getAllSectionContent = async () => {
  const contentDoc = await SectionContent.findAll({
    where: { is_active: true },
  });
  if (!contentDoc) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to get all HomePageContent"
    );
  }
  return contentDoc;
};

const findSectionContentById = async (id) => {
  const contentDoc = await SectionContent.findOne({
    where: { id: id },
  });
  return contentDoc ? contentDoc : {};
};

const updateSectionContent = async (reqBody, files) => {
  const contentDoc = await SectionContent.findOne({
    where: {
      id: reqBody.content_id,
    },
  });

  if (!contentDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Content not found");
  }
  if (
    reqBody.section_content &&
    reqBody.section_content !== "" &&
    typeof reqBody.section_content !== "undefined"
  ) {
    contentDoc["section_content"] = reqBody.section_content;
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
    contentDoc["file_type"] = "Image";
    contentDoc["file_name"] = currImage.filename;
  }

  if (
    files &&
    Object.keys(files).length !== 0 &&
    files.videos &&
    files.videos.length !== 0
  ) {
    let currImage = files.videos[0];
    contentDoc["file_uri"] = "/videos";
    contentDoc["file_type"] = "Video";
    contentDoc["file_name"] = currImage.filename;
  }

  await contentDoc.save();

  return contentDoc ? contentDoc : {};
};

const deleteSectionContent = async (reqBody) => {
  const contentDoc = await SectionContent.findOne({
    where: {
      id: reqBody.content_id,
    },
  });
  if (!contentDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Content not found");
  }
  await contentDoc.destroy({
    where: { id: reqBody.content_id, is_active: true },
  });
};

module.exports = {
  createSectionContent,
  getAllSectionContent,
  findSectionContentById,
  updateSectionContent,
  deleteSectionContent,
};
