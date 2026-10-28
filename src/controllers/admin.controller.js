const { status: httpStatus } = require("http-status");

const ApiError = require("../utils/ApiError");
const { adminService } = require("../services");
const responseWrapper = require("../config/responseWrapper");

const createAdminUser = async (req, res) => {
  const user = await adminService.createAdminUser(req.body);

  if (!user) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Admin not found");
  }

  res.status(httpStatus.OK).send({ code: httpStatus.OK, data: user });
};

const getProfile = async (req, res) => {
  const response = await adminService.getProfile(req.body);
  return responseWrapper(res, response, "Successfully get profile");
};

const loginAdminUser = async (req, res) => {
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
};

const resetAdminPassword = async (req, res) => {
  const response = await adminService.resetAdminPassword(req.body);
  res.status(httpStatus.OK).send({ code: httpStatus.OK, data: response });
};

const findAdminById = async (req, res) => {
  const adminDoc = await adminService.findAdminById(req.query.id);
  return responseWrapper(res, adminDoc, "", httpStatus.OK);
};

const updateAdmin = async (req, res) => {
  const response = await adminService.updateAdmin(req.body);
  return responseWrapper(res, response, "Admin Updated Successfully");
};

const deleteAdmin = async (req, res) => {
  await adminService.deleteAdmin(req.body);
  res.status(httpStatus.OK).send({
    code: httpStatus.NO_CONTENT,
    message: "Deleted Successfull.",
    data: "",
  });
};

const getAllAdmins = async (req, res) => {
  const users = await adminService.getAllAdmins();
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: users ? "Success" : "Failed",
    data: users,
  });
};

//=======================================USER APIS=========================================

const getAllUsers = async (req, res) => {
  const users = await adminService.getAllUsers();
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: users ? "Success" : "Failed",
    data: users,
  });
};

const getUserById = async (req, res) => {
  const response = await adminService.getUserById(req.query.id);
  return responseWrapper(res, response, "Successfully Get user", httpStatus.OK);
};

const deleteUser = async (req, res) => {
  await adminService.deleteUser(req.body);
  res.status(httpStatus.OK).send({
    code: httpStatus.NO_CONTENT,
    message: "Deleted Successfull.",
    data: "",
  });
};

const adminAddUser = async (req, res) => {
  // created_by comes from the signed-in admin, not from the request body.
  const users = await adminService.adminAddUser(
    req.body.name,
    req.body.email,
    req.body.user.id,
  );
  if (!users) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Unable to add users");
  }
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: "New User Created Successfully.",
    data: "users",
  });
};

const getUserCount = async (req, res) => {
  const user = await adminService.getUserCount();
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: user ? "Success" : "Failed",
    data: user,
  });
};

const getUserCountByMonth = async (req, res) => {
  const user = await adminService.getUserCountByMonth();
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: user ? "Success" : "Failed",
    data: user,
  });
};

const getBlogCount = async (req, res) => {
  const user = await adminService.getBlogCount();
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: user ? "Success" : "Failed",
    data: user,
  });
};

const getCategoryCount = async (req, res) => {
  const user = await adminService.getCategoryCount();
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: user ? "Success" : "Failed",
    data: user,
  });
};

const getMostViewedStory = async (req, res) => {
  const user = await adminService.getMostViewedStory();
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: user ? "Success" : "Failed",
    data: user,
  });
};

const getMostLikedStory = async (req, res) => {
  const user = await adminService.getMostLikedStory();
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: user ? "Success" : "Failed",
    data: user,
  });
};

//update organization status
const updatePaymentStatus = async (req, res) => {
  let paymentStatus = await adminService.updatePaymentStatus(req.body);
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    data: paymentStatus,
    message: "Successfully update Payment status",
  });
};

const getLoginLogsOfUser = async (req, res) => {
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
};

module.exports = {
  createAdminUser,
  loginAdminUser,
  resetAdminPassword,
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
  updatePaymentStatus,
  getLoginLogsOfUser
};
