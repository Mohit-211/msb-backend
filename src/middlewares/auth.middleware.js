const { status: httpStatus } = require("http-status");
const jwt = require("jsonwebtoken");

const { User, UserToken } = require("../models");
const tokenTypes = require("../config/tokens");

const config = require("../config/config");
const responseWrapper = require("../config/responseWrapper");

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

  let payload;
  try {
    payload = jwt.verify(token, config.jwt.secret, { algorithms: ["HS256"] });
  } catch (err) {
    return responseWrapper(res, "", "Invalid Token", httpStatus.UNAUTHORIZED);
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
    return responseWrapper(res, "", "Token Not Found", httpStatus.BAD_REQUEST);
  }

  const user = await User.findOne({
    where: { id: tokenDoc.user_id, is_active: 1 },
  });
  if (!user) {
    return responseWrapper(res, "", "User Not Found", httpStatus.NOT_FOUND);
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

  // Validate categories
  const categoryNames = categories
    .split(",")
    .map((categoryName) => categoryName.trim());

  req.body.categories = categoryNames;

  next();
};

module.exports = {
  verifyAuthJWTToken,
  validateNewBlogBody,
};