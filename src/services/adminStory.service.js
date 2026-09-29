/** @format */

const httpStatus = require("http-status");
const ApiError = require("../utils/ApiError");
const { AiStory, Blogs, BlogCategory, User,Category,BlogAttachment } = require("../models");
const { Op } = require("sequelize");

const getAllGeneratedStories = async () => {
	try {
		let storyDocs = await AiStory.findAll({
			where: { is_active: true },
			include: [
				{
					model: User,
					as: "generated_by",
					attributes: ["id", "email", "name"],
				},
				{
					model: Blogs,
					as: "ai_stoies_blog",
					attributes: ["id"], // only include blog ID
				},
			],
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

const getStoryById = async (id) => {
	try {
		let storyDocs = await AiStory.findOne({
			where: { id: id, is_active: true },
			include: [
				{
					model: User,
					as: "generated_by",
					attributes: ["id", "email", "name"],
				},
			],
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

const makeGeneratedStoryLive = async (reqBody, id, files) => {
	const { heading, categories = [], status, type } = reqBody;

	try {
		const storyDoc = await AiStory.findOne({
			where: { id: id, is_active: true },
		});

		if (!storyDoc) {
			throw new ApiError(httpStatus.NOT_FOUND, "Story not found");
		}

		// Update heading always
		if (heading) storyDoc.heading = heading;

		// Save updated heading and posted flag
		if (status) {
			storyDoc.is_posted = status === "published";
		}
		await storyDoc.save();

		// If status is not published, stop here
		if (status !== "published") {
			return { message: "Story updated without publishing" };
		}

		// Check for existing blog with same ai_story_id
		let blogDoc = await Blogs.findOne({
			where: { ai_story_id: id },
		});

		// If blog exists with same ai_story_id, update it
		if (blogDoc) {
			blogDoc.heading = storyDoc.heading;
			blogDoc.description = storyDoc.description;
			blogDoc.type = type;
			await blogDoc.save();

			// Update categories (delete existing and add new)
			await BlogCategory.destroy({ where: { blog_id: blogDoc.id } });

			for (const catId of categories) {
				const categoryObj = await Category.findOne({ where: { id: catId } });
				if (categoryObj) {
					await BlogCategory.create({
						blog_id: blogDoc.id,
						category_id: categoryObj.id,
						category_slug: categoryObj.slug,
						category_name: categoryObj.title,
					});
				}
			}
		} else {
			// Check for duplicate blog with same heading from different AI story
			const duplicateHeading = await Blogs.findOne({
				where: {
					heading: storyDoc.heading,
					ai_story_id: { [Op.ne]: id }, // only check for others
				},
			});

			if (duplicateHeading) {
				throw new ApiError(
					httpStatus.BAD_REQUEST,
					"Blog with this title already exists"
				);
			}

			// Create new blog
			blogDoc = await Blogs.create({
				heading: storyDoc.heading,
				description: storyDoc.description,
				type,
				ai_story_id: id,
			});

			for (const catId of categories) {
				const categoryObj = await Category.findOne({ where: { id: catId } });
				if (categoryObj) {
					await BlogCategory.create({
						blog_id: blogDoc.id,
						category_id: categoryObj.id,
						category_slug: categoryObj.slug,
						category_name: categoryObj.title,
					});
				}
			}
		}

		// Upload attachments
		if (files?.images?.length) {
			for (let currImage of files.images) {
				await BlogAttachment.create({
					blog_id: blogDoc.id,
					file_type: "Image",
					file_name: currImage.filename,
					file_uri: "/images",
					file_size: currImage.size,
				});
			}
		}

		if (files?.videos?.length) {
			for (let currVideo of files.videos) {
				await BlogAttachment.create({
					blog_id: blogDoc.id,
					file_type: "Video",
					file_name: currVideo.filename,
					file_uri: "/videos",
					file_size: currVideo.size,
				});
			}
		}

		if (files?.docs?.length) {
			for (let currDoc of files.docs) {
				await BlogAttachment.create({
					blog_id: blogDoc.id,
					file_type: "Document",
					file_name: currDoc.filename,
					file_uri: "/docs",
					file_size: currDoc.size,
				});
			}
		}

		return blogDoc;
	} catch (error) {
		console.log(error);
		throw new ApiError(
			httpStatus.INTERNAL_SERVER_ERROR,
			"Failed to make story live"
		);
	}
};

module.exports = {
	getAllGeneratedStories,
	getStoryById,
	makeGeneratedStoryLive,
};
