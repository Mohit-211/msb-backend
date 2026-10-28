/** @format */

const responseWrapper = require("../config/responseWrapper");
const { adminStoryService } = require("../services");

const getAllGeneratedStories = async (req, res) => {
	let result = await adminStoryService.getAllGeneratedStories(req.query);
	responseWrapper(res, result);
};

const getStoryById = async (req, res) => {
    const storyDoc = await adminStoryService.getStoryById(
      req.params.id
    );
    return responseWrapper(res, storyDoc, "");
  };

  const makeGeneratedStoryLive = async (req, res) => {
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
};

module.exports = {
	getAllGeneratedStories,
    getStoryById,
	makeGeneratedStoryLive,
};
