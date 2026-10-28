const { status: httpStatus } = require("http-status");

const { Admin, Role } = require("../models");
const Roles = require("../config/roles");
const ApiError = require("../utils/ApiError");
const findByIdOr404 = require("../helpers/findByIdOr404");
const filledIfSent = require("../helpers/filledIfSent");

// The role named ADMIN grants full access, including managing admins, roles and customers. Access is checked
// by that name, so the ADMIN role keeps it exactly and can't be deleted, as either would lock every admin out.
// Its abbreviation can change.
const isSuperAdminRole = (role) => role?.name === Roles.ADM;

// A second role named ADMIN would grant full access to whoever is given it.
const refuseSecondAdminRole = (name) => {
  if (typeof name === "string" && name.trim().toUpperCase() === Roles.ADM) {
    throw new ApiError(httpStatus.BAD_REQUEST, "There can only be one ADMIN role.");
  }
};

const createRole = async (reqBody) => {
  if (!reqBody.name || !reqBody.abbreviation) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Name and Abbreviation both needed.");
  }
  refuseSecondAdminRole(reqBody.name);

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
  const roleDoc = await findByIdOr404(Role, reqBody.role_id, "Role");
  const name = filledIfSent(reqBody, "name");
  const abbreviation = filledIfSent(reqBody, "abbreviation");

  if (name !== undefined) {
    if (isSuperAdminRole(roleDoc)) {
      // Sending the name it already has is fine, so the edit form can send every field.
      if (name.trim() !== Roles.ADM) {
        throw new ApiError(httpStatus.BAD_REQUEST, "The ADMIN role can't be renamed.");
      }
    } else {
      refuseSecondAdminRole(name);
      roleDoc["name"] = name;
    }
  }
  if (abbreviation !== undefined) {
    roleDoc["abbreviation"] = abbreviation;
  }
  await roleDoc.save();
  return roleDoc;
};

const findRoleById = async (id) => findByIdOr404(Role, id, "Role");

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
  const roleDoc = await findByIdOr404(Role, reqBody.role_id, "Role");
  if (isSuperAdminRole(roleDoc)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "The ADMIN role can't be deleted.");
  }
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
