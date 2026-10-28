// Recounts each story's likes and comments from their own tables, correcting totals saved before the API
// kept them exact. View counts are left as they are. Reports what would change; pass --apply to save.
//   node scripts/recount-story-counts.js [--apply]
const sequelize = require("../src/config/central.db");
const { Blogs, BlogLike, BlogComment } = require("../src/models");

const main = async () => {
  const apply = process.argv.includes("--apply");
  const blogs = await Blogs.findAll({ attributes: ["id", "likes_count", "comment_count"], paranoid: false });

  let changed = 0;
  for (const blog of blogs) {
    const likes = await BlogLike.count({ where: { blog_id: blog.id, is_active: true } });
    const comments = await BlogComment.count({ where: { blog_id: blog.id, is_active: true } });
    if (blog.likes_count === likes && blog.comment_count === comments) continue;

    changed++;
    if (apply) {
      await Blogs.update(
        { likes_count: likes, comment_count: comments },
        { where: { id: blog.id }, paranoid: false, silent: true, hooks: false }
      );
    }
  }

  console.log(`${changed} of ${blogs.length} stories ${apply ? "recounted" : "have a wrong like or comment count"}`);
  if (!apply) console.log("Nothing was written. Run again with --apply to save.");
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
