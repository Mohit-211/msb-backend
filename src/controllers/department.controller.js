const httpStatus = require("http-status");

const catchAsync = require("../utils/catchAsync");
const { departmentService } = require("../services");
const sendApiResponse = require("../config/responseWrapper");

const createDepartment = catchAsync(async (req, res) => {
  await departmentService.createDepartment(req.body);

  res.status(httpStatus.CREATED).send({
    code: httpStatus.CREATED,
    message: "New Role Created Successfully.",
    data: "",
  });
});

const updateDepartment = catchAsync(async (req, res) => {
  const departmentDoc = await departmentService.updateDepartment(
    req.body,
    req.params.id
  );
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: "Department Update Successfully",
    data: departmentDoc ? departmentDoc : {},
  });
});

const findDepartmentById = catchAsync(async (req, res) => {
  const departmentDoc = await departmentService.findDepartmentById(
    req.params.id
  );
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: departmentDoc ? "Success" : "Failed",
    data: departmentDoc ? departmentDoc : {},
  });
});

const getAllDeparments = catchAsync(async (req, res) => {
  const departments = await departmentService.getAllDeparments();
  res.status(httpStatus.OK).send({
    code: httpStatus.OK,
    message: departments ? "Success" : "Failed",
    data: departments,
  });
});

const deleteDepartment = catchAsync(async (req, res) => {
  await departmentService.deleteDepartment(req.params.id);
  res.status(httpStatus.OK).send({
    code: httpStatus.NO_CONTENT,
    message: "Delete Successfull.",
    data: "",
  });
});

module.exports = {
  getAllDeparments,
  createDepartment,
  updateDepartment,
  findDepartmentById,
  deleteDepartment,
};
