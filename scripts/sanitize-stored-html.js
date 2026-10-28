// Cleans rich-text HTML saved before the API sanitized it on save, so the website and admin panel
// never render a stored script. Reports what would change; pass --apply to write the cleaned HTML.
//   node scripts/sanitize-stored-html.js [--apply]
const sanitizeHtml = require("sanitize-html");

const sequelize = require("../src/config/central.db");
const { Blogs, AiStory, BannerContent, CardContent } = require("../src/models");
const SectionContent = require("../src/models/sectionContent.model");
const { RICH_TEXT, sanitizeRichText } = require("../src/utils/sanitizeHtml");

const FIELDS = [
  [Blogs, "description"],
  [AiStory, "description"],
  [BannerContent, "banner_content"],
  [SectionContent, "section_content"],
  [CardContent, "card_content"],
];

// The same HTML with nothing removed, written out the same way. It differs from the sanitized HTML only
// where something would be taken out, so rows that would just be re-formatted (&nbsp;, <br />) are left alone.
const KEEP_EVERYTHING = {
  ...RICH_TEXT,
  allowedTags: false,
  allowedAttributes: false,
  allowedSchemesAppliedToAttributes: [],
  allowVulnerableTags: true,
};
const needsCleaning = (html) => Boolean(html) && sanitizeRichText(html) !== sanitizeHtml(html, KEEP_EVERYTHING);

const main = async () => {
  const apply = process.argv.includes("--apply");

  for (const [Model, field] of FIELDS) {
    const rows = await Model.findAll({ attributes: ["id", field], paranoid: false });
    const changed = rows.filter((row) => needsCleaning(row[field]));
    console.log(`${Model.tableName}.${field}: ${changed.length} of ${rows.length} rows ${apply ? "cleaned" : "have something to remove"}`);

    if (apply) {
      for (const row of changed) {
        await Model.update(
          { [field]: sanitizeRichText(row[field]) },
          { where: { id: row.id }, paranoid: false, hooks: false, silent: true }
        );
      }
    }
  }
  if (!apply) console.log("Nothing was written. Run again with --apply to save the cleaned HTML.");
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
