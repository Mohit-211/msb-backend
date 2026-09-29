const httpStatus = require("http-status");

const catchAsync = require("../utils/catchAsync");
const { roleService } = require("../services");

const createRole = catchAsync(async (req, res) => {
  await roleService.createRole(req.body);
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: "New Role Created Successfully.",
    data: "",
  });
});

const updateRole = catchAsync(async (req, res) => {
  const roleDoc = await roleService.updateRole(req.body);
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: "Role Updated Successfully",
    data: roleDoc ? roleDoc : {},
  });
});

const getAllRoles = catchAsync(async (req, res) => {
  const roles = await roleService.getAllRoles();
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: roles ? "Success" : "Failed",
    data: roles,
  });
});

const findRoleById = catchAsync(async (req, res) => {
  const roleDoc = await roleService.findRoleById(req.query.id);
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: roleDoc ? "Success" : "Failed",
    data: roleDoc ? roleDoc : {},
  });
});

const deleteRole = catchAsync(async (req, res) => {
  await roleService.deleteRole(req.body);
  res.status(httpStatus.OK).send({
    code: httpStatus.NO_CONTENT,
    message: "Delete Successfull.",
    data: "",
  });
});

module.exports = {
  createRole,
  getAllRoles,
  findRoleById,
  deleteRole,
  updateRole,
};
