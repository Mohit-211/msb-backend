const { status: httpStatus } = require("http-status");

const {  BannerContent } = require("../models");
const ApiError = require("../utils/ApiError");
const { sanitizeRichText } = require("../utils/sanitizeHtml");
const findByIdOr404 = require("../helpers/findByIdOr404");
const filledIfSent = require("../helpers/filledIfSent");

const createBannerContent = async (reqBody, files) => {
  const contentObj = {
    banner_content: sanitizeRichText(reqBody.banner_content),
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

  const contentDoc = await BannerContent.create(contentObj);
  if (!contentDoc) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create new Content"
    );
  }
  return contentDoc ? true : false;
};

const getAllBannerContent = async () => {
  const contentDoc = await BannerContent.findAll({
    where: { is_active: true },
  });
  if (!contentDoc) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to get all BannerContent"
    );
  }
  return contentDoc;
};

const findBannerContentById = async (id) => findByIdOr404(BannerContent, id, "Banner");

const updateBannerContent = async (reqBody, files) => {
  const contentDoc = await findByIdOr404(BannerContent, reqBody.content_id, "Banner");
  const bannerContent = filledIfSent(reqBody, "banner_content");
  if (bannerContent !== undefined) {
    contentDoc["banner_content"] = sanitizeRichText(bannerContent);
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

  await contentDoc.save();

  return contentDoc;
};

const deleteBannerContent = async (reqBody) => {
  const contentDoc = await BannerContent.findOne({
    where: {
      id: reqBody.content_id,
    },
  });
  if (!contentDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "BannerContent not found");
  }
  await contentDoc.destroy({
    where: { id: reqBody.content_id, is_active: true },
  });
};

module.exports = {
  createBannerContent,
  getAllBannerContent,
  findBannerContentById,
  updateBannerContent,
  deleteBannerContent,
};
