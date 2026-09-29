const httpStatus = require("http-status");
const ApiError = require("../utils/ApiError");
const openai = require('../config/openAi')
const slugify = require("slugify");
const { AiStory } = require("../models");
const { generateStoryFromTitle, generateShortStory } = require('../utils/rag-story-generator/generator')

const generateNewStory = async (body) => {
    let { user, input } = body;
    if (!input) {
        throw new ApiError(
            httpStatus.BAD_REQUEST,
            "Please provide input and title"
        );
    }

    let storyObj = {
        created_by: user.id,
        input,
        heading: input,
    };

    try { 
        // let story = await storyGenerateText(input);   // Manual Prompt
        let story = await generateStoryFromTitle(input)  // Embeded
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

async function storyGenerateText(input) {
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `
                You are a story writer AI that creates real-world story (not fantasy) **realistic, grounded short stories** (250-350 words) based on **story titles only**.
                
                Instructions:
                - Only generate a story if the input is a valid **real-world title or scenario**.
                - If the input is a **question**, general topic, or irrelevant sentence (like "How do you project Indian economy?"), you should respond: 
                  "**I am a story writer AI. Please give a valid story title, not a question or topic.**"
                - Stories must be **set in realistic modern-day contexts** (no fantasy or fictional creatures).
                - Avoid casual greetings or dialogues like “Hi,” “Hello,” “How are you?”
                `.trim()
                },
                {
                    role: "user",
                    content: input, // the title-only input like "Girl opens a cafe in Manali"
                },
            ],
            temperature: 0.8,
            max_tokens: 900,
        });

        const sanitizedStory = sanitizeText(completion.choices[0].message.content);
        return sanitizedStory;

    } catch (err) {
        console.log(err);
        return null;
    }
}

function sanitizeText(text) {
    return text
        .split("\n")
        .filter(line => line.trim() !== "")
        .map(line => `<p>${line}</p>`)
        .join("");
}

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
    const { user, input, description, title } = body;
    if (!description || !input || !title) {
        throw new ApiError(
            httpStatus.BAD_REQUEST,
            "Please provide description, input, title"
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