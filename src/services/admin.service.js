const crypto = require("crypto");
const { status: httpStatus } = require("http-status");
const bcrypt = require("bcryptjs");
const { Op } = require("sequelize");
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
  UserToken,
} = require("../models");
const ApiError = require("../utils/ApiError");
const config = require("../config/config");
const validateEmail = require("../helpers/validateEmail");
const pageOf = require("../helpers/pageOf");
const { accessSummary, trialCutoff } = require("../utils/access");
const {
  sendUserCredentials,
  sendAdminCredentials,
} = require("./email.service");
const { isSuperAdminRole } = require("./role.service");
const { recountBlog } = require("./blog.service");
const Blog = require("../models/blog.model");
const logger = require("../config/logger");

// Temporary passwords emailed to new admins and users. Unlike Math.random, crypto can't be predicted.
const generatePassword = () => crypto.randomBytes(9).toString("base64url");

// What each kind of admin can manage, so the panel only shows menus that will work.
const CONTENT_PERMISSIONS = ["dashboard", "stories", "ai_stories", "categories", "home_page"];
const SUPER_ADMIN_PERMISSIONS = ["customers", "admins", "roles", "login_logs"];

// Payment happens outside the platform; admins record it as SUBSCRIBED (paid) or UNSUBSCRIBED.
const PAYMENT_STATUSES = ["SUBSCRIBED", "UNSUBSCRIBED"];
// The customer list's account switch, as the admin panel names it.
const USER_STATUSES = { ACTIVATE: true, DEACTIVATE: false };

const presentCustomer = (user) => ({
  ...user.toJSON(),
  user_status: user.is_active ? "ACTIVATE" : "DEACTIVATE",
  access: accessSummary(user),
});

const createAdminUser = async (reqBody) => {
  const password = generatePassword();
  const adminObj = {
    name: reqBody.name,
    role_id: reqBody.role_id,
    email_id: reqBody.email,
    password: await bcrypt.hash(password, 10),
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
  const result = await Admin.findOne({
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

  const admin = result.toJSON();
  admin.is_super_admin = isSuperAdminRole(result.admin_roles);
  admin.permissions = admin.is_super_admin
    ? [...CONTENT_PERMISSIONS, ...SUPER_ADMIN_PERMISSIONS]
    : CONTENT_PERMISSIONS;
  return admin;
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

  const userObj = {
    password: await bcrypt.hash(confirm_password, 10),
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
  const { name, role_id, user } = reqBody;
  const email = typeof reqBody.email === "string" ? reqBody.email.trim() : "";

  const adminDoc = await Admin.findOne({
    where: {
      id: reqBody.admin_id,
    },
  });
  if (!adminDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Admin not found");
  }

  if (typeof name === "string" && name.trim() !== "") {
    adminDoc.name = name.trim();
  }

  // The column is email_id. Writing "email" used to report success without saving anything.
  if (email !== "" && email !== adminDoc.email_id) {
    if (!validateEmail(email)) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid Email");
    }
    const taken = await Admin.findOne({
      where: { email_id: email, id: { [Op.ne]: adminDoc.id } },
    });
    if (taken) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Email already taken");
    }
    adminDoc.email_id = email;
  }

  if (role_id !== undefined && role_id !== "" && Number(role_id) !== adminDoc.role_id) {
    // Changing your own role could leave nobody able to manage admins.
    if (adminDoc.id === user?.id) {
      throw new ApiError(httpStatus.BAD_REQUEST, "You can't change your own role.");
    }
    const role = await Role.findByPk(role_id);
    if (!role) {
      throw new ApiError(httpStatus.BAD_REQUEST, "Invalid Role Id");
    }
    adminDoc.role_id = role.id;
  }

  await adminDoc.save();
  return adminDoc;
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
  // Deleting yourself could leave nobody able to manage admins.
  if (admin.id === reqBody.user?.id) {
    throw new ApiError(httpStatus.BAD_REQUEST, "You can't delete your own account.");
  }
  await admin.destroy({
    where: {
      id: reqBody.admin_id,
      is_active: true,
    },
  });
};

// Deactivated customers stay in the list, so they can be switched back on.
// ?search= matches name or email. With ?limit= (and ?page=) the result is one page, as { count, rows }.
const getAllUsers = async (query = {}) => {
  const where = {};
  if (typeof query.search === "string" && query.search.trim() !== "") {
    const like = { [Op.like]: `%${query.search.trim()}%` };
    where[Op.or] = [{ name: like }, { email: like }];
  }
  const options = {
    where,
    include: [
      {
        model: UserAttachment,
        as: "attachements",
      },
    ],
    order: [["id", "ASC"]],
  };

  if (query.limit) {
    const { count, rows } = await User.findAndCountAll({
      ...options,
      ...pageOf(query, 50),
      distinct: true,
    });
    return { count, rows: rows.map(presentCustomer) };
  }
  const users = await User.findAll(options);
  return users.map(presentCustomer);
};

const getUserById = async (id) => {
  const userDoc = await User.findOne({
    where: { id: id },
    include: [
      {
        model: UserAttachment,
        as: "attachements",
      },
    ],
  });

  if (!userDoc)
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  return presentCustomer(userDoc);
};

const deleteUser = async (reqBody) => {
  const userDoc = await User.findOne({ where: { id: reqBody.user_id } });
  if (!userDoc) {
    throw new ApiError(httpStatus.BAD_REQUEST, "User not found");
  }

  // The customer's likes, comments, views and sessions go with them, in one transaction,
  // and the stories they liked or commented on are recounted.
  await sequelize.transaction(async (transaction) => {
    const where = { user_id: userDoc.id };
    const touched = new Set();
    for (const Model of [BlogLike, BlogComment]) {
      for (const row of await Model.findAll({ attributes: ["blog_id"], where, transaction })) {
        touched.add(row.blog_id);
      }
    }
    await BlogLike.destroy({ where, transaction });
    await BlogComment.destroy({ where, transaction });
    await BlogViews.destroy({ where, transaction });
    await UserToken.update({ is_active: false }, { where, transaction });
    await userDoc.destroy({ transaction });
    for (const blogId of touched) {
      await recountBlog(blogId, transaction);
    }
  });

  return userDoc;
};

const adminAddUser = async (name, email, id, payment_status) => {
  if (!name || !email || !validateEmail(email)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Please enter a name and a valid email");
  }
  const paymentStatus = payment_status || "UNSUBSCRIBED";
  if (!PAYMENT_STATUSES.includes(paymentStatus)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "payment_status must be SUBSCRIBED or UNSUBSCRIBED"
    );
  }

  // Check if the email already exists in the User table
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Email already exists");
  }

  // Generate a temporary password
  const password = generatePassword();

  // Create new user
  const newUser = await User.create({
    name,
    email,
    password: await bcrypt.hash(password, 10),
    payment_status: paymentStatus,
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

  // create() returns every column, including the password hash; don't send that back.
  const user = newUser.get({ plain: true });
  delete user.password;
  return user;
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

    // Counted here rather than with MySQL's DATE_FORMAT, so it works on any database. Months are UTC, as before.
    const users = await User.findAll({
      attributes: ["created_at"],
      where: {
        created_at: {
          [Op.between]: [
            new Date(`${yearToQuery}-01-01`),
            new Date(`${yearToQuery}-12-31T23:59:59`),
          ],
        },
      },
      raw: true,
    });
    const counts = new Array(12).fill(0);
    for (const { created_at } of users) counts[new Date(created_at).getUTCMonth()]++;

    return allMonths.map((month, index) => ({ month, userCount: counts[index] }));
  } catch (error) {
    logger.error(error);
    throw new Error("Error retrieving user count by month", { cause: error });
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
    logger.error(error);
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
    logger.error(error);
    throw error;
  }
};

const updatePaymentStatus = async (reqBody) => {
  // Without a status this marks the user as paid, as it always has.
  const paymentStatus = reqBody.payment_status || "SUBSCRIBED";
  if (!PAYMENT_STATUSES.includes(paymentStatus)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "payment_status must be SUBSCRIBED or UNSUBSCRIBED"
    );
  }

  const user = await User.findOne({
    where: { id: reqBody.user_id },
  });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  user.payment_status = paymentStatus;
  await user.save();
  return presentCustomer(user);
};

