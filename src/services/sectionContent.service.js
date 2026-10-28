const { status: httpStatus } = require("http-status");

const ApiError = require("../utils/ApiError");
const { sanitizeRichText, assertSafeUrl } = require("../utils/sanitizeHtml");
const findByIdOr404 = require("../helpers/findByIdOr404");
const filledIfSent = require("../helpers/filledIfSent");
const SectionContent = require("../models/sectionContent.model");

// A section shows one image or one video. Sent both, it used to keep the video and drop the image without a word.
const sectionFile = (files) => {
  const image = files?.images?.[0];
  const video = files?.videos?.[0];
  if (image && video) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Choose an image or a video, not both.");
  }
  if (image) return { file_uri: "/images", file_type: "Image", file_name: image.filename };
  if (video) return { file_uri: "/videos", file_type: "Video", file_name: video.filename };
  return null;
};

const createSectionContent = async (reqBody, files) => {
  assertSafeUrl(reqBody.redirection_url, "redirection_url");
  const contentObj = {
    section_content: sanitizeRichText(reqBody.section_content),
    redirection_url: reqBody.redirection_url,
    ...sectionFile(files),
  };

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

const findSectionContentById = async (id) => findByIdOr404(SectionContent, id, "Section");

const updateSectionContent = async (reqBody, files) => {
  const contentDoc = await findByIdOr404(SectionContent, reqBody.content_id, "Section");
  const sectionContent = filledIfSent(reqBody, "section_content");
  const redirectionUrl = filledIfSent(reqBody, "redirection_url");
  assertSafeUrl(redirectionUrl, "redirection_url");
  const file = sectionFile(files);

  if (sectionContent !== undefined) {
    contentDoc["section_content"] = sanitizeRichText(sectionContent);
  }
  if (redirectionUrl !== undefined) {
    contentDoc["redirection_url"] = redirectionUrl;
  }
  if (file) {
    contentDoc.set(file);
  }

  await contentDoc.save();

  return contentDoc;
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
