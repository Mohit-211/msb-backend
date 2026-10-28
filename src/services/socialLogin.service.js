const httpStatus = require("http-status");

const { SocialLogins } = require("../models");
const ApiError = require("../utils/ApiError");

const createSocialLogin = async (reqBody) => {
  const contentObj = {
    social_media_name: reqBody.social_media_name,
    redirection_url: reqBody.redirection_url,
  };

  const contentDoc = await SocialLogins.create(contentObj);
  if (!contentDoc) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create new Content"
    );
  }
  return contentDoc ? true : false;
};

const getAllSocialLogin = async () => {
  const contentDoc = await SocialLogins.findAll({
    where: { is_active: true },
  });
  if (!contentDoc) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to get all SocialLogins"
    );
  }
  return contentDoc;
};

const findSocialLoginById = async (id) => {
  const contentDoc = await SocialLogins.findOne({
    where: { id: id },
  });
  return contentDoc ? contentDoc : {};
};

const updateSocialLogin = async (reqBody) => {
  const contentDoc = await SocialLogins.findOne({
    where: {
      id: reqBody.content_id,
    },
  });

  if (!contentDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Content not found");
  }
  if (
    reqBody.social_media_name &&
    reqBody.social_media_name !== "" &&
    typeof reqBody.social_media_name !== "undefined"
  ) {
    contentDoc["social_media_name"] = reqBody.social_media_name;
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

const deleteSocialLogin = async (reqBody) => {
  const contentDoc = await SocialLogins.findOne({
    where: {
      id: reqBody.content_id,
    },
  });
  if (!contentDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "SocialLogins not found");
  }
  await contentDoc.destroy({
    where: { id: reqBody.content_id, is_active: true },
  });
};

module.exports = {
  createSocialLogin,
  getAllSocialLogin,
  findSocialLoginById,
  updateSocialLogin,
  deleteSocialLogin,
};
