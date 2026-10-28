const crypto = require("crypto");
const { status: httpStatus } = require("http-status");
const bcrypt = require("bcryptjs");
const { Sequelize, Op } = require("sequelize");
const jwt = require("jsonwebtoken");

const sequelize = require("../config/central.db");
const {
  Admin,
  Role,
  User,
  UserAttachment,
  Category,
  BlogComment,
  BlogLike,
  BlogViews,
  LoginTiming,
} = require("../models");
const ApiError = require("../utils/ApiError");
const config = require("../config/config");
const {
  sendUserCredentials,
  sendAdminCredentials,
} = require("./email.service");
const Blog = require("../models/blog.model");

// Temporary passwords emailed to new admins and users. Unlike Math.random, crypto can't be predicted.
const generatePassword = () => crypto.randomBytes(9).toString("base64url");

const createAdminUser = async (reqBody) => {
  const password = generatePassword();
  let salt = bcrypt.genSaltSync(10);
  const adminObj = {
    name: reqBody.name,
    role_id: reqBody.role_id,
    email_id: reqBody.email,
    password: bcrypt.hashSync(password, salt),
  };
  const adminDoc = await Admin.create(adminObj);
  if (!adminDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Unable to create admin");
  }

  let isSend = await sendAdminCredentials(reqBody.email, password);
  if (!isSend) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Unable to send Credentials to This Email"
    );
  }
  // create() returns every column, including the password hash; don't send that back.
  const admin = adminDoc.get({ plain: true });
  delete admin.password;
  return admin;
};

const getProfile = async (body) => {
  const { user } = body;
  let result = "";

  result = await Admin.findOne({
    include: [
      {
        model: Role,
        as: "admin_roles",
      },
    ],
    where: { id: user?.id, is_active: true },
  });
  if (!result)
    throw new ApiError(httpStatus.BAD_REQUEST, "Failed to Get Profile.");

  return result;
};

const loginAdminUser = async (reqBody) => {
  const user = await Admin.scope("withPassword").findOne({
    where: { email_id: reqBody.email, is_active: true },
  });

  // The same answer for an unknown email and a wrong password, so sign-in can't be used to find accounts.
  if (!user || !user.password || !(await bcrypt.compare(reqBody.password, user.password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, "Invalid email or password.");
  }

  // The role is read from the database on each request, so the token only carries the admin id.
  const token = jwt.sign({ id: user.id }, config.jwt.adminSecret, {
    algorithm: "HS256",
    expiresIn: "2d",
  });
  const response = {
    name: user.name,
    email: user.email_id,
    token: token,
  };
  return response;
};

const resetAdminPassword = async (reqBody) => {
  const { old_password, confirm_password, user } = reqBody;

  const userDoc = await Admin.scope("withPassword").findByPk(user.id);

  if (!userDoc) {
    throw new ApiError(httpStatus.BAD_REQUEST, "|=> User Not Found. <=|");
  }

  const validPass = await bcrypt.compare(old_password, userDoc?.password);
  if (!validPass) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "|=> Incorrect Old Password. <=|"
    );
  }

  let salt = bcrypt.genSaltSync(10);
  const userObj = {
    password: bcrypt.hashSync(confirm_password, salt),
  };

  const isUserPasswordUpdate = await Admin.update(userObj, {
    where: { id: user?.id },
  });

  if (!isUserPasswordUpdate) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "|=> Failed to Change Password. <=|"
    );
  }
  return "|=> Password Changed Successfully. <=|";
};

const findAdminById = async (id) => {
  const adminDoc = await Admin.findOne({
    where: { id: id },
    include: [
      {
        model: Role,
        as: "admin_roles",
      },
    ],
  });
  return adminDoc ? adminDoc : {};
};

const updateAdmin = async (reqBody) => {
  const adminDoc = await Admin.findOne({
    where: {
      id: reqBody.admin_id,
    },
  });

  if (
    reqBody.name &&
    reqBody.name !== "" &&
    typeof reqBody.name !== "undefined"
  ) {
    adminDoc["name"] = reqBody.name;
  }

  if (
    reqBody.email &&
    reqBody.email !== "" &&
    typeof reqBody.email !== "undefined"
  ) {
    adminDoc["email"] = reqBody.email;
  }
  if (
    reqBody.role_id &&
    reqBody.role_id !== "" &&
    typeof reqBody.role_id !== "undefined"
  ) {
    adminDoc["role_id"] = reqBody.role_id;
  }

  await adminDoc.save();
  return adminDoc ? adminDoc : {};
};

const deleteAdmin = async (reqBody) => {
  const admin = await Admin.findOne({
    where: {
      id: reqBody.admin_id,
    },
  });
  if (!admin) {
    throw new ApiError(httpStatus.NOT_FOUND, "Admin not found");
  }
  await admin.destroy({
    where: {
      id: reqBody.admin_id,
      is_active: true,
    },
  });
};

const getAllUsers = async () => {
  try {
    const userDoc = await User.findAll({
      where: { is_active: 1 },
      include: [
        {
          model: UserAttachment,
          as: "attachements",
        },
      ],
    });

    if (!userDoc) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "|=> Failed to get all User <=|"
      );
    }

    return userDoc;
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.message);
  }
};

const getUserById = async (id) => {
  const userDoc = await User.findOne({
    where: { id: id, is_active: true },
    include: [
      {
        model: UserAttachment,
        as: "attachements",
      },
    ],
  });

  if (!userDoc)
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to Get All Users"
    );
  return userDoc;
};

