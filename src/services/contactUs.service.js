const httpStatus = require("http-status");
const slugify = require("slugify");

const { ContactUs } = require("../models");
const ApiError = require("../utils/ApiError");

const createContactUs = async (reqBody) => {
  const contactObj = {
    email: reqBody.email,
    address: reqBody.address,
    mobile: reqBody.mobile,
  };
  const contactDoc = await ContactUs.create(contactObj);
  if (!contactDoc) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "|=> Failed to create contact us <=|"
    );
  }
  return contactDoc ? true : false;
};

const findContactById = async (id) => {
  const contactDoc = await ContactUs.findByPk(id);
  return contactDoc ? contactDoc : [];
};

const getAllContactUs = async () => {
  const contactUsDoc = await ContactUs.findAll({
    attributes: ["id", "email", "address", "mobile"],
    where: { is_active: true },
  });
  if (!contactUsDoc) {
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, "Data Not Found.");
  }
  return contactUsDoc;
};

const updateContact = async (reqBody, id) => {
  const contactDoc = await ContactUs.findByPk(id);

  if (!contactDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, "Contact not found");
  }
  if (
    reqBody.email &&
    typeof reqBody.email !== "undefined" &&
    reqBody.email !== ""
  ) {
    contactDoc["email"] = reqBody.email;
  }
  if (
    reqBody.address &&
    typeof reqBody.address !== "undefined" &&
    reqBody.address !== ""
  ) {
    contactDoc["address"] = reqBody.address;
  }
  if (
    reqBody.mobile &&
    typeof reqBody.mobile !== "undefined" &&
    reqBody.mobile !== ""
  ) {
    contactDoc["mobile"] = reqBody.mobile;
  }

  await contactDoc.save();
  return contactDoc ? contactDoc : {};
};

const deleteContact = async (id) => {
  const contact = await ContactUs.findByPk(id);
  if (!contact) {
    throw new ApiError(httpStatus.NOT_FOUND, "Contact Details not found");
  }
  await contact.destroy();
};

module.exports = {
  createContactUs,
  getAllContactUs,
  findContactById,
  updateContact,
  deleteContact,
};
