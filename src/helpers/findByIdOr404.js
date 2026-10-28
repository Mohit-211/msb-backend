const { status: httpStatus } = require("http-status");

const ApiError = require("../utils/ApiError");

// Looks a record up by id. An unknown id is a 404 rather than a 200 with an empty object, and a missing id
// gets the same answer instead of a database error.
const findByIdOr404 = async (Model, id, label, options = {}) => {
  const doc = id === undefined || id === null || id === ""
    ? null
    : await Model.findOne({ ...options, where: { id } });
  if (!doc) {
    throw new ApiError(httpStatus.NOT_FOUND, `${label} not found`);
  }
  return doc;
};

module.exports = findByIdOr404;
