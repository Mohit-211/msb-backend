const { status: httpStatus } = require("http-status");
const ApiError = require("../utils/ApiError");
const slugify = require("slugify");
const { AiStory } = require("../models");
const { hasFullAccess } = require("../utils/access");
const { generateStoryFromTitle, generateShortStory } = require('../utils/rag-story-generator/generator')
const logger = require("../config/logger");

// Each request is sent to OpenAI, so cap what a user can submit. Titles also become the 255-character slug.
const MAX_TITLE_LENGTH = 200;
const MAX_STORY_LENGTH = 5000;

const generateNewStory = async (body) => {
    let { user, input } = body;
    if (!input) {
        throw new ApiError(
            httpStatus.BAD_REQUEST,
            "Please provide input and title"
        );
    }
    if (typeof input !== "string" || input.length > MAX_TITLE_LENGTH) {
        throw new ApiError(
            httpStatus.BAD_REQUEST,
            `The story title can be at most ${MAX_TITLE_LENGTH} characters`
        );
    }

    let storyObj = {
        created_by: user.id,
        input,
        heading: input,
    };

    try {
        let story = await generateStoryFromTitle(input)
        if (!story) {
            throw new ApiError(
                httpStatus.INTERNAL_SERVER_ERROR,
                "Failed to generate story"
            );
        }
        storyObj['description'] = story;
        let storyDoc = await AiStory.create(storyObj);
        return storyDoc;

    } catch (error) {
        logger.error(error);
        throw new ApiError(
            httpStatus.INTERNAL_SERVER_ERROR,
            "Failed to create New Story"
        );
    }
};

// `page` is { limit, offset } when the site asks for one page, or {} for every saved story.
const getStoryHistory = async (body, page = {}) => {
    const { user } = body;

    try {
        let storyDocs = await AiStory.findAll({
            where: { created_by: user.id, is_active: true, is_user_saved: true },
            ...page,
        });
        if (!storyDocs) {
            throw new ApiError(
                httpStatus.INTERNAL_SERVER_ERROR,
                "Failed to get history"
            );
        }
        return storyDocs;

    } catch (error) {
        logger.error(error);
        throw new ApiError(
            httpStatus.INTERNAL_SERVER_ERROR,
            "Failed to get Story history"
        );
    }
};

const saveStory = async (body) => {
    const { user, title, input, story_id } = body;

    if (!title || (!story_id && !input)) {
        throw new ApiError(
            httpStatus.BAD_REQUEST,
            "Please provide required fields: title, and story_id or input"
        );
    }
    if (typeof title !== "string" || title.length > MAX_TITLE_LENGTH) {
        throw new ApiError(
            httpStatus.BAD_REQUEST,
            `The story title can be at most ${MAX_TITLE_LENGTH} characters`
        );
    }

    // By id when the site sends it; otherwise the newest story generated from this prompt.
    const storyDoc = story_id
        ? await AiStory.findOne({
            where: { id: story_id, is_active: true, created_by: user.id },
        })
        : await AiStory.findOne({
            where: { slug: slugify(String(input), { lower: true }), is_active: true, created_by: user.id },
            order: [["id", "DESC"]],
        });
    if (!storyDoc) {
        throw new ApiError(httpStatus.NOT_FOUND, "Story not found");
    }

    // Saving needs a trial or a paid plan. Removing a saved story is always allowed.
    if (!storyDoc.is_user_saved && !hasFullAccess(user)) {
        throw new ApiError(
            httpStatus.FORBIDDEN,
            "Your free trial has ended. Saving stories needs a paid plan."
        );
    }

    storyDoc.is_user_saved = !storyDoc.is_user_saved;
    storyDoc.heading = title;
    await storyDoc.save()
    return storyDoc;
};

// One of the user's saved stories, so the site can open it from a link.
const getSavedStory = async (body, id) => {
    const { user } = body;

    const storyDoc = /^\d+$/.test(String(id))
        ? await AiStory.findOne({
            where: { id, created_by: user.id, is_active: true, is_user_saved: true },
        })
        : null;
    if (!storyDoc) {
        throw new ApiError(httpStatus.NOT_FOUND, "Story not found");
    }
    return storyDoc;
};

const generateSortStory = async (body) => {
    const { input, description, title } = body;
    if (!description || !input || !title) {
        throw new ApiError(
            httpStatus.BAD_REQUEST,
            "Please provide description, input, title"
        );
    }
    if (typeof description !== "string" || description.length > MAX_STORY_LENGTH) {
        throw new ApiError(
            httpStatus.BAD_REQUEST,
            `The story can be at most ${MAX_STORY_LENGTH} characters`
        );
    }

    try { 
        let story = await generateShortStory(description) 
        if (!story) {
            throw new ApiError(
                httpStatus.INTERNAL_SERVER_ERROR,
                "Failed to generate short story"
            );
        }
        return {
            sortContent: story,
            longContent: description,
            title: title
        };

    } catch (error) {
        logger.error(error);
        throw new ApiError(
            httpStatus.INTERNAL_SERVER_ERROR,
            "Failed to create New Story"
        );
    }
};

module.exports = {
    generateNewStory,
    getStoryHistory,
    saveStory,
    getSavedStory,
    generateSortStory,
};