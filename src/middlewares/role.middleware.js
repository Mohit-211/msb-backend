const httpStatus = require("http-status");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { Sequelize, QueryTypes, Op } = require("sequelize");
const moment = require("moment");
const randomize = require("randomatic");
const jwt = require("jsonwebtoken");

const sequelize = require("../config/central.db");
const { Admin, Role, Department } = require("../models");
const validateEmail = require("../helpers/validateEmail");
const validatePassword = require("../helpers/validatePassword");
const tokenTypes = require("../config/tokens");
const catchAsync = require("../utils/catchAsync");
const ApiError = require("../utils/ApiError");

const { roleService } = require("../services");
const config = require("../config/config");
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

const isSubAdmin = catchAsync(async (req, res, next) => {
  const roleDoc = await roleService.findRoleById(req.user.id);
  if (
    roleDoc &&
    (roleDoc.name === Roles.SUP_ADM || roleDoc.name === Roles.ADM)
  ) {
    next();
  } else {
    return res
      .status(httpStatus.UNAUTHORIZED)
      .send(
        httpStatus.UNAUTHORIZED,
        "|=> You are not authorized to access this api <=|"
      );
  }
});

const isAdmin = catchAsync(async (req, res, next) => {
  const roleDoc = await roleService.findRoleById(req.user.id);
  if (
    roleDoc &&
    (roleDoc.name === Roles.SUP_ADM ||
      roleDoc.name === Roles.ADM ||
      roleDoc.name === Roles.SUB_ADM)
  ) {
    next();
  } else {
    return res
      .status(httpStatus.UNAUTHORIZED)
      .send(
        httpStatus.UNAUTHORIZED,
        "|=> You are not authorized to access this api <=|"
      );
  }
});

const isEngineer = catchAsync(async (req, res, next) => {
  const roleDoc = await roleService.findRoleById(req.user.id);
  if (
    roleDoc &&
    (roleDoc.name === Roles.SUP_ADM ||
      roleDoc.name === Roles.ADM ||
      roleDoc.name === Roles.SUB_ADM ||
      roleDoc.name === Roles.ENG)
  ) {
    return res
      .status(httpStatus.UNAUTHORIZED)
      .send(
        httpStatus.UNAUTHORIZED,
        "|=> You are not authorized to access this api <=|"
      );
  }
  next();
});

const isEditor = catchAsync(async (req, res, next) => {
  const roleDoc = await roleService.findRoleById(req.user.id);
  if (
    roleDoc &&
    (roleDoc.name === Roles.SUP_ADM ||
      roleDoc.name === Roles.ADM ||
      roleDoc.name === Roles.SUB_ADM ||
      roleDoc.name === Roles.ENG ||
      roleDoc.name === Roles.EDTR)
  ) {
    next();
  } else {
    return res
      .status(httpStatus.UNAUTHORIZED)
      .send(
        httpStatus.UNAUTHORIZED,
        "|=> You are not authorized to access this api <=|"
      );
  }
});

module.exports = {
  isSuperAdmin,
  isSubAdmin,
  isAdmin,
  isEngineer,
  isEditor,
};
