const httpStatus = require("http-status");

const catchAsync = require("../utils/catchAsync");
const pick = require("../utils/pick");
const responseWrapper = require("../config/responseWrapper");
const { storyGenerateService } = require("../services");


const generateNewStory = catchAsync(async (req, res) => {
    const body = pick(req.body, ["user", "input", "title"]);
    let result = await storyGenerateService.generateNewStory(body);
    responseWrapper(res, result, 'Story Generated Successfully', httpStatus.CREATED)
});
const getStoryHistory = catchAsync(async (req, res) => {
    const body = pick(req.body, ["user"]);
    let result = await storyGenerateService.getStoryHistory(body);
    responseWrapper(res, result)
});
const saveStory = catchAsync(async (req, res) => {
    const body = pick(req.body, ["user", "title", "input", "description"]);
    let result = await storyGenerateService.saveStory(body);
    responseWrapper(res, result, result.is_user_saved ? 'Story saved' : 'Story un-saved')
});
const generateSortStory = catchAsync(async (req, res) => {
    const body = pick(req.body, ["user", "title", "input", "description"]);
    let result = await storyGenerateService.generateSortStory(body);
    responseWrapper(res, result, 'Story Generated Successfully', httpStatus.CREATED)
});

module.exports = {
    generateNewStory,
    getStoryHistory,
    saveStory,
    generateSortStory,
}