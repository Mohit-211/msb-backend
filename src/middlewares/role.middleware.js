const { status: httpStatus } = require("http-status");

const { Role } = require("../models");
const { isSuperAdminRole } = require("../services/role.service");
const ApiError = require("../utils/ApiError");

const isSuperAdmin = async (req, res, next) => {
  const roleDoc = await Role.findByPk(req.user.role_id);
  if (!isSuperAdminRole(roleDoc)) {
    // 403, not 401: the admin is signed in, so the panel shouldn't treat this as an expired session.
    throw new ApiError(httpStatus.FORBIDDEN, "Only admins with the ADMIN role can do this.");
  }
  next();
};

module.exports = {
  isSuperAdmin,
};