// Switches a customer's account on or off. A deactivated customer can't sign in and is signed out everywhere.
const updateUserStatus = async (reqBody) => {
  const { user_id, user_status } = reqBody;
  if (!Object.hasOwn(USER_STATUSES, user_status)) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "user_status must be ACTIVATE or DEACTIVATE"
    );
  }

  const user = await User.findOne({ where: { id: user_id } });
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  user.is_active = USER_STATUSES[user_status];
  await user.save();
  if (!user.is_active) {
    await UserToken.update({ is_active: false }, { where: { user_id: user.id } });
  }
  return presentCustomer(user);
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

// One CSV cell: quoted, with quotes doubled. A leading ' stops spreadsheets running text that looks like a formula.
const csvCell = (value) => {
  let text = value instanceof Date ? value.toISOString() : value == null ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

// The customer list as CSV, built on the server so commas, quotes and formulas in names can't break it.
const exportUsers = async () => {
  const users = await getAllUsers();
  const header = ["ID", "Name", "Email", "Mobile", "Plan", "Payment status", "Account", "Trial ends", "Created"];
  const lines = users.map((user) =>
    [
      user.id,
      user.name,
      user.email,
      user.mobile,
      user.access.plan,
      user.payment_status,
      user.user_status,
      user.access.trial_ends_at,
      user.created_at,
    ]
      .map(csvCell)
      .join(",")
  );
  // The byte-order mark makes Excel read the file as UTF-8.
  return `\uFEFF${[header.map(csvCell).join(","), ...lines].join("\r\n")}\r\n`;
};

// Everything the Dashboard shows, in one request instead of six.
const getDashboardStats = async () => {
  const notPaid = {
    [Op.or]: [{ payment_status: { [Op.ne]: "SUBSCRIBED" } }, { payment_status: null }],
  };
  const [active, paid, trial, inactive, stories, categories, usersByMonth, mostViewedStory, mostLikedStory] =
    await Promise.all([
      getUserCount(),
      User.count({ where: { is_active: true, payment_status: "SUBSCRIBED" } }),
      User.count({ where: { is_active: true, created_at: { [Op.gt]: trialCutoff() }, ...notPaid } }),
      User.count({ where: { is_active: false } }),
      getBlogCount(),
      getCategoryCount(),
      getUserCountByMonth(),
      getMostViewedStory(),
      getMostLikedStory(),
    ]);
  return {
    users: { active, paid, trial, free: active - paid - trial, inactive },
    stories,
    categories,
    usersByMonth,
    mostViewedStory,
    mostLikedStory,
  };
};

module.exports = {
  exportUsers,
  getDashboardStats,
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
  updateUserStatus,
  getLoginLogsOfUser,
};
