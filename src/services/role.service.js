const { status: httpStatus } = require("http-status");

const { Admin, Role } = require("../models");
const Roles = require("../config/roles");
const ApiError = require("../utils/ApiError");

// The role named ADMIN grants full access, including managing admins, roles and customers.
const isSuperAdminRole = (role) => role?.name === Roles.ADM;

// Renaming or deleting the ADMIN role would lock every admin out, and a second ADMIN role would grant
// full access to whoever is given it.
const protectSuperAdminRole = (roleDoc, newName) => {
  if (isSuperAdminRole(roleDoc)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "The ADMIN role can't be renamed or deleted.");
  }
  if (typeof newName === "string" && newName.trim().toUpperCase() === Roles.ADM) {
    throw new ApiError(httpStatus.BAD_REQUEST, "There can only be one ADMIN role.");
  }
};

const createRole = async (reqBody) => {
  if (!reqBody.name || !reqBody.abbreviation) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Name and Abbreviation both needed.");
  }
  protectSuperAdminRole(null, reqBody.name);

  const roleObj = {
    name: reqBody.name,
    abbreviation: reqBody.abbreviation,
  };
  const roleDoc = await Role.create(roleObj);
  if (!roleDoc) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create new Role"
    );
  }
  return roleDoc ? true : false;
};

const updateRole = async (reqBody) => {
  const roleDoc = await Role.findOne({
    where: { id: reqBody.role_id },
  });
  let temp = [];
  if (!roleDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Role not found");
  }
  protectSuperAdminRole(roleDoc, reqBody.name);
  if (
    reqBody.name &&
    typeof reqBody.name !== "undefined" &&
    reqBody.name !== ""
  ) {
    roleDoc["name"] = reqBody.name;
    temp.push(1);
  }
  if (
    reqBody.abbreviation &&
    typeof reqBody.abbreviation !== "undefined" &&
    reqBody.abbreviation !== ""
  ) {
    roleDoc["abbreviation"] = reqBody.abbreviation;
    temp.push(2);
  }
  if (temp.length > 0 && temp.length < 2)
    throw new ApiError(
      httpStatus.NOT_FOUND,
      "Name and Abbreviation both needed."
    );
  await roleDoc.save();
  return roleDoc ? roleDoc : {};
};



const findRoleById = async (id) => {
  const result = await Role.findOne({ where: { id: id } });
  if (!result) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Data not found");
  }
  return result;
};

const getAllRoles = async () => {
  const roleDoc = await Role.findAll({ where: { is_active: 1 } });
  if (!roleDoc) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create new Role."
    );
  }
  return roleDoc;
};

const deleteRole = async (reqBody) => {
  const roleDoc = await Role.findOne({
    where: { id: reqBody.role_id },
  });
  if (!roleDoc) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Role not found");
  }
  protectSuperAdminRole(roleDoc);
  if (await Admin.count({ where: { role_id: roleDoc.id } })) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Move this role's admins to another role first.");
  }
  await Role.destroy({ where: { id: reqBody.role_id, is_active: true } });
  return roleDoc;
};

module.exports = {
  isSuperAdminRole,
  findRoleById,
  createRole,
  getAllRoles,
  deleteRole,
  updateRole,
};
