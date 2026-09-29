const httpStatus = require("http-status");

const { Role } = require("../models");
const ApiError = require("../utils/ApiError");

const createRole = async (reqBody) => {
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

// const deleteRole = async (id) => {
//   const roleDoc = await Role.findByPk(id);
//   if (!roleDoc) {
//     throw new ApiError(httpStatus.NOT_FOUND, "Role not found");
//   }
//   await roleDoc.destroy();
// };

const deleteRole = async (reqBody) => {
  const roleDoc = await Role.findOne({
    where: { id: reqBody.role_id },
  });
  if (!roleDoc) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Role not found");
  }
  await Role.destroy({ where: { id: reqBody.role_id, is_active: true } });
  return roleDoc;
};

module.exports = {
  findRoleById,
  createRole,
  getAllRoles,
  deleteRole,
  updateRole,
};