const deleteUser = async (reqBody) => {
  const userDoc = await User.findOne({ where: { id: reqBody.user_id } });
  if (!userDoc) {
    throw new ApiError(httpStatus.BAD_REQUEST, "User not found");
  }
  await userDoc.destroy({ where: { id: reqBody.user_id, is_active: true } });

  // Delete associated blogLikes
  const blogLikeDoc = await BlogLike.findOne({
    where: { user_id: reqBody.user_id },
  });
  if (blogLikeDoc) {
    await blogLikeDoc.destroy();
  }

  // Delete associated blogComments
  const blogCommentDocs = await BlogComment.findAll({
    where: { user_id: reqBody.user_id },
  });

  // Iterate through each instance and destroy it
  for (const blogCommentDoc of blogCommentDocs) {
    await blogCommentDoc.destroy();
  }

  // Delete associated blogviews
  const blogViewDoc = await BlogViews.findOne({
    where: { user_id: reqBody.user_id },
  });
  if (blogViewDoc) {
    await blogViewDoc.destroy();
  }

  return userDoc;
};

const adminAddUser = async (name, email, id) => {
  // Check if the email already exists in the User table
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Email already exists");
  }

  // Generate password and salt
  let salt = bcrypt.genSaltSync(10);
  const password = generatePassword();

  // Create new user
  const newUser = await User.create({
    name,
    email,
    password: bcrypt.hashSync(password, salt),
    created_by: id,
  });

  if (!newUser) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Unable to create user");
  }

  // Send user credentials
  let isSend = await sendUserCredentials(email, password);
  if (!isSend) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Unable to send Credentials to This Email"
    );
  }

  return newUser;
};

const getAllAdmins = async () => {
  try {
    const userDoc = await Admin.findAll({
      where: { is_active: true },
      include: [
        {
          model: Role,
          as: "admin_roles",
        },
      ],
    });

    if (!userDoc) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "|=> Failed to get all User <=|"
      );
    }

    return userDoc;
  } catch (error) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.message);
  }
};

const getUserCount = async () => {
  const userCount = await User.count({
    where: {
      is_active: true,
    },
  });
  return userCount;
};

const getUserCountByMonth = async (inputYear) => {
  try {
    // Define all months
    const allMonths = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    // Determine the year to use (inputYear or current year)
    const yearToQuery = inputYear || new Date().getFullYear();

    // Fetch user count for each month from the database
    const userCountByMonth = await User.findAll({
      attributes: [
        [
          Sequelize.fn("DATE_FORMAT", Sequelize.col("created_at"), "%M"),
          "month",
        ],
        [Sequelize.fn("COUNT", "*"), "userCount"],
      ],
      where: {
        created_at: {
          [Sequelize.Op.between]: [
            new Date(`${yearToQuery}-01-01`),
            new Date(`${yearToQuery}-12-31T23:59:59`),
          ],
        },
      },
      group: [Sequelize.fn("DATE_FORMAT", Sequelize.col("created_at"), "%M")],
    });

    // Transform the result to an object with month names as keys
    const userCountByMonthMap = userCountByMonth.reduce(
      (acc, { dataValues }) => {
        const { month, userCount } = dataValues;
        acc[month] = userCount;
        return acc;
      },
      {}
    );

    // Create the final response with all months
    const response = allMonths.map((month) => ({
      month,
      userCount: userCountByMonthMap[month] || 0,
    }));

    return response;
  } catch (error) {
    console.error(error);
    throw new Error("Error retrieving user count by month");
  }
};

const getBlogCount = async () => {
  const blogCount = await Blog.count({
    where: {
      is_active: true,
    },
  });
  return blogCount;
};

const getCategoryCount = async () => {
  const categoryCount = await Category.count({
    where: {
      is_active: true,
    },
  });
  return categoryCount;
};

const getMostViewedStory = async () => {
  try {
    const mostViewedStory = await Blog.findOne({
      attributes: ["id", "heading", "views_count"],
      order: [["views_count", "DESC"]],
      limit: 1,
    });

    return mostViewedStory;
  } catch (error) {
    // Handle errors here
    console.error("Error getting most viewed story:", error);
    throw error;
  }
};

const getMostLikedStory = async () => {
  try {
    const mostViewedStory = await Blog.findOne({
      attributes: ["id", "heading", "likes_count"],
      order: [["likes_count", "DESC"]],
      limit: 1,
    });

    return mostViewedStory;
  } catch (error) {
    // Handle errors here
    console.error("Error getting most likes story:", error);
    throw error;
  }
};

const updatePaymentStatus = async (reqBody) => {
  try {
    const user = await User.findOne({
      where: { id: reqBody.user_id },
    });

    if (!user) {
      throw new ApiError(httpStatus.BAD_REQUEST, "User not found");
    }

    // Update the payment status
    user.payment_status = "SUBSCRIBED";
    await user.save();

    return user;
  } catch (error) {
    // Handle errors appropriately
    console.error(error);
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Internal Server Error"
    );
  }
};

const getLoginLogsOfUser = async (reqBody) => {
  const users = await User.findAll({
    where: {
      is_active: true,
    },
    include: [
      {
        model: LoginTiming,
        as: "user_login",
        where: {
          created_at: {
            [Op.and]: [
              sequelize.where(
                sequelize.fn("YEAR", sequelize.col("user_login.created_at")),
                reqBody.year
              ),
              sequelize.where(
                sequelize.fn("MONTH", sequelize.col("user_login.created_at")),
                reqBody.month
              ),
            ],
          },
        },
        raw: true,
        required: false,
      },
    ],
  });

  const userLoginLogs = users.map((user) => ({
    id: user.id,
    userName: user.name,
    userEmail: user.email,
    logincount: user.user_login ? user.user_login.length : 0,
  }));

  return userLoginLogs;
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
  getLoginLogsOfUser,
};
