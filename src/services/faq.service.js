const httpStatus = require("http-status");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { Sequelize, QueryTypes, Op } = require("sequelize");
const moment = require("moment");
const randomize = require("randomatic");

const sequelize = require("../config/central.db");
const { Faq } = require("../models");
const validateEmail = require("../helpers/validateEmail");
const validatePassword = require("../helpers/validatePassword");
const tokenTypes = require("../config/tokens");
const ApiError = require("../utils/ApiError");

const createFaq = async (reqBody) => {
  const faqObj = {
    question: reqBody.question,
    answer: reqBody.answer,
  };
  const faqDoc = await Faq.create(faqObj);
  if (!faqDoc) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "|=> Failed to create FAQ <=|"
    );
  }
  return faqDoc ? true : false;
};

const findFaqById = async (id) => {
  const faqDoc = await Faq.findByPk(id);
  return faqDoc ? faqDoc : [];
};

const getAllFaq = async () => {
  const faqDoc = await Faq.findAll({
    attributes: ["id", "question", "answer"],
    where: { is_active: true },
  });
  if (!faqDoc) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to get all FAQ"
    );
  }
  return faqDoc;
};

const updateFaq = async (reqBody, id) => {
  const faqDoc = await Faq.findByPk(id);

  if (!faqDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Faq not found");
  }
  if (
    reqBody.question &&
    typeof reqBody.question !== "undefined" &&
    reqBody.question !== ""
  ) {
    faqDoc["question"] = reqBody.question;
  }
  if (
    reqBody.answer &&
    typeof reqBody.answer !== "undefined" &&
    reqBody.answer !== ""
  ) {
    faqDoc["answer"] = reqBody.answer;
  }

  await faqDoc.save();
  return faqDoc ? faqDoc : {};
};

const deleteFaq = async (id) => {
  const faq = await Faq.findByPk(id);
  if (!faq) {
    throw new ApiError(httpStatus.NOT_FOUND, "faq  not found");
  }
  await faq.destroy();
};

module.exports = {
  createFaq,
  getAllFaq,
  findFaqById,
  updateFaq,
  deleteFaq
};
