/** @format */

const { status: httpStatus } = require("http-status");
const ApiError = require("../utils/ApiError");
const { AiStory, Blogs, User, Category } = require("../models");
const { Op } = require("sequelize");
const pageOf = require("../helpers/pageOf");
const parseCategoryIds = require("../helpers/parseCategoryIds");
const { sanitizeRichText } = require("../utils/sanitizeHtml");
const { STORY_TYPES, checkHeadingLength, setBlogCategories, saveAttachments } = require("./blog.service");

const isFilled = (value) => typeof value === "string" && value.trim() !== "";

// With ?limit= (and ?page=) the result is one page, as { count, rows }.
const getAllGeneratedStories = async (query = {}) => {
	// The stories users chose to save, plus any already published.
	const options = {
		where: {
			is_active: true,
			[Op.or]: [{ is_user_saved: true }, { is_posted: true }],
		},
		include: [
			{
				model: User,
				as: "generated_by",
				attributes: ["id", "email", "name"],
			},
			{
				model: Blogs,
				as: "ai_stoies_blog",
				attributes: ["id", "is_active"],
			},
		],
		order: [["id", "DESC"]],
	};
	if (query.limit) {
		return AiStory.findAndCountAll({ ...options, ...pageOf(query, 50), distinct: true });
	}
	return AiStory.findAll(options);
};

const getStoryById = async (id) => {
	const storyDoc = await AiStory.findOne({
		where: { id: id, is_active: true },
		include: [
			{
				model: User,
				as: "generated_by",
				attributes: ["id", "email", "name"],
			},
			{
				model: Blogs,
				as: "ai_stoies_blog",
				attributes: ["id", "type", "is_active"],
				include: [
					{
						model: Category,
						through: { attributes: [] },
						attributes: ["id", "title", "slug"],
					},
				],
			},
		],
	});
	if (!storyDoc) {
		throw new ApiError(httpStatus.NOT_FOUND, "Story not found");
	}

	// The edit page pre-selects the categories of the published story.
	const story = storyDoc.toJSON();
	story.categories = story.ai_stoies_blog?.[0]?.Categories ?? [];
	return story;
};

// Publishes a saved AI story as a regular story, or updates or unpublishes one that is already live.
// The admin can edit the title and text, and choose whether it is free (UNPAID) or PAID.
const makeGeneratedStoryLive = async (reqBody, id, files) => {
	const { heading, description, status, type, user } = reqBody;
	const categoryIds = parseCategoryIds(reqBody.categories);

	if (isFilled(type) && !STORY_TYPES.includes(type)) {
		throw new ApiError(httpStatus.BAD_REQUEST, "type must be PAID or UNPAID");
	}

	const storyDoc = await AiStory.findOne({
		where: { id: id, is_active: true },
	});
	if (!storyDoc) {
		throw new ApiError(httpStatus.NOT_FOUND, "Story not found");
	}

	// Without a status, edits go to the live copy if the story is already published.
	const publish = status ? status === "published" : storyDoc.is_posted;

	return AiStory.sequelize.transaction(async (transaction) => {
		if (isFilled(heading)) storyDoc.heading = heading.trim();
		if (isFilled(description)) storyDoc.description = sanitizeRichText(description);
		if (isFilled(type)) storyDoc.type = type;
		storyDoc.is_posted = publish;
		await storyDoc.save({ transaction });

		let blogDoc = await Blogs.findOne({
			where: { ai_story_id: storyDoc.id },
			transaction,
		});

		if (!publish) {
			// Unpublishing takes the story off the site; publishing again brings it back.
			if (blogDoc?.is_active) {
				blogDoc.is_active = false;
				await blogDoc.save({ transaction });
			}
			return { message: "Story updated without publishing" };
		}

		// AI story titles can be longer than a published story's; the admin shortens them before publishing.
		checkHeadingLength(storyDoc.heading);
		const duplicate = await Blogs.findOne({
			where: {
				heading: storyDoc.heading,
				...(blogDoc && { id: { [Op.ne]: blogDoc.id } }),
			},
			transaction,
		});
		if (duplicate) {
			throw new ApiError(httpStatus.BAD_REQUEST, "Blog with this title already exists");
		}

		const fields = {
			heading: storyDoc.heading,
			// Stories generated before the API escaped model output may hold raw HTML.
			description: sanitizeRichText(storyDoc.description),
			type: storyDoc.type,
			is_active: true,
		};
		if (blogDoc) {
			await blogDoc.update(fields, { transaction });
		} else {
			blogDoc = await Blogs.create(
				{ ...fields, ai_story_id: storyDoc.id, created_by: user?.id },
				{ transaction }
			);
		}

		if (categoryIds !== undefined) {
			await setBlogCategories(blogDoc.id, categoryIds, transaction);
		}
		await saveAttachments(blogDoc.id, files, transaction);
		return blogDoc;
	});
};

module.exports = {
	getAllGeneratedStories,
	getStoryById,
	makeGeneratedStoryLive,
};
