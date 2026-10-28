const crypto = require("crypto");
const { status: httpStatus } = require("http-status");
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");

const {
  OTP,
  User,
  UserToken,
  LoginTiming,
} = require("../models");
const tokenTypes = require("../config/tokens");
const ApiError = require("../utils/ApiError");
const validatePassword = require("../helpers/validatePassword");
const {
  sendForgotPasswordOTP,
  sendResetPasswordConfirmationMail,
} = require("./email.service");
const { generateAuthTokens } = require("./token.service");

const OTP_TYPE = "forget_password";
const MAX_OTP_ATTEMPTS = 5;
// Wrong guesses per OTP id. In memory is enough while the API runs as a single process.
const failedOtpAttempts = new Map();

const invalidOtpError = () =>
  new ApiError(httpStatus.BAD_REQUEST, "Invalid or expired OTP.");

// Users are created by admins, so the only OTP left is the forgot-password one.
const sendOTP = async ({ email, type }) => {
  if (type !== OTP_TYPE) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid OTP type");
  }
  if (!email || typeof email !== "string") {
    throw new ApiError(httpStatus.BAD_REQUEST, "Please Enter Required Fields : [email]");
  }

  // Respond the same way whether or not the account exists, so this can't be used to find accounts.
  const user = await User.findOne({ where: { email, is_active: true } });
  if (!user) {
    return null;
  }

  const generatedOTP = crypto.randomInt(0, 1000000).toString().padStart(6, "0");

  await OTP.update({ is_active: false }, { where: { email: user.email } });
  const otpDoc = await OTP.create({
    email: user.email,
    code: generatedOTP,
    type: OTP_TYPE,
  });
  await sendForgotPasswordOTP(user.email, generatedOTP);
  return otpDoc;
};

const login = async (reqBody) => {
  const { email, password } = reqBody;
  const user =
    typeof email === "string" && typeof password === "string"
      ? await User.scope("withPassword").findOne({
          where: { email, is_active: true },
        })
      : null;

  // The same answer for an unknown email and a wrong password, so sign-in can't be used to find accounts.
  if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid email or password.");
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

const resetPassword = async (reqBody, currentToken) => {
  const { old_password, confirm_password, user } = reqBody;

  const userDoc = await User.scope("withPassword").findOne({
    where: { id: user?.id, is_active: true },
  });
  const validPass =
    userDoc?.password &&
    typeof old_password === "string" &&
    (await bcrypt.compare(old_password, userDoc.password));
  if (!validPass) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Incorrect Old Password.");
  }

  const userObj = {
    password: await bcrypt.hash(confirm_password, 10),
  };

  await User.update(userObj, {
    where: { id: userDoc.id, is_active: true },
  });

  // Sign out every other device. The session making this request stays signed in.
  await UserToken.update(
    { is_active: false },
    { where: { user_id: userDoc.id, token: { [Op.ne]: currentToken } } }
  );

  const token = await generateAuthTokens(userDoc);
  const response = {
    tokens: token,
  };
  return response;
};

const forgotPassword = async (email, otp, password, confirm_Password) => {
  if (!email || !otp || !password || !confirm_Password) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Please Enter Required Fields");
  }

  if (password !== confirm_Password) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Password and Confirm Password must be equal"
    );
  }

  if (!validatePassword(password)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Password should have a minimum length of 8 characters and must have at least 2 digits and No Blank Space"
    );
  }

  const user =
    typeof email === "string"
      ? await User.findOne({ where: { email, is_active: true } })
      : null;
  const otpDoc =
    user &&
    (await OTP.findOne({
      where: { email: user.email, type: OTP_TYPE, is_active: true, is_verified: false },
      order: [["id", "DESC"]],
    }));

  if (!otpDoc || otpDoc.otp_expiration_time < new Date()) {
    throw invalidOtpError();
  }

  if (String(otp) !== otpDoc.code) {
    const attempts = (failedOtpAttempts.get(otpDoc.id) || 0) + 1;
    if (attempts >= MAX_OTP_ATTEMPTS) {
      failedOtpAttempts.delete(otpDoc.id);
      await OTP.update({ is_active: false }, { where: { id: otpDoc.id } });
    } else {
      failedOtpAttempts.set(otpDoc.id, attempts);
    }
    throw invalidOtpError();
  }

  // Each code works once.
  failedOtpAttempts.delete(otpDoc.id);
  await OTP.update(
    { is_active: false, is_verified: true },
    { where: { id: otpDoc.id } }
  );

  await User.update(
    { password: await bcrypt.hash(password, 10) },
    { where: { id: user.id } }
  );

  // Sign out every device, since whoever knew the old password may hold a session.
  await UserToken.update({ is_active: false }, { where: { user_id: user.id } });

  await sendResetPasswordConfirmationMail(user.email);
  return true;
};

const logout = async (reqBody, headers) => {
  const { user } = reqBody;
  const accessToken = headers["x-access-token"];

  await LoginTiming.update(
    {
      is_active: false,
      logout_time: new Date(),
      updated_at: new Date(),
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
