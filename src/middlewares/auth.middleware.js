const { status: httpStatus } = require("http-status");
const jwt = require("jsonwebtoken");

const { User, UserToken } = require("../models");
const tokenTypes = require("../config/tokens");

const config = require("../config/config");
const responseWrapper = require("../config/responseWrapper");

// Finds the user a token belongs to. A failure comes back as [status, message] for verifyAuthJWTToken to send.
const resolveUserToken = async (token) => {
  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret, { algorithms: ["HS256"] });
  } catch (err) {
    return { error: [httpStatus.UNAUTHORIZED, "Invalid Token"] };
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
    return { error: [httpStatus.BAD_REQUEST, "Token Not Found"] };
  }

  const user = await User.findOne({
    where: { id: tokenDoc.user_id, is_active: 1 },
  });
  if (!user) {
    return { error: [httpStatus.NOT_FOUND, "User Not Found"] };
  }

  return { user };
};

const verifyAuthJWTToken = async (req, res, next) => {
  const token = req.headers["x-access-token"];

  if (!token) {
    return responseWrapper(
      res,
      "",
      "Please authenticate",
      httpStatus.UNAUTHORIZED
    );
  }

  const { user, error } = await resolveUserToken(token);
  if (error) {
    return responseWrapper(res, "", error[1], error[0]);
  }

  req.body.user = user;
  next();
};

const validateNewBlogBody = async (req, res, next) => {
  const { heading, description, categories, type } = req.body;

  if (!heading || !description || !categories || !type) {
    return responseWrapper(
      res,
      "",
      "Please Enter Required Fields : [ heading || description || categories || type ]",
      httpStatus.BAD_REQUEST
    );
  }

  next();
};

module.exports = {
  verifyAuthJWTToken,
  validateNewBlogBody,
};
