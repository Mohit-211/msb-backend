const httpStatus = require("http-status");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { Sequelize, QueryTypes, Op } = require("sequelize");
const moment = require("moment");
const randomize = require("randomatic");
const jwt = require("jsonwebtoken");

const sequelize = require("../config/central.db");
const { Admin, Role, Department } = require("../models");
const validateEmail = require("../helpers/validateEmail");
const validatePassword = require("../helpers/validatePassword");
const tokenTypes = require("../config/tokens");
const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/ApiError");

const { roleService } = require("../services");
const config = require("../config/config");
const Roles = require("../config/roles");

const validateCreateAdminBody = catchAsync(async (req, res, next) => {
  const { name, email, role_id } = req.body;

  if (!name || !email || !role_id) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "|=> Please Enter Required Fields : [name || email_id || role_id ] <=|"
    );
  }

  if (!validateEmail(email) || name.length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "|=> Invalid Name or Email <=|");
  }

  if (await Admin.isEmailTaken(email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "|=> Email already taken <=|");
  }

  const isValidRoleId = await roleService.findRoleById(parseInt(role_id));
  if (!isValidRoleId)
    throw new ApiError(httpStatus.BAD_REQUEST, "|=> Invalid Role Id <=|");

  // const isValidDepartmentId = await Department.findByPk(parseInt(department_id));
  // if(!isValidDepartmentId) throw new ApiError(httpStatus.BAD_REQUEST, '|=> Invalid Department Id <=|');
  next();
});

const validateLoginAdminBody = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "|=> Please Enter Required Fields : [ email_id || password ] <=|"
    );
  }

  if (!validateEmail(email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "|=> Invalid Email <=|");
  }
  next();
});

const validateJWTtoken = catchAsync(async (req, res, next) => {
  const token = req.header("x-access-token");
  if (!token) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "|=> Access denied: No token provided <=|"
    );
  }

  try {
    req.user = jwt.verify(token, Buffer.from(config?.jwt?.secret, "hex"), {
      algorithm: "HS256",
    });
    if (req?.user?.is_backlisted)
      return res.status(httpStatus.UNAUTHORIZED).send({
        status: httpStatus.UNAUTHORIZED,
        data: "|=> Invalid Token <=|",
      });
    req.body["user"] = req.user;
    next();
  } catch (err) {
    return res
      .status(httpStatus.UNAUTHORIZED)
      .send({ status: httpStatus.UNAUTHORIZED, data: "|=> Invalid Token <=|" });
  }
});

const validateResetPassordBody = catchAsync(async (req, res, next) => {
  const { old_password, new_password, confirm_password } = req.body;

  if (!old_password || !new_password || !confirm_password) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "|=> Please Enter Required Fields : [ old_password || new_password || confirm_password ] <=|"
    );
  }

  if (new_password !== confirm_password) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "|=> New Password and Confirm Password Must Be Equal <=|"
    );
  }
  next();
});

module.exports = {
  validateCreateAdminBody,
  validateLoginAdminBody,
  validateJWTtoken,
  validateResetPassordBody,
};
