const { status: httpStatus } = require("http-status");

const { SocialLogins } = require("../models");
const ApiError = require("../utils/ApiError");
const findByIdOr404 = require("../helpers/findByIdOr404");
const filledIfSent = require("../helpers/filledIfSent");

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

const findSocialLoginById = async (id) => findByIdOr404(SocialLogins, id, "Social link");

const updateSocialLogin = async (reqBody) => {
  const contentDoc = await findByIdOr404(SocialLogins, reqBody.content_id, "Social link");
  const socialMediaName = filledIfSent(reqBody, "social_media_name");
  const redirectionUrl = filledIfSent(reqBody, "redirection_url");
  if (socialMediaName !== undefined) {
    contentDoc["social_media_name"] = socialMediaName;
  }
  if (redirectionUrl !== undefined) {
    contentDoc["redirection_url"] = redirectionUrl;
  }

  await contentDoc.save();

  return contentDoc;
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
