const httpStatus = require("http-status");

const catchAsync = require("../utils/catchAsync");
const { faqService } = require("../services");
const responseWrapper = require("../config/responseWrapper");

const createFaq = catchAsync(async (req, res) => {
  await faqService.createFaq(req.body);

  res.status(httpStatus.CREATED).send({
    code: httpStatus.CREATED,
    message: "New FAQ Created Successfully.",
    data: "",
  });
});

const findFaqById = catchAsync(async (req, res) => {
  const contactDoc = await faqService.findFaqById(req.params.id);
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: contactDoc ? "Success" : "Failed",
    data: contactDoc ? contactDoc : {},
  });
});

const getAllFaq = catchAsync(async (req, res) => {
  const faqs = await faqService.getAllFaq();
  return responseWrapper(res, faqs, "", httpStatus.OK);
});

const updateFaq = catchAsync(async (req, res) => {
  const contactDoc = await faqService.updateFaq(
    req.body,
    req.params.id
  );
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: "Department Update Successfully",
    data: contactDoc ? contactDoc : {},
  });
});

const deleteFaq = catchAsync(async (req, res) => {
  await faqService.deleteFaq(req.params.id);
  res.status(httpStatus.OK).send({
    code: httpStatus.NO_CONTENT,
    message: "Delete Successfull.",
    data: "",
  });
});

module.exports = {
  createFaq,
  getAllFaq,
  findFaqById,
  updateFaq,
  deleteFaq
};
