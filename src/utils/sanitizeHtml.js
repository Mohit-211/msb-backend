const { status: httpStatus } = require("http-status");
const sanitizeHtml = require("sanitize-html");

const ApiError = require("./ApiError");

const SIZE = /^\d+(\.\d+)?(px|%|em|rem)$/;

// What the admin panel's editor (Tiptap with StarterKit, Image and Table) produces. Everything else,
// including scripts, event handlers and javascript: links, is dropped before the HTML is stored.
const RICH_TEXT = {
  allowedTags: [
    "p", "br", "hr", "h1", "h2", "h3", "h4", "h5", "h6",
    "strong", "b", "em", "i", "u", "s", "del", "mark", "code", "pre", "blockquote",
    "ul", "ol", "li", "a", "img", "span", "div",
    "table", "colgroup", "col", "thead", "tbody", "tfoot", "tr", "th", "td",
  ],
  allowedAttributes: {
    "*": ["style"],
    a: ["href", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    col: ["span"],
    th: ["colspan", "rowspan", "colwidth"],
    td: ["colspan", "rowspan", "colwidth"],
  },
  allowedStyles: {
    "*": { "text-align": [/^(left|right|center|justify)$/] },
    table: { width: [SIZE], "min-width": [SIZE] },
    col: { width: [SIZE], "min-width": [SIZE] },
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  // The editor embeds pasted images as data: URLs.
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => ({ tagName, attribs: { ...attribs, rel: "noopener noreferrer nofollow" } }),
  },
};

// Leaves null and undefined alone, so an omitted field stays omitted.
const sanitizeRichText = (html) => (html == null ? html : sanitizeHtml(String(html), RICH_TEXT));

// Links stored for the site must be web addresses or site paths; a javascript: URL runs when clicked.
const isSafeUrl = (url) =>
  typeof url === "string" && (/^https?:\/\/[^\s]+$/i.test(url.trim()) || /^\/(?!\/)\S*$/.test(url.trim()));

const assertSafeUrl = (url, field) => {
  if (url === undefined || url === null || url === "") return;
  if (!isSafeUrl(url)) {
    throw new ApiError(httpStatus.BAD_REQUEST, `${field} must be an http(s) address or a path on this site`);
  }
};

module.exports = {
  RICH_TEXT,
  sanitizeRichText,
  isSafeUrl,
  assertSafeUrl,
};
