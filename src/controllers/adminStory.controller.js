/** @format */

const httpStatus = require("http-status");

const catchAsync = require("../utils/catchAsync");
const pick = require("../utils/pick");
const responseWrapper = require("../config/responseWrapper");
const { adminStoryService } = require("../services");

const getAllGeneratedStories = catchAsync(async (req, res) => {
	let result = await adminStoryService.getAllGeneratedStories();
	responseWrapper(res, result);
});


const getStoryById = catchAsync(async (req, res) => {
    const storyDoc = await adminStoryService.getStoryById(
      req.params.id
    );
    return responseWrapper(res, storyDoc, "");
  });

  const makeGeneratedStoryLive = catchAsync(async (req, res) => {
	const contentDoc = await adminStoryService.makeGeneratedStoryLive(
		req.body,
		req.params.id,
		req.files
	);
	return responseWrapper(
		res,
		contentDoc,
		req.body.status === "published"
			? "Story made live and blog created successfully"
			: "Story updated successfully"
	);
});


module.exports = {
	getAllGeneratedStories,
    getStoryById,
	makeGeneratedStoryLive,
};
