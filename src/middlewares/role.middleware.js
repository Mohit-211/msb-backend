const httpStatus = require("http-status");

const catchAsync = require("../utils/catchAsync");

const { roleService } = require("../services");
const Roles = require("../config/roles");

const isSuperAdmin = catchAsync(async (req, res, next) => {
  const roleDoc = await roleService.findRoleById(req.user.role_id);
  if (!roleDoc || roleDoc.name !== Roles.ADM) {
    return res
      .status(httpStatus.UNAUTHORIZED)
      .send(
        httpStatus.UNAUTHORIZED,
        "|=> You are not authorized to access this api <=|"
      );
  }
  next();
});

module.exports = {
  isSuperAdmin,
};
