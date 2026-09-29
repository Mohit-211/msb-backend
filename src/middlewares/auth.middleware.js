const httpStatus = require("http-status");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { Sequelize, QueryTypes, Op } = require("sequelize");
const moment = require("moment");
const randomize = require("randomatic");
const jwt = require("jsonwebtoken");

const sequelize = require("../config/central.db");
const {
  User,
  OTP,
  UserAttachment,
  UserToken,
  Category,
  SubCategory,
} = require("../models");
const validateEmail = require("../helpers/validateEmail");
const validatePassword = require("../helpers/validatePassword");
const tokenTypes = require("../config/tokens");
const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/ApiError");

const { roleService } = require("../services");
const config = require("../config/config");
const Roles = require("../config/roles");
const otpTypes = require("../config/otpType");
const responseWrapper = require("../config/responseWrapper");

const validateRegisterUserBody = catchAsync(async (req, res, next) => {
  const {
    name,
    email,
    mobile,
    password,
    confirm_password,
  } = req.body;

  if (
    !name ||
    !email ||
    !mobile ||
    !password ||
    !confirm_password
  ) {
    return responseWrapper(
      res,
      "",
      "Please Enter Required Fields : [ name || email || mobile ||  password || confirm_password ]",
      httpStatus.BAD_REQUEST
    );
  }

  // if (typeof Number(country_id) !== 'number' || typeof Number(state_id) !== 'number' || typeof Number(city_id) !== 'number') {
  //     return responseWrapper(res, '', 'country_id, state_id, city_id must be a number ', httpStatus.BAD_REQUEST);
  // };

  // if (await User.isUserNameTaken(user_name)) {
  //   return responseWrapper(
  //     res,
  //     "",
  //     "username is already taken",
  //     httpStatus.BAD_REQUEST
  //   );
  // }

  if (!validateEmail(email) || name.length === 0) {
    return responseWrapper(
      res,
      "",
      "Invalid Name or Email",
      httpStatus.BAD_REQUEST
    );
  }

  if (await User.isEmailTaken(email)) {
    return responseWrapper(
      res,
      "",
      "Email already taken",
      httpStatus.BAD_REQUEST
    );
  }

  if (!validatePassword(password)) {
    return responseWrapper(
      res,
      "",
      "Password should have a minimum length of 8 characters and must have at least 2 digits and No Blank Space",
      httpStatus.BAD_REQUEST
    );
  }

  let otpDoc = await OTP.findOne({
    where: {
      email: email,
      type: "email_verification",
      is_verified: true,
    },
    limit: 1,
    order: [["id", "desc"]],
  });
  if (!otpDoc) {
    return responseWrapper(
      res,
      "",
      "OTP is not verified Yet.",
      httpStatus.BAD_REQUEST
    );
  }

  if (password !== confirm_password) {
    return responseWrapper(
      res,
      "",
      "Password and Confirm Password must be equal.",
      httpStatus.BAD_REQUEST
    );
  }
  next();
});

const verifyAuthJWTToken = catchAsync(async (req, res, next) => {
  const token = req.headers["x-access-token"];

  console.log("token------>",token)

  if (!token) {
    return responseWrapper(
      res,
      "",
      "Please authenticate",
      httpStatus.UNAUTHORIZED
    );
  }

  const payload = jwt.verify(token, config.jwt.secret);
  if (!payload) {
    return responseWrapper(res, "", "Invalid Token", httpStatus.UNAUTHORIZED);
  }

  const tokenDoc = await UserToken.findOne({
    where: {
      token: token,
      token_type: tokenTypes.ACCESS,
      user_id: payload.sub,
      is_active: 1,
    },
  });

  if (!tokenDoc) {
    return responseWrapper(res, "", "Token Not Found", httpStatus.BAD_REQUEST);
  }

  const user = await User.findOne({
    where: { id: tokenDoc.user_id, is_active: 1 },
  });
  if (!user) {
    return responseWrapper(res, "", "User Not Found", httpStatus.NOT_FOUND);
  }

  req.body.user = user;
  next();
});

const validateResetPassordBody = catchAsync(async (req, res, next) => {
  const { old_password, new_password, confirm_password } = req.body;

  if (!old_password || !new_password || !confirm_password) {
    return responseWrapper(
      res,
      "",
      "Please Enter Required Fields : [ old_password || new_password || confirm_password ]",
      httpStatus.BAD_REQUEST
    );
  }

  if (new_password !== confirm_password) {
    return responseWrapper(
      res,
      "",
      "New Password and Confirm Password Must Be Equal",
      httpStatus.BAD_REQUEST
    );
  }
  next();
});

const validateNewBlogBody = catchAsync(async (req, res, next) => {
  const { heading, description, categories, type } = req.body;

  if (!heading || !description || !categories || !type) {
    return responseWrapper(
      res,
      "",
      "Please Enter Required Fields : [ heading || description || categories || type ]",
      httpStatus.BAD_REQUEST
    );
  }

  // Validate categories
  const categoryNames = categories
    .split(",")
    .map((categoryName) => categoryName.trim());


  req.body.categories = categoryNames;

  //   const categoryDocs = await Category.findAll({
  //     where: {
  //       category_name: categoryNames,
  //       is_active: true,
  //     },
  //   });

  //   if (categoryDocs.length !== categoryNames.length) {
  //     return responseWrapper(
  //       res,
  //       null,
  //       "Invalid Category Name(s)",
  //       httpStatus.BAD_REQUEST
  //     );
  //   }

  // const categoryDoc = await Category.findOne({where : {id : category_id, is_active : true}});
  // if(!categoryDoc) return responseWrapper(res, '', 'Invalid Category Id', httpStatus.BAD_REQUEST);

  // const subCategoryDoc = await SubCategory.findOne({where : {id : sub_category_id, category_id : category_id, is_active : true}});
  // if(!subCategoryDoc) return responseWrapper(res, '', 'Invalid Sub-Category Id', httpStatus.BAD_REQUEST);

  next();
});

module.exports = {
  validateRegisterUserBody,
  verifyAuthJWTToken,
  validateResetPassordBody,
  validateNewBlogBody,
};