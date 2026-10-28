const { status: httpStatus } = require("http-status");

const { CardContent } = require("../models");
const ApiError = require("../utils/ApiError");
const { sanitizeRichText, assertSafeUrl } = require("../utils/sanitizeHtml");
const findByIdOr404 = require("../helpers/findByIdOr404");
const filledIfSent = require("../helpers/filledIfSent");

const createCardContent = async (reqBody) => {
  assertSafeUrl(reqBody.redirection_url, "redirection_url");
  const contentObj = {
    card_content: sanitizeRichText(reqBody.card_content),
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

const findCardContentById = async (id) => findByIdOr404(CardContent, id, "Card");

const updateCardContent = async (reqBody) => {
  const contentDoc = await findByIdOr404(CardContent, reqBody.content_id, "Card");
  const cardContent = filledIfSent(reqBody, "card_content");
  const redirectionUrl = filledIfSent(reqBody, "redirection_url");
  assertSafeUrl(redirectionUrl, "redirection_url");
  if (cardContent !== undefined) {
    contentDoc["card_content"] = sanitizeRichText(cardContent);
  }
  if (redirectionUrl !== undefined) {
    contentDoc["redirection_url"] = redirectionUrl;
  }
  await contentDoc.save();

  return contentDoc;
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
