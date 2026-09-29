const httpStatus = require("http-status");

const catchAsync = require("../utils/catchAsync");
const { contactUsService } = require("../services");
const responseWrapper = require("../config/responseWrapper");

const createContactUs = catchAsync(async (req, res) => {
  await contactUsService.createContactUs(req.body);

  res.status(httpStatus.CREATED).send({
    code: httpStatus.CREATED,
    message: "New Contact Us Created Successfully.",
    data: "",
  });
});

const findContactById = catchAsync(async (req, res) => {
  const contactDoc = await contactUsService.findContactById(req.params.id);
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: contactDoc ? "Success" : "Failed",
    data: contactDoc ? contactDoc : {},
  });
});

const getAllContactUs = catchAsync(async (req, res) => {
  const contactUs = await contactUsService.getAllContactUs();
  return responseWrapper(res, contactUs, "");
});

const updateContact = catchAsync(async (req, res) => {
  const contactDoc = await contactUsService.updateContact(
    req.body,
    req.params.id
  );
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: "Department Update Successfully",
    data: contactDoc ? contactDoc : {},
  });
});

const deleteContact = catchAsync(async (req, res) => {
    await contactUsService.deleteContact(req.params.id);
    res.status(httpStatus.OK).send({
      code: httpStatus.NO_CONTENT,
      message: "Delete Successfull.",
      data: "",
    });
  });

module.exports = {
  createContactUs,
  getAllContactUs,
  findContactById,
  updateContact,
  deleteContact
  
};
