const { status: httpStatus } = require("http-status");
const ApiError = require("../utils/ApiError");
const slugify = require("slugify");
const { AiStory } = require("../models");
const { generateStoryFromTitle, generateShortStory } = require('../utils/rag-story-generator/generator')

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
        console.log(error);
        throw new ApiError(
            httpStatus.INTERNAL_SERVER_ERROR,
            "Failed to create New Story"
        );
    }
};

const getStoryHistory = async (body) => {
    const { user } = body;

    try {
        let storyDocs = await AiStory.findAll({
            where: { created_by: user.id, is_active: true, is_user_saved: true },
        });
        if (!storyDocs) {
            throw new ApiError(
                httpStatus.INTERNAL_SERVER_ERROR,
                "Failed to get history"
            );
        }
        return storyDocs;

    } catch (error) {
        console.log(error);
        throw new ApiError(
            httpStatus.INTERNAL_SERVER_ERROR,
            "Failed to get Story history"
        );
    }
};

const saveStory = async (body) => {
    const { user, title, input, description } = body;

    if (!title || !input || !description) {
        throw new ApiError(
            httpStatus.INTERNAL_SERVER_ERROR,
            "Please provide required fields: title, input, description"
        );
    }

    try {
        let slug = slugify(input, { lower: true });
        let storyDoc = await AiStory.findOne({
            where: { slug: slug, is_active: true, created_by: user.id },
        });
        if (!storyDoc) {
            throw new ApiError(
                httpStatus.INTERNAL_SERVER_ERROR,
                "Failed to get story"
            );
        }
        storyDoc.is_user_saved = !storyDoc.is_user_saved;
        storyDoc.heading = title;
        await storyDoc.save()
        return storyDoc;

    } catch (error) {
        console.log(error);
        throw new ApiError(
            httpStatus.INTERNAL_SERVER_ERROR,
            "Failed to get Story history"
        );
    }
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
        console.log(error);
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
    generateSortStory,
};