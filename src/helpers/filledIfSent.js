const { status: httpStatus } = require("http-status");

const ApiError = require("../utils/ApiError");

// For edits. A field left out keeps its value, so this returns undefined. A field sent empty is refused:
// every text field the admin edits is required, and ignoring the empty value reported a change that never happened.
const filledIfSent = (body, field) => {
  const value = body[field];
  if (value === undefined) return undefined;
  const text = value === null ? "" : String(value);
  if (text.trim() === "") {
    throw new ApiError(httpStatus.BAD_REQUEST, `${field} can't be empty`);
  }
  return text;
};

module.exports = filledIfSent;
