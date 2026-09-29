const httpStatus = require("http-status");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { Sequelize, QueryTypes, Op } = require("sequelize");
const moment = require("moment");

const sequelize = require("../config/central.db");
const { Admin, Role } = require("../models");
const validateEmail = require("../helpers/validateEmail");
const validatePassword = require("../helpers/validatePassword");
const tokenTypes = require("../config/tokens");
const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/ApiError");
const { roleService, authService } = require("../services");
const pick = require("../utils/pick");
const responseWrapper = require("../config/responseWrapper");

// const sendOTP = catchAsync(async (req, res) => {
//   const body = pick(req.body, ["email", "type"]);
//   await authService.sendOTP(body);
//   return responseWrapper(res, "", "OTP has been Sent To Your Email");
// });

const sendOTP = catchAsync(async (req, res, next) => {
  const { email, type } = pick(req.body, ["email", "type"]);

  try {
    // Call the service function
    await authService.sendOTP({ email, type });

    // Respond with success
    return responseWrapper(res, "", "OTP has been Sent To Your Email");
  } catch (error) {
    // Handle errors
    console.error("Error in sendOTP:", error);

    if (error instanceof ApiError) {
      // If it's an ApiError, send the error response
      return responseWrapper(res, error.code, error.message, error.statusCode);
    } else {
      // If it's not an ApiError, log the error and send a generic error response
      console.error(error);
      return responseWrapper(
        res,
        "INTERNAL_SERVER_ERROR",
        "Internal Server Error",
        httpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
});

const verifyOTP = catchAsync(async (req, res) => {
  const status = await authService.verifyOTP(
    req.body.email,
    req.body.otp,
    req.body.type
  );
  if (!status) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Ineternal Server Error"
    );
  }
  return responseWrapper(
    res,
    "",
    "OTP has been verified. Please Create Your Profile.",
    httpStatus.OK
  );
});

const register = catchAsync(async (req, res) => {
  const body = pick(req.body, [
    "name",
    "email",
    "mobile",
    "password",
    "confirm_password",
  ]);
  await authService.register(body, req.files);
  return responseWrapper(
    res,
    "",
    "User Created Successfully. Please Continue Your Journey.",
    httpStatus.OK
  );
});

const login = catchAsync(async (req, res) => {
  try {
    const response = await authService.login(req.body);
    return responseWrapper(res, response, "Successfully Logged in.");
  } catch (error) {
    let statusCode = httpStatus.INTERNAL_SERVER_ERROR;
    let message = "Internal Server Error";

    if (error instanceof ApiError) {
      // If the error is an instance of ApiError, customize status code and message
      statusCode = error.statusCode;
      message = error.message;
    }

    // Handle specific error cases
    if (error.message === "Email does not exist.") {
      statusCode = httpStatus.BAD_REQUEST;
    } else if (error.message === "Invalid Password. Please try again.") {
      statusCode = httpStatus.UNAUTHORIZED;
    }

    return responseWrapper(res, null, message, statusCode);
  }
});

// const resetPassword = catchAsync(async (req, res) => {
//   const { new_password, confirm_password } = req.body;

//   if (!validatePassword(new_password)) {
//     return responseWrapper(
//       res,
//       "",
//       "Password should have a minimum length of 8 characters and must have at least 2 digits and No Blank Space",
//       httpStatus.BAD_REQUEST
//     );
//   }

//   if (new_password !== confirm_password) {
//     return responseWrapper(
//       res,
//       "",
//       "Password and Confirm Password must be equal",
//       httpStatus.BAD_REQUEST
//     );
//   }

//   const response = await authService.resetPassword(req.body);
//   return responseWrapper(res, response, "Password changed Successfully.");
// });

const resetPassword = catchAsync(async (req, res) => {
  const { old_password, new_password, confirm_password } = req.body;

  if (!validatePassword(new_password)) {
    return responseWrapper(
      res,
      "",
      "Password should have a minimum length of 8 characters and must have at least 2 digits and No Blank Space",
      httpStatus.BAD_REQUEST
    );
  }

  if (new_password !== confirm_password) {
    return responseWrapper(
      res,
      "",
      "Password and Confirm Password must be equal",
      httpStatus.BAD_REQUEST
    );
  }

  try {
    const response = await authService.resetPassword(req.body);
    return responseWrapper(res, response, "Password changed Successfully.");
  } catch (error) {
    if (error instanceof ApiError) {
      return responseWrapper(res, "", error.message, error.statusCode);
    } else {
      // Handle other unexpected errors
      console.error(error);
      return responseWrapper(
        res,
        "",
        "Incorrect Old Password",
        httpStatus.BAD_REQUEST
      );
    }
  }
});

const forgotPassword = catchAsync(async (req, res) => {
  let status = await authService.forgotPassword(
    req.body.email,
    req.body.otp,
    req.body.password,
    req.body.confirm_Password
  );
  if (!status) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed To Reset Password"
    );
  }
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: "Your Password Changed Successfully, Please login to continue",
  });
});

const logout = catchAsync(async (req, res) => {
  const response = await authService.logout(req.body,req.headers);
  return responseWrapper(res, response, "Successfully Logged out.");
});

// const checkTokenStatus = catchAsync(async (req, res) => {
//   const response = await authService.checkTokenStatus(req);
//   return responseWrapper(res, response,"Token is Active");
// });

const checkTokenStatus = catchAsync(async (req, res) => {
  const response = await authService.checkTokenStatus(req.body);
  return responseWrapper(res, response,"Token Status");
});

module.exports = {
  register,
  login,
  resetPassword,
  sendOTP,
  verifyOTP,
  forgotPassword,
  logout,
  checkTokenStatus,
};