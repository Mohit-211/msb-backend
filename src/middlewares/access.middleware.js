const upload = require("../config/multer");
const { validateJWTtoken } = require("./admin.middleware");
const { verifyAuthJWTToken } = require("./auth.middleware");
const { isSuperAdmin } = require("./role.middleware");

// Authenticate before parsing multipart bodies, so anonymous requests can never write files to storage.
const adminAuth = [validateJWTtoken, upload];
const superAdminAuth = [validateJWTtoken, isSuperAdmin, upload];
const userAuth = [verifyAuthJWTToken, upload];

module.exports = {
  adminAuth,
  superAdminAuth,
  userAuth,
};
