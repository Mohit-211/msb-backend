const { status: httpStatus } = require("http-status");

const pageOf = require("../helpers/pageOf");
const pick = require("../utils/pick");
const responseWrapper = require("../config/responseWrapper");
const { storyGenerateService } = require("../services");


const generateNewStory = async (req, res) => {
    const body = pick(req.body, ["user", "input", "title"]);
    let result = await storyGenerateService.generateNewStory(body);
    responseWrapper(res, result, 'Story Generated Successfully', httpStatus.CREATED)
};
const getStoryHistory = async (req, res) => {
    const body = pick(req.body, ["user"]);
    // Every saved story unless the site asks for a page with ?limit=&page=.
    const page = req.query.limit ? pageOf(req.query, 15) : {};
    let result = await storyGenerateService.getStoryHistory(body, page);
    responseWrapper(res, result)
};
const saveStory = async (req, res) => {
    const body = pick(req.body, ["user", "title", "input", "description", "story_id"]);
    let result = await storyGenerateService.saveStory(body);
    responseWrapper(res, result, result.is_user_saved ? 'Story saved' : 'Story un-saved')
};
const getSavedStory = async (req, res) => {
    const body = pick(req.body, ["user"]);
    let result = await storyGenerateService.getSavedStory(body, req.params.id);
    responseWrapper(res, result)
};
const generateSortStory = async (req, res) => {
    const body = pick(req.body, ["user", "title", "input", "description"]);
    let result = await storyGenerateService.generateSortStory(body);
    responseWrapper(res, result, 'Story Generated Successfully', httpStatus.CREATED)
};

module.exports = {
    generateNewStory,
    getStoryHistory,
    saveStory,
    getSavedStory,
    generateSortStory,
}