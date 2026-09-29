const httpStatus = require("http-status");
const bcrypt = require("bcryptjs");
const moment = require("moment");
const randomize = require("randomatic");

const {
  OTP,
  User,
  UserAttachment,
  UserToken,
  LoginTiming,
} = require("../models");
const tokenTypes = require("../config/tokens");
const ApiError = require("../utils/ApiError");
const config = require("../config/config");
const {
  sendForgotPasswordOTP,
  sendEmailVerification,
  sendResetPasswordConfirmationMail,
} = require("./email.service");
const { generateAuthTokens } = require("./token.service");

const sendOTP = async ({ email, type }) => {
  if (type === "forget_password") {
    // No need to check if email is already taken for forget_password
  } else if (
    type === "email_verification" &&
    (await User.isEmailTaken(email))
  ) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Email already taken");
  }

  const generatedOTP = randomize("0", 4);
  if (type === "email_verification") {
    await sendEmailVerification(email, generatedOTP);
  } else {
    await sendForgotPasswordOTP(email, generatedOTP);
  }

  let otpObj = {
    email: email,
    code: generatedOTP,
    type: type,
  };

  await OTP.update({ is_active: false }, { where: { email: email } });
  let otpDoc = await OTP.create(otpObj);
  return otpDoc;
};

const verifyOTP = async (email, otp, type) => {
  if (!email || !otp || !type) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Please Enter Required Fields : [email, otp, type]"
    );
  }

  const otpDoc = await OTP.findOne({
    where: { email: email, type: type, is_active: true, is_verified: false },
  });
  if (!otpDoc || Object.keys(otpDoc).length === 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid Email or Type");
  }

  if (otp !== otpDoc.code) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Invalid OTP Entered");
  }

  if (otpDoc.otp_expiration_time < new Date()) {
    throw new ApiError(httpStatus.BAD_REQUEST, "OTP has been Expired");
  }

  let isUpdate = await OTP.update(
    {
      is_active: false,
      is_verified: true,
    },
    {
      where: { email: email, type: type },
    }
  );
  return isUpdate;
};

const register = async (body, files) => {
  const { name, email, mobile, password, confirm_password } = body;
  let salt = bcrypt.genSaltSync(10);
  const userObj = {
    name: name,
    email: email,
    mobile: mobile,
    password: bcrypt.hashSync(password, salt),
  };
  const user = await User.create(userObj);
  if (!user) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create User"
    );
  }
  if (
    files &&
    Object.keys(files).length !== 0 &&
    files.images &&
    files.images.length !== 0
  ) {
    for (let i = 0; i < files.images.length; i++) {
      let currImage = files.images[i];
      const userAttachmentObj = {
        user_id: user.id,
        title: "Profile Image",
        file_type: "Image",
        file_name: currImage.filename,
        file_uri: "/images",
        file_size: currImage.size,
      };
      await UserAttachment.create(userAttachmentObj);
    }
  } else if (
    files &&
    Object.keys(files).length !== 0 &&
    files.gifs &&
    files.gifs.length !== 0
  ) {
    for (let i = 0; i < files.gifs.length; i++) {
      let currImage = files.gifs[i];
      const userAttachmentObj = {
        user_id: user.id,
        title: "Profile Image",
        file_type: "Gif",
        file_name: currImage.filename,
        file_uri: "/gifs",
        file_size: currImage.size,
      };
      await UserAttachment.create(userAttachmentObj);
    }
  }
  return user;
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
  const { old_password, new_password, confirm_password, user } = reqBody;

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

const checkTokenStatus = async (reqBody) => {
  const { token } = reqBody;

  const userToken = await UserToken.findOne({
    where: { token_type: tokenTypes.ACCESS, token: token },
  });

  if (!userToken) {
    throw new ApiError(httpStatus.OK, "Token not found.");
  }

  if (userToken.is_active == true) {
    return "Token is active";
    // return { token_status: "active" };
  } else {
    return "Token is expired";
  }
};

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