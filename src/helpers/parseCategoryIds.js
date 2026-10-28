const { status: httpStatus } = require("http-status");

const ApiError = require("../utils/ApiError");

// Category ids arrive as an array (a JSON body, or multipart categories[]), a JSON array string, or a
// comma-separated string. undefined means the field wasn't sent, so callers can leave categories as they are.
const parseCategoryIds = (value) => {
  if (value === undefined || value === null) return undefined;

  let list = value;
  if (typeof value === "string") {
    const text = value.trim();
    if (text.startsWith("[")) {
      try {
        list = JSON.parse(text);
      } catch {
        list = [null];
      }
    } else {
      list = text === "" ? [] : text.split(",");
    }
  }
  if (!Array.isArray(list)) list = [list];

  const ids = list.map((id) => Number(String(id).trim()));
  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "categories must be a list of category ids");
  }
  return [...new Set(ids)];
};

module.exports = parseCategoryIds;
