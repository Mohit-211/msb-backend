const { status: httpStatus } = require("http-status");

const validatePassword = require("../helpers/validatePassword");
const ApiError = require("../utils/ApiError");
const { authService } = require("../services");
const pick = require("../utils/pick");
const responseWrapper = require("../config/responseWrapper");

const sendOTP = async (req, res, next) => {
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
};

const login = async (req, res) => {
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
    } else {
      console.error(error);
    }

    return responseWrapper(res, null, message, statusCode);
  }
};

const resetPassword = async (req, res) => {
  const { new_password, confirm_password } = req.body;

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
    const response = await authService.resetPassword(
      req.body,
      req.headers["x-access-token"]
    );
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
};

const forgotPassword = async (req, res) => {
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
};

const logout = async (req, res) => {
  const response = await authService.logout(req.body,req.headers);
  return responseWrapper(res, response, "Successfully Logged out.");
};

module.exports = {
  login,
  resetPassword,
  sendOTP,
  forgotPassword,
  logout,
};