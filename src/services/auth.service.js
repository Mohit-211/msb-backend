const httpStatus = require("http-status");
const bcrypt = require("bcryptjs");
const moment = require("moment");
const randomize = require("randomatic");

const {
  OTP,
  User,
  UserToken,
  LoginTiming,
} = require("../models");
const tokenTypes = require("../config/tokens");
const ApiError = require("../utils/ApiError");
const {
  sendForgotPasswordOTP,
  sendResetPasswordConfirmationMail,
} = require("./email.service");
const { generateAuthTokens } = require("./token.service");

// Users are created by admins, so the only OTP left is the forgot-password one.
const sendOTP = async ({ email, type }) => {
  if (type !== "forget_password") {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid OTP type");
  }

  const generatedOTP = randomize("0", 4);
  await sendForgotPasswordOTP(email, generatedOTP);

  let otpObj = {
    email: email,
    code: generatedOTP,
    type: type,
  };

  await OTP.update({ is_active: false }, { where: { email: email } });
  let otpDoc = await OTP.create(otpObj);
  return otpDoc;
};

const login = async (reqBody) => {
  const user = await User.findOne({
    where: { email: reqBody.email, is_active: true },
  });

  if (!user) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Email does not exist.");
  }

  const validPass = await bcrypt.compare(reqBody.password, user.password);
  if (!validPass) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Invalid Password. Please try again."
    );
  }

  const token = await generateAuthTokens(user);
  const userObj = {
    id: user.id,
    name: user.name,
    email: user.email,
    payment_status: user.payment_status,
    tokens: token,
  };

  return userObj;
};

const resetPassword = async (reqBody) => {
  const { old_password, confirm_password, user } = reqBody;

  const validPass = await bcrypt.compare(old_password, user?.password);
  if (!validPass) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Incorrect Old Password.");
  }

  let salt = bcrypt.genSaltSync(10);
  const userObj = {
    password: bcrypt.hashSync(confirm_password, salt),
  };

  const isUserPasswordUpdate = await User.update(userObj, {
    where: { id: user?.id, is_active: true },
  });

  if (!isUserPasswordUpdate) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to Change Password."
    );
  }
  const token = await generateAuthTokens(user);
  const response = {
    tokens: token,
  };
  return response;
};

const forgotPassword = async (email, otp, password, confirm_Password) => {
  if (!email || !otp || !password || !confirm_Password) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Please Enter Required Fields");
  }

  const user = await User.findOne({
    where: { email: email },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User Not Found");
  }
  const myOtp = await OTP.findOne({
    where: { email: email, code: otp, is_verified: false },
  });

  if (!myOtp || Object.keys(myOtp).length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid OTP Entered");
  }
  if (myOtp.used === 1) {
    throw new ApiError(httpStatus.BAD_REQUEST, "OTP has already taken");
  }

  if (myOtp.expires_at < new Date()) {
    throw new ApiError(httpStatus.BAD_REQUEST, "OTP has already Expired");
  }

  if (password !== confirm_Password) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Password and Confirm Password must be equal"
    );
  }

  await OTP.update(
    { is_verified: false },
    { where: { email: email, code: otp } }
  );

  let salt = bcrypt.genSaltSync(10);
  let isUpdate = await User.update(
    {
      password: bcrypt.hashSync(password, salt),
      hash: bcrypt.hashSync(password),
      updated_at: moment(),
    },
    {
      where: { email: user.email },
    }
  );
  if (isUpdate) {
    await sendResetPasswordConfirmationMail(user.email);
  }
  return isUpdate;
};

const logout = async (reqBody, headers) => {
  const { user } = reqBody;
  const accessToken = headers["x-access-token"];

  await LoginTiming.update(
    {
      is_active: false,
      logout_time: moment(),
      updated_at: moment(),
    },
    {
      where: {
        user_id: user?.id,
        token: accessToken,
        is_active: true,
      },
    }
  );

  const isLoggedout = await UserToken.update(
    { is_active: 0 },
    { where: { user_id: user?.id, token_type: tokenTypes.ACCESS } }
  );

  if (!isLoggedout) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to Logout.");
  }
  return "";
};

module.exports = {
  login,
  resetPassword,
  sendOTP,
  forgotPassword,
  logout,
};