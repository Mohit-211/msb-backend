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
const { adminService } = require("../services");
const pick = require("../utils/pick");
const responseWrapper = require("../config/responseWrapper");

// const createAdminUser = catchAsync(async (req, res) => {
//   const user = await adminService.createAdminUser(req.body);
//   res.status(httpStatus.CREATED).send({
//     code: httpStatus.CREATED,
//     data: { message: "|=> User Created Successfully <=|" },
//   });
// });

const createAdminUser = catchAsync(async (req, res) => {
  const user = await adminService.createAdminUser(req.body);

  if (!user) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Admin not found");
  }

  res.status(httpStatus.OK).send({ code: httpStatus.OK, data: user });
});

const getProfile = catchAsync(async (req, res) => {
  const response = await adminService.getProfile(req.body);
  return responseWrapper(res, response, "Successfully get profile");
});

const loginAdminUser = catchAsync(async (req, res) => {
  try {
    const response = await adminService.loginAdminUser(req.body);
    res
      .header("x-access-token", response?.token)
      .send({ code: httpStatus.OK, data: response });
  } catch (error) {
    // Check if the error is an instance of your custom ApiError class
    if (error instanceof ApiError) {
      res.status(error.statusCode).send({
        code: error.statusCode,
        message: error.message.replace(/\|=>|<=\|/g, ''), 
      });
    } else {
      // Handle other unexpected errors
      console.error(error);
      res.status(httpStatus.INTERNAL_SERVER_ERROR).send({
        code: httpStatus.INTERNAL_SERVER_ERROR,
        message: "Internal Server Error",
      });
    }
  }
});

const resetAdminPassword = catchAsync(async (req, res) => {
  const response = await adminService.resetAdminPassword(req.body);
  res.status(httpStatus.OK).send({ code: httpStatus.OK, data: response });
});

const sendOTP = catchAsync(async (req, res) => {
  await adminService.sendOTP(req.body.email);
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: "|=> OTP has been Sent To Your Email <=|",
  });
});

const verifyOTP = catchAsync(async (req, res) => {
  const status = await adminService.verifyOTP(req.body.email, req.body.otp);
  if (!status) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "|=>  Ineternal Server Error <=|"
    );
  }
  res
    .status(httpStatus.OK)
    .send({ code: httpStatus.OK, message: "|=> OTP has been verified <=|" });
});

const forgotAdminPassword = catchAsync(async (req, res) => {
  const response = await adminService.forgotAdminPassword(req.body);
  res.status(httpStatus.OK).send({ code: httpStatus.OK, data: response });
});

const findAdminById = catchAsync(async (req, res) => {
  const adminDoc = await adminService.findAdminById(req.query.id);
  return responseWrapper(res, adminDoc, "", httpStatus.OK);
});

const updateAdmin = catchAsync(async (req, res) => {
  const response = await adminService.updateAdmin(req.body);
  return responseWrapper(res, response, "Admin Updated Successfully");
});

const deleteAdmin = catchAsync(async (req, res) => {
  await adminService.deleteAdmin(req.body);
  res.status(httpStatus.OK).send({
    code: httpStatus.NO_CONTENT,
    message: "Deleted Successfull.",
    data: "",
  });
});

const getAllAdmins = catchAsync(async (req, res) => {
  const users = await adminService.getAllAdmins();
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: users ? "Success" : "Failed",
    data: users,
  });
});

//=======================================USER APIS=========================================

const getAllUsers = catchAsync(async (req, res) => {
  const users = await adminService.getAllUsers();
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: users ? "Success" : "Failed",
    data: users,
  });
});

const getUserById = catchAsync(async (req, res) => {
  const response = await adminService.getUserById(req.query.id);
  return responseWrapper(res, response, "Successfully Get user", httpStatus.OK);
});

const deleteUser = catchAsync(async (req, res) => {
  await adminService.deleteUser(req.body);
  res.status(httpStatus.OK).send({
    code: httpStatus.NO_CONTENT,
    message: "Deleted Successfull.",
    data: "",
  });
});

const adminAddUser = catchAsync(async (req, res) => {
  const users = await adminService.adminAddUser(
    req.body.name,
    req.body.email,
    req.body.id,
  );
  if (!users) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Unable to add users");
  }
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: "New User Created Successfully.",
    data: "users",
  });
});

const getUserCount = catchAsync(async (req, res) => {
  const user = await adminService.getUserCount();
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: user ? "Success" : "Failed",
    data: user,
  });
});

const getUserCountByMonth = catchAsync(async (req, res) => {
  const user = await adminService.getUserCountByMonth();
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: user ? "Success" : "Failed",
    data: user,
  });
});

const getBlogCount = catchAsync(async (req, res) => {
  const user = await adminService.getBlogCount();
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: user ? "Success" : "Failed",
    data: user,
  });
});

const getCategoryCount = catchAsync(async (req, res) => {
  const user = await adminService.getCategoryCount();
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: user ? "Success" : "Failed",
    data: user,
  });
});

const getMostViewedStory = catchAsync(async (req, res) => {
  const user = await adminService.getMostViewedStory();
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: user ? "Success" : "Failed",
    data: user,
  });
});

const getMostLikedStory = catchAsync(async (req, res) => {
  const user = await adminService.getMostLikedStory();
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: user ? "Success" : "Failed",
    data: user,
  });
});

const getLoginLogs = catchAsync(async (req, res) => {
  const user = await adminService.getLoginLogs();
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: user ? "Success" : "Failed",
    data: user,
  });
});



//update organization status
const updatePaymentStatus = catchAsync(async (req, res) => {
  let paymentStatus = await adminService.updatePaymentStatus(req.body);
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    data: paymentStatus,
    message: "Successfully update Payment status",
  });
});

const getLoginLogsOfUser = catchAsync(async (req, res) => {
  const loginLogs = await adminService.getLoginLogsOfUser(req.body);
  if (!loginLogs) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Unable to Logs"
    );
  }
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    data: loginLogs,
    message: "Successfully Get Logs",
  });
});

module.exports = {
  createAdminUser,
  loginAdminUser,
  resetAdminPassword,
  sendOTP,
  verifyOTP,
  forgotAdminPassword,
  updateAdmin,
  deleteAdmin,
  getAllUsers,
  getUserById,
  deleteUser,
  adminAddUser,
  getAllAdmins,
  getProfile,
  findAdminById,
  getUserCount,
  getUserCountByMonth,
  getBlogCount,
  getCategoryCount,
  getMostViewedStory,
  getMostLikedStory,
  getLoginLogs,
  updatePaymentStatus,
  getLoginLogsOfUser
};
