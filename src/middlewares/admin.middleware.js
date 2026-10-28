const { status: httpStatus } = require("http-status");
const jwt = require("jsonwebtoken");

const { Admin } = require("../models");
const validateEmail = require("../helpers/validateEmail");
const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/ApiError");

const { roleService } = require("../services");
const config = require("../config/config");

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

  let payload;
  try {
    payload = jwt.verify(token, config.jwt.adminSecret, { algorithms: ["HS256"] });
  } catch (err) {
    payload = null;
  }

  // Load the admin on every request, so deleted or deactivated admins lose access at once
  // and role changes apply immediately instead of when the token expires.
  const admin = payload?.id
    ? await Admin.findOne({ where: { id: payload.id, is_active: true } })
    : null;
  if (!admin) {
    return res
      .status(httpStatus.UNAUTHORIZED)
      .send({ status: httpStatus.UNAUTHORIZED, data: "|=> Invalid Token <=|" });
  }

  req.user = admin;
  req.body.user = admin;
  next();
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
