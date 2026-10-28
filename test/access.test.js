// Access rules (signed out, trial, free, paid), admin flows, and the audit fixes.
// Runs against the real app on in-memory SQLite, with email and OpenAI stubbed. Start it with `npm test`.
const path = require("path"), fs = require("fs"), os = require("os"), Module = require("module"), { execFileSync } = require("child_process");
const appDir = process.argv[2] || path.resolve(__dirname, "..");
const nm = (p) => require(path.join(appDir, "node_modules", p));
const inject = (rel, exports) => { const f = require.resolve(path.join(appDir, rel)); const m = new Module(f); m.filename = f; m.loaded = true; m.exports = exports; require.cache[f] = m; };

const { Sequelize } = nm("sequelize");
const sequelize = new Sequelize({ dialect: "sqlite", storage: ":memory:", logging: false, dialectModule: nm("sqlite3") });
inject("src/config/central.db.js", sequelize);
const mails = [];
inject("src/services/email.service.js", {
  sendForgotPasswordOTP: async (to, otp) => { mails.push({ type: "otp", to, otp }); },
  sendResetPasswordConfirmationMail: async (to) => { mails.push({ type: "reset", to }); return true; },
  sendUserCredentials: async (to, password) => { mails.push({ type: "userCreds", to, password }); return true; },
  sendAdminCredentials: async (to, password) => { mails.push({ type: "adminCreds", to, password }); return true; },
});
inject("src/config/openAi.js", { chat: { completions: { create: async () => ({ choices: [{ message: { content: "She opened the cafe at dawn." } }] }) } } });

const app = require(path.join(appDir, "app.js"));
const M = require(path.join(appDir, "src/models"));
const { Role, Admin, User, Blogs, Category, BlogCategory, AiStory, BlogAttachment, OTP, BannerContent } = M;
const jwt = nm("jsonwebtoken");
const bcrypt = nm("bcryptjs");
const DAY = 24 * 60 * 60 * 1000;

(async () => {
  await sequelize.sync();
  const hash = (p) => bcrypt.hashSync(p, 4);
  const superRole = await Role.create({ name: "ADMIN", abbreviation: "ADM" });
  const editorRole = await Role.create({ name: "SUB-ADMIN", abbreviation: "SUB" });
  const superAdmin = await Admin.create({ name: "Super", email_id: "super@msb.test", password: hash("SuperPass12"), role_id: superRole.id });
  const editor = await Admin.create({ name: "Editor", email_id: "editor@msb.test", password: hash("EditorPass12"), role_id: editorRole.id });
  const adminToken = (admin) => jwt.sign({ id: admin.id }, process.env.ADMIN_JWT_SECRET, { algorithm: "HS256", expiresIn: "1h" });
  const SUPER = adminToken(superAdmin), EDITOR = adminToken(editor);

  // A user in the trial, one whose trial ended, and a paid user whose trial ended long ago.
  const trial = await User.create({ name: "Tina", email: "trial@msb.test", password: hash("TrialPass12") });
  const expired = await User.create({ name: "Ed", email: "expired@msb.test", password: hash("ExpiredPass12"), created_at: new Date(Date.now() - 4 * DAY) });
  const paid = await User.create({ name: "Pat", email: "paid@msb.test", password: hash("PaidPass12"), payment_status: "SUBSCRIBED", created_at: new Date(Date.now() - 40 * DAY) });

  const fiction = await Category.create({ title: "Fiction", slug: "fiction" });
  const life = await Category.create({ title: "Life", slug: "life" });
  const link = (blog, cat) => BlogCategory.create({ blog_id: blog.id, category_id: cat.id, category_slug: cat.slug, category_name: cat.title });
  const PAID_TEXT = "<p>" + "Secret paid chapter &amp; more. ".repeat(20) + "</p>";
  const freeStory = await Blogs.create({ heading: "Free story", description: "<p>Everyone can read this.</p>", type: "UNPAID", created_by: superAdmin.id });
  const paidStory = await Blogs.create({ heading: "Paid story", description: PAID_TEXT, type: "PAID", created_by: superAdmin.id });
  const hiddenStory = await Blogs.create({ heading: "Hidden story", description: "<p>Unpublished.</p>", type: "UNPAID", is_active: false, created_by: superAdmin.id });
  await link(freeStory, fiction); await link(paidStory, fiction); await link(paidStory, life); await link(hiddenStory, fiction);

  const server = app.listen(0); await new Promise((r) => server.on("listening", r));
  const base = `http://127.0.0.1:${server.address().port}/api/v1`;
  const call = async (method, p, { token, json, form } = {}) => {
    const headers = {}; let body;
    if (token) headers["x-access-token"] = token;
    if (json !== undefined) { headers["content-type"] = "application/json"; body = JSON.stringify(json); }
    if (form) body = form;
    const res = await fetch(base + p, { method, headers, body });
    const text = await res.text(); let data; try { data = JSON.parse(text); } catch { data = text; }
    return { status: res.status, data, text };
  };
  let pass = 0, fail = 0;
  const group = (name) => console.log(`\n${name}`);
  const check = (name, ok, detail = "") => { ok ? pass++ : fail++; console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "   -> " + detail}`); };
  const short = (v) => JSON.stringify(v)?.slice(0, 160);
  let res;

  const login = async (email, password) => (await call("POST", "/auth/login", { json: { email, password } })).data?.data;
  const trialLogin = await login("trial@msb.test", "TrialPass12");
  const TRIAL = trialLogin?.tokens?.access?.token;
  const EXPIRED = (await login("expired@msb.test", "ExpiredPass12"))?.tokens?.access?.token;
  const PAID = (await login("paid@msb.test", "PaidPass12"))?.tokens?.access?.token;

  group("Plans");
  check("login reports a new user's trial", trialLogin?.access?.plan === "trial" && trialLogin.access.can_read_paid_stories === true, short(trialLogin?.access));
  res = await call("GET", "/user/profile", { token: EXPIRED });
  check("after 3 days the profile says free, with no paid stories or saving", res.data?.data?.access?.plan === "free" && res.data.data.access.can_save_stories === false, short(res.data?.data?.access));
  res = await call("GET", "/user/profile", { token: PAID });
  check("a user marked as paid has the paid plan", res.data?.data?.access?.plan === "paid" && res.data.data.access.can_read_paid_stories === true, short(res.data?.data?.access));
  const trialEnd = new Date(res.data?.data?.access?.trial_ends_at).getTime() - new Date(paid.created_at).getTime();
  check("the trial lasts 3 days from account creation", Math.abs(trialEnd - 3 * DAY) < 1000, String(trialEnd));

  group("Signing in");
  for (const [m, p, json] of [["POST", "/user/get-blog-from-category", { category_slug: "fiction" }], ["GET", "/user/blog/search?query=Paid"], ["GET", `/blog/${freeStory.id}`], ["POST", `/blog/${freeStory.id}`]]) {
    res = await call(m, p, { json });
    check(`signed out, ${m} ${p.split("?")[0].replace(/\/\d+$/, "/:id")} is refused, even for a free story`, res.status === 401, `${res.status}`);
  }
  res = await call("GET", `/blog/${freeStory.id}`, { token: "not-a-token" });
  check("a bad token is refused too", res.status === 401, `${res.status}`);

  group("Paid stories");
  const listFor = async (token, slug = "fiction") => (await call("POST", "/user/get-blog-from-category", { token, json: { category_slug: slug } })).data?.data;
  const find = (list, id) => list?.rows?.find((b) => b.id === id);
  let list = await listFor(EXPIRED);
  let p = find(list, paidStory.id), f = find(list, freeStory.id);
  check("free accounts see paid stories in lists, locked", p?.is_locked === true && !p.description.includes("<p>") && p.description.length <= 201, short(p?.description));
  check("the teaser keeps entities whole and ends with an ellipsis", p?.description.endsWith("…") && !/&[a-z]*…$/.test(p.description), short(p?.description.slice(-20)));
  check("free accounts read free stories in full", f?.is_locked === false && f.description === "<p>Everyone can read this.</p>");
  check("unpublished stories aren't listed", !find(list, hiddenStory.id) && list?.count === 2, `count ${list?.count}`);
  check("a story in two categories lists both", find(list, paidStory.id)?.Categories?.length === 2, short(find(list, paidStory.id)?.Categories));
  check("trial: paid story open", find(await listFor(TRIAL), paidStory.id)?.description === PAID_TEXT);
  check("paid user: paid story open", find(await listFor(PAID), paidStory.id)?.is_locked === false);
  res = await call("POST", "/user/get-blog-from-category?limit=1&page=2", { token: TRIAL, json: { category_slug: "all" } });
  check("paging works: page 2 of 1", res.data?.data?.rows?.length === 1 && res.data.data.count === 2 && res.data.data.rows[0].id === paidStory.id, short(res.data?.data?.rows?.map((r) => r.id)));
  res = await call("GET", `/blog/${paidStory.id}`, { token: EXPIRED });
  check("story page by GET, free account: locked teaser", res.status === 200 && res.data?.data?.is_locked === true && res.data.data.description.length <= 201 && res.data.data.heading === "Paid story", short(res.data?.data));
  res = await call("POST", `/blog/${paidStory.id}`, { token: TRIAL });
  check("story page by POST, trial: full story", res.data?.data?.is_locked === false && res.data.data.description === PAID_TEXT);
  res = await call("GET", `/blog/${hiddenStory.id}`, { token: TRIAL });
  check("an unpublished story is 404", res.status === 404, `${res.status}`);
  res = await call("GET", `/user/blog/search?query=Paid`, { token: EXPIRED });
  check("search locks paid stories too", res.data?.data?.length === 1 && res.data.data[0].is_locked === true, short(res.data?.data));
  res = await call("GET", `/user/blog/search?query=Life`, { token: TRIAL });
  check("search finds stories by category name", res.data?.data?.some((b) => b.id === paidStory.id), short(res.data?.data?.map((b) => b.id)));

  group("Likes, comments and views");
  res = await call("POST", "/blog/like", { token: EXPIRED, json: { blog_id: paidStory.id } });
  check("expired trial can't like a paid story", res.status === 403, `${res.status}`);
  res = await call("POST", "/blog/like", { token: EXPIRED, json: { blog_id: freeStory.id } });
  check("…but can like a free one", res.status === 200, `${res.status}`);
  res = await call("POST", "/blog/comment", { token: EXPIRED, json: { blog_id: paidStory.id, comment: "Nice" } });
  check("expired trial can't comment on a paid story", res.status === 403, `${res.status}`);
  res = await call("POST", "/blog/comment", { token: TRIAL, json: { blog_id: paidStory.id, comment: "Nice" } });
  check("trial can comment on a paid story", res.status === 200, `${res.status}`);
  res = await call("POST", "/blog/comment", { token: TRIAL, json: { blog_id: freeStory.id, comment: "  " } });
  check("an empty comment is refused", res.status === 400, `${res.status}`);
  const views = async () => (await Blogs.findByPk(freeStory.id)).views_count;
  const v0 = await views();
  await call("POST", `/user/markBlogAsViewed?blog_id=${freeStory.id}`, { token: TRIAL });
  await call("POST", `/user/markBlogAsViewed?blog_id=${freeStory.id}`, { token: TRIAL });
  check("a reader counts as one view, however often they open it", (await views()) === v0 + 1, `${v0} -> ${await views()}`);
  res = await call("POST", `/user/markBlogAsViewed?blog_id=${paidStory.id}`, { token: EXPIRED });
  check("no view is counted for a story the reader can't open", res.status === 403, `${res.status}`);

  group("AI stories");
  res = await call("POST", "/story", { token: TRIAL, json: { input: "A day at the market" } });
  const trialStory = res.data?.data;
  check("trial user generates a story", res.status === 201 && trialStory?.id, `${res.status}`);
  res = await call("PUT", "/story", { token: TRIAL, json: { title: "Market day", input: "A day at the market", story_id: trialStory?.id } });
  check("trial user saves it", res.status === 200 && res.data?.data?.is_user_saved === true, `${res.status} ${short(res.data)}`);
  res = await call("POST", "/story", { token: EXPIRED, json: { input: "A rainy commute" } });
  const expiredStory = res.data?.data;
  check("after the trial, generating still works", res.status === 201, `${res.status}`);
  res = await call("PUT", "/story", { token: EXPIRED, json: { title: "Commute", input: "A rainy commute", story_id: expiredStory?.id } });
  check("…but saving is refused", res.status === 403 && /trial has ended/.test(res.data?.message), `${res.status} ${short(res.data)}`);
  const oldSaved = await AiStory.create({ input: "Old saved", heading: "Old saved", description: "<p>x</p>", created_by: expired.id, is_user_saved: true });
  res = await call("GET", `/story/${oldSaved.id}`, { token: EXPIRED });
  check("stories saved during the trial still open afterwards", res.status === 200 && res.data?.data?.id === oldSaved.id, `${res.status}`);
  res = await call("PUT", "/story", { token: EXPIRED, json: { title: "Old saved", story_id: oldSaved.id } });
  check("and can still be removed", res.status === 200 && res.data?.data?.is_user_saved === false, `${res.status}`);
  res = await call("GET", `/story/${trialStory?.id}`, { token: EXPIRED });
  check("another user's saved story is 404", res.status === 404, `${res.status}`);
  res = await call("GET", "/story/getAllGeneratedStories", { token: TRIAL });
  check("a user can't reach the admin story list through /story/:id", res.status === 401, `${res.status}`);
  await call("POST", "/story", { token: TRIAL, json: { input: "Twice told" } });
  const newer = (await call("POST", "/story", { token: TRIAL, json: { input: "Twice told" } })).data?.data;
  res = await call("PUT", "/story", { token: TRIAL, json: { title: "Twice", input: "Twice told" } });
  check("saving by prompt picks the newest story", res.data?.data?.id === newer?.id, `${res.data?.data?.id} vs ${newer?.id}`);
  res = await call("GET", "/story?limit=1&page=1", { token: TRIAL });
  check("saved stories can be paged", res.data?.data?.length === 1, short(res.data?.data?.length));

  group("Admin: customers");
  const form = (fields) => { const f = new FormData(); for (const [k, v] of Object.entries(fields)) [].concat(v).forEach((x) => f.append(k, x)); return f; };
  res = await call("POST", "/admin/createUser", { token: SUPER, form: form({ name: "New", email: "new@msb.test", payment_status: "SUBSCRIBED" }) });
  const created = await User.findOne({ where: { email: "new@msb.test" } });
  check("PAID/UNPAID chosen on Add Customer is saved", res.status === 200 && created?.payment_status === "SUBSCRIBED", `${res.status} ${created?.payment_status}`);
  check("the created customer comes back without the password hash", res.data?.data?.email === "new@msb.test" && !("password" in (res.data?.data || {})), short(res.data?.data));
  res = await call("POST", "/admin/createUser", { token: SUPER, form: form({ name: "Bad", email: "bad@msb.test", payment_status: "MAYBE" }) });
  check("an unknown payment status is refused", res.status === 400, `${res.status}`);
  res = await call("POST", "/admin/updatepaymentStatus", { token: SUPER, json: { user_id: paid.id, payment_status: "UNSUBSCRIBED" } });
  check("payment status can be set back to unpaid", res.status === 200 && (await User.findByPk(paid.id)).payment_status === "UNSUBSCRIBED", `${res.status}`);
  check("…and the paid story locks for that user", find(await listFor(PAID), paidStory.id)?.is_locked === true);
  res = await call("POST", "/admin/updatepaymentStatus", { token: SUPER, json: { user_id: paid.id } });
  check("without a status it marks the user paid, as before", (await User.findByPk(paid.id)).payment_status === "SUBSCRIBED", `${res.status}`);
  res = await call("POST", "/admin/updateUserStatus", { token: SUPER, json: { user_id: trial.id, user_status: "DEACTIVATE" } });
  check("DEACTIVATE switches a customer off", res.status === 200 && res.data?.data?.user_status === "DEACTIVATE", `${res.status} ${short(res.data)}`);
  res = await call("GET", "/user/profile", { token: TRIAL });
  check("…and signs them out everywhere", res.status !== 200, `${res.status}`);
  res = await call("POST", "/auth/login", { json: { email: "trial@msb.test", password: "TrialPass12" } });
  check("…and they can't sign in", res.status === 401, `${res.status}`);
  res = await call("GET", "/admin/getAllUsers", { token: SUPER });
  const listed = res.data?.data?.find((u) => u.id === trial.id);
  check("deactivated customers stay in the customer list", listed?.user_status === "DEACTIVATE" && listed.access?.plan === "trial", short(listed && { s: listed.user_status, a: listed.access }));
  res = await call("POST", "/admin/updateUserStatus", { token: SUPER, json: { user_id: trial.id, user_status: "ACTIVATE" } });
  check("ACTIVATE switches them back on", res.status === 200 && (await call("POST", "/auth/login", { json: { email: "trial@msb.test", password: "TrialPass12" } })).status === 200, `${res.status}`);
  res = await call("POST", "/admin/updateUserStatus", { token: SUPER, json: { user_id: trial.id, user_status: "toString" } });
  check("an unknown user_status is refused", res.status === 400, `${res.status}`);
  res = await call("POST", "/admin/updateUserStatus", { token: EDITOR, json: { user_id: trial.id, user_status: "DEACTIVATE" } });
  check("a sub-admin can't change customers (403)", res.status === 403, `${res.status}`);
  res = await call("GET", "/admin/getUserCount", { token: EDITOR });
  check("a sub-admin's Dashboard can load the user count", res.status === 200, `${res.status}`);
  res = await call("GET", `/admin/getUserById?id=${trial.id}`, { token: SUPER });
  check("customer details include the plan", res.data?.data?.access?.plan === "trial", short(res.data?.data?.access));

  group("Admin: AI stories");
  const unsaved = await AiStory.create({ input: "Never saved", heading: "Never saved", description: "<p>x</p>", created_by: trial.id });
  res = await call("GET", "/story/getAllGeneratedStories", { token: EDITOR });
  const ids = (res.data?.data || []).map((s) => s.id);
  check("admins see saved stories, not every generation", ids.includes(trialStory?.id) && !ids.includes(unsaved.id), short(ids));
  const pubForm = (fields) => form({ status: "published", ...fields });
  res = await call("POST", `/story/makeGeneratedStoryLive/${trialStory?.id}`, { token: EDITOR, form: pubForm({ heading: "Market Day", description: "<p>Edited by admin<script>alert(1)</script><img src=x onerror=alert(1)></p>", type: "PAID", "categories[]": [String(fiction.id)] }) });
  let blog = await Blogs.findOne({ where: { ai_story_id: trialStory?.id } });
  check("publishing creates the story with the admin's edits", res.status === 200 && blog?.heading === "Market Day" && blog.description.includes("Edited by admin"), `${res.status} ${short(res.data)}`);
  check("…with scripts and event handlers removed", blog && !/script|onerror/i.test(blog.description), short(blog?.description));
  check("…marked PAID as chosen", blog?.type === "PAID");
  check("…in the chosen category", (await BlogCategory.findAll({ where: { blog_id: blog?.id } })).map((l) => l.category_id).join() === String(fiction.id));
  res = await call("GET", `/story/getStoryById/${trialStory?.id}`, { token: EDITOR });
  check("the edit page gets the published categories", res.data?.data?.categories?.[0]?.id === fiction.id && res.data.data.is_posted === true, short(res.data?.data?.categories));
  res = await call("POST", `/story/makeGeneratedStoryLive/${trialStory?.id}`, { token: EDITOR, form: pubForm({ type: "UNPAID" }) });
  check("publishing again updates the same story", (await Blogs.count({ where: { ai_story_id: trialStory?.id } })) === 1 && (await Blogs.findByPk(blog.id)).type === "UNPAID", `${res.status}`);
  res = await call("POST", `/story/makeGeneratedStoryLive/${trialStory?.id}`, { token: EDITOR, form: form({ status: "not_published" }) });
  check("unpublishing takes it off the site", (await Blogs.findByPk(blog.id)).is_active === false && !find(await listFor(PAID, "all"), blog.id), `${res.status}`);
  res = await call("POST", `/story/makeGeneratedStoryLive/${trialStory?.id}`, { token: EDITOR, form: pubForm({}) });
  check("publishing again brings it back", (await Blogs.findByPk(blog.id)).is_active === true, `${res.status}`);
  res = await call("POST", `/story/makeGeneratedStoryLive/${trialStory?.id}`, { token: EDITOR, form: pubForm({ type: "FREE" }) });
  check("a type other than PAID or UNPAID is refused", res.status === 400, `${res.status}`);
  res = await call("POST", `/story/makeGeneratedStoryLive/${trialStory?.id}`, { token: EDITOR, form: pubForm({ heading: "Free story" }) });
  check("a title already used by an admin-written story is refused", res.status === 400 && (await Blogs.findByPk(blog.id)).heading === "Market Day", `${res.status}`);
  res = await call("POST", `/story/makeGeneratedStoryLive/${trialStory?.id}`, { token: EDITOR, form: pubForm({ heading: "x".repeat(151) }) });
  check("publishing with a title over 150 characters is a 400, and nothing changes", res.status === 400 && (await Blogs.findByPk(blog.id)).heading === "Market Day" && (await AiStory.findByPk(trialStory.id)).heading !== "x".repeat(151), `${res.status}`);
  res = await call("POST", `/story/makeGeneratedStoryLive/999999`, { token: EDITOR, form: pubForm({}) });
  check("an unknown AI story is 404, not 500", res.status === 404, `${res.status}`);

  group("Admin: stories");
  res = await call("POST", "/blog/createBlog", { token: EDITOR, json: { heading: "JSON cats", description: "<p onclick=x>Hi<script>x()</script></p>", type: "UNPAID", categories: [fiction.id, life.id] } });
  const jsonBlog = await Blogs.findOne({ where: { heading: "JSON cats" } });
  check("categories can be a JSON array", res.status === 200 && (await BlogCategory.count({ where: { blog_id: jsonBlog?.id } })) === 2, `${res.status} ${short(res.data)}`);
  check("story HTML is sanitized on create", jsonBlog?.description === "<p>Hi</p>", short(jsonBlog?.description));
  res = await call("POST", "/blog/createBlog", { token: EDITOR, json: { heading: "Ghost", description: "<p>x</p>", type: "UNPAID", categories: "999" } });
  check("an unknown category is refused and nothing is left behind", res.status === 400 && (await Blogs.count({ where: { heading: "Ghost" } })) === 0, `${res.status}`);
  const catsOf = async (id) => (await BlogCategory.findAll({ where: { blog_id: id } })).map((l) => l.category_id).sort().join();
  res = await call("PUT", "/blog/updateBlog", { token: EDITOR, form: form({ blog_id: String(jsonBlog?.id), heading: "JSON cats 2" }) });
  check("editing without categories keeps them (no crash)", res.status === 200 && (await catsOf(jsonBlog.id)) === [fiction.id, life.id].sort().join(), `${res.status} ${await catsOf(jsonBlog?.id)}`);
  res = await call("PUT", "/blog/updateBlog", { token: EDITOR, json: { blog_id: jsonBlog?.id, categories: "" } });
  check("an empty category list removes them all", res.status === 200 && (await catsOf(jsonBlog.id)) === "", `${res.status}`);
  res = await call("PUT", "/blog/updateBlog", { token: EDITOR, json: { blog_id: jsonBlog?.id, categories: `${life.id}` } });
  check("a comma list sets them", res.status === 200 && (await catsOf(jsonBlog.id)) === String(life.id), await catsOf(jsonBlog?.id));
  res = await call("PUT", "/blog/updateBlog", { token: EDITOR, json: { blog_id: jsonBlog?.id, heading: "Changed", categories: "999" } });
  check("a failed edit changes nothing", res.status === 400 && (await Blogs.findByPk(jsonBlog.id)).heading === "JSON cats 2", `${res.status} ${(await Blogs.findByPk(jsonBlog.id)).heading}`);
  res = await call("POST", "/blog/createBlog", { token: EDITOR, json: { heading: "y".repeat(151), description: "<p>x</p>", type: "UNPAID", categories: [fiction.id] } });
  check("a story title over 150 characters is a 400, not a database error", res.status === 400, `${res.status}`);
  res = await call("PUT", "/blog/updateBlog", { token: EDITOR, json: { blog_id: jsonBlog?.id, heading: "z".repeat(151) } });
  check("…on edit too", res.status === 400, `${res.status}`);
  res = await call("PUT", "/blog/updateBlog", { token: EDITOR, json: { blog_id: jsonBlog?.id, type: "FREE" } });
  check("an unknown story type is refused", res.status === 400, `${res.status}`);

  group("Uploads");
  const upload = (blob, name, field = "images") => form({ heading: `Up ${name} ${Math.random()}`, description: "<p>x</p>", type: "UNPAID", categories: String(fiction.id), [field]: [] }) ;
  const withFile = (field, blob, name) => { const f = upload(); f.append(field, blob, name); return f; };
  res = await call("POST", "/blog/createBlog", { token: EDITOR, form: withFile("images", new Blob([Buffer.from("fakejpeg")], { type: "image/jpeg" }), "blob") });
  let att = res.data?.data?.id && await BlogAttachment.findOne({ where: { blog_id: res.data.data.id } });
  check("a compressed image named \"blob\" is accepted and saved as .jpg", res.status === 200 && /\.jpg$/.test(att?.file_name), `${res.status} ${att?.file_name} ${short(res.data)}`);
  res = await call("POST", "/blog/createBlog", { token: EDITOR, form: withFile("images", new Blob([Buffer.from("webp")], { type: "image/webp" }), "photo.webp") });
  check("WebP images are accepted", res.status === 200, `${res.status}`);
  res = await call("POST", "/blog/createBlog", { token: EDITOR, form: withFile("videos", new Blob([Buffer.from("mov")], { type: "video/quicktime" }), "clip.mov") });
  att = res.data?.data?.id && await BlogAttachment.findOne({ where: { blog_id: res.data.data.id } });
  check(".mov videos are accepted", res.status === 200 && /\.mov$/.test(att?.file_name), `${res.status} ${att?.file_name}`);
  res = await call("POST", "/blog/createBlog", { token: EDITOR, form: withFile("images", new Blob(["<svg onload=alert(1)>"], { type: "image/svg+xml" }), "x.svg") });
  check("SVG is refused", res.status === 400, `${res.status}`);

  group("Admins and roles");
  res = await call("GET", "/admin/getAdminProfile", { token: SUPER });
  check("the profile tells the panel what a super admin can manage", res.data?.data?.is_super_admin === true && res.data.data.permissions.includes("admins"), short(res.data?.data?.permissions));
  res = await call("GET", "/admin/getAdminProfile", { token: EDITOR });
  check("…and what a sub-admin can", res.data?.data?.is_super_admin === false && !res.data.data.permissions.includes("customers") && res.data.data.permissions.includes("stories"), short(res.data?.data?.permissions));
  res = await call("POST", "/admin/register", { token: SUPER, form: form({ name: "Second", email: "second@msb.test", role_id: String(editorRole.id) }) });
  const second = await Admin.findOne({ where: { email_id: "second@msb.test" } });
  check("a super admin can add admins", res.status === 200 && second?.role_id === editorRole.id, `${res.status}`);
  res = await call("PUT", "/admin/updateAdmin", { token: SUPER, form: form({ admin_id: String(second?.id), name: "Second", email: "renamed@msb.test", role_id: String(editorRole.id) }) });
  check("editing an admin's email saves it", res.status === 200 && (await Admin.findByPk(second.id)).email_id === "renamed@msb.test", `${res.status}`);
  res = await call("PUT", "/admin/updateAdmin", { token: SUPER, form: form({ admin_id: String(second?.id), email: "editor@msb.test" }) });
  check("an email another admin has is refused", res.status === 400, `${res.status}`);
  res = await call("PUT", "/admin/updateAdmin", { token: SUPER, form: form({ admin_id: String(superAdmin.id), role_id: String(editorRole.id) }) });
  check("a super admin can't change their own role", res.status === 400 && (await Admin.findByPk(superAdmin.id)).role_id === superRole.id, `${res.status}`);
  res = await call("PUT", "/admin/updateAdmin", { token: SUPER, form: form({ admin_id: "99999", name: "x" }) });
  check("editing an unknown admin is 404, not a crash", res.status === 404, `${res.status}`);
  res = await call("DELETE", "/admin/deleteAdmin", { token: SUPER, json: { admin_id: superAdmin.id } });
  check("a super admin can't delete themselves", res.status === 400 && (await Admin.findByPk(superAdmin.id)) !== null, `${res.status}`);
  res = await call("PUT", "/role/editRole", { token: SUPER, form: form({ role_id: String(superRole.id), name: "OWNER", abbreviation: "OWN" }) });
  check("the ADMIN role can't be renamed", res.status === 400 && (await Role.findByPk(superRole.id)).name === "ADMIN", `${res.status}`);
  res = await call("PUT", "/role/editRole", { token: SUPER, form: form({ role_id: String(editorRole.id), name: "admin", abbreviation: "ADM2" }) });
  check("no other role can become ADMIN", res.status === 400, `${res.status}`);
  res = await call("DELETE", "/role/deleteRole", { token: SUPER, json: { role_id: superRole.id } });
  check("the ADMIN role can't be deleted", res.status === 400, `${res.status}`);
  res = await call("DELETE", "/role/deleteRole", { token: SUPER, json: { role_id: editorRole.id } });
  check("a role that still has admins can't be deleted", res.status === 400, `${res.status}`);
  res = await call("POST", "/role/create", { token: SUPER, form: form({ name: "Admin", abbreviation: "AD" }) });
  check("a second ADMIN role can't be created", res.status === 400, `${res.status}`);
  res = await call("POST", "/admin/change-password", { token: EDITOR, json: { old_password: "EditorPass12", new_password: "short", confirm_password: "short" } });
  check("admin passwords follow the password policy", res.status === 400, `${res.status}`);
  res = await call("POST", "/admin/change-password", { token: EDITOR, json: { old_password: "EditorPass12", new_password: "Editor2Pass34", confirm_password: "Editor2Pass34" } });
  check("…and a policy-compliant change works", res.status === 200, `${res.status}`);

  group("Home page content");
  res = await call("POST", "/content/createCardContent", { token: EDITOR, form: form({ card_content: "<p>x</p>", redirection_url: "javascript:alert(1)" }) });
  check("a javascript: link is refused", res.status === 400, `${res.status}`);
  res = await call("POST", "/content/createBannerContent", { token: EDITOR, form: form({ banner_content: "<h1>Hi</h1><iframe src=evil></iframe><a href=\"javascript:x\">x</a>" }) });
  const banner = await BannerContent.findOne({ order: [["id", "DESC"]] });
  check("banner HTML is sanitized", res.status === 200 && banner?.banner_content === "<h1>Hi</h1><a rel=\"noopener noreferrer nofollow\">x</a>", short(banner?.banner_content));

  group("Forgot password");
  await call("POST", "/auth/otp", { json: { email: "expired@msb.test", type: "forget_password" } });
  await OTP.update({ code: "045678" }, { where: { email: "expired@msb.test", is_active: true }, hooks: false, validate: false });
  res = await call("POST", "/auth/forgot-password", { json: { email: "expired@msb.test", otp: 45678, password: "Expired2Pass34", confirm_password: "Expired2Pass34" } });
  check("a code sent as a number with its leading zero dropped still works, and confirm_password is accepted", res.status === 200, `${res.status} ${short(res.data)}`);

  group("Counts, deletes and admin lists");
  const real = async (id) => ({ likes: await M.BlogLike.count({ where: { blog_id: id, is_active: true } }), comments: await M.BlogComment.count({ where: { blog_id: id, is_active: true } }) });
  const stored = async (id) => { const b = await Blogs.findByPk(id, { paranoid: false }); return { likes: b.likes_count, comments: b.comment_count }; };
  const counted = async (id) => JSON.stringify(await stored(id)) === JSON.stringify(await real(id));
  const counts = async (id) => JSON.stringify([await stored(id), await real(id)]);
  await call("POST", "/blog/like", { token: PAID, json: { blog_id: freeStory.id } });
  check("a like is counted once", await counted(freeStory.id), await counts(freeStory.id));
  await call("POST", "/blog/like", { token: PAID, json: { blog_id: freeStory.id } });
  check("an unlike is counted too", await counted(freeStory.id), await counts(freeStory.id));
  res = await call("POST", "/blog/comment", { token: PAID, json: { blog_id: freeStory.id, comment: "Lovely" } });
  res = await call("DELETE", "/blog/deleteCommentByAdmin", { token: EDITOR, json: { comment_id: res.data?.data?.id } });
  check("an admin deleting a comment lowers the count", res.status === 200 && (await counted(freeStory.id)), await counts(freeStory.id));

  const gone = await User.create({ name: "Gone", email: "gone@msb.test", password: hash("GonePass12") });
  const GONE = (await login("gone@msb.test", "GonePass12"))?.tokens?.access?.token;
  await call("POST", "/blog/like", { token: GONE, json: { blog_id: freeStory.id } });
  await call("POST", "/blog/comment", { token: GONE, json: { blog_id: freeStory.id, comment: "Bye" } });
  await call("POST", `/user/markBlogAsViewed?blog_id=${freeStory.id}`, { token: GONE });
  res = await call("DELETE", "/admin/deleteUser", { token: SUPER, json: { user_id: gone.id } });
  const leftOver = (await M.BlogLike.count({ where: { user_id: gone.id } })) + (await M.BlogComment.count({ where: { user_id: gone.id } })) + (await M.BlogViews.count({ where: { user_id: gone.id } }));
  check("deleting a customer removes all their likes, comments and views", res.status === 200 && leftOver === 0, `${res.status} ${leftOver}`);
  check("…recounts the stories they touched", await counted(freeStory.id), await counts(freeStory.id));
  check("…and ends their sessions", (await call("GET", "/user/profile", { token: GONE })).status !== 200);

  const liveAi = await Blogs.findOne({ where: { ai_story_id: trialStory?.id } });
  await call("POST", "/blog/comment", { token: PAID, json: { blog_id: liveAi.id, comment: "Nice" } });
  res = await call("DELETE", "/blog/deleteBlog", { token: EDITOR, json: { blog_id: liveAi.id } });
  const attached = (await BlogCategory.count({ where: { blog_id: liveAi.id } })) + (await M.BlogComment.count({ where: { blog_id: liveAi.id } })) + (await BlogAttachment.count({ where: { blog_id: liveAi.id } }));
  check("deleting a story removes its categories, comments and attachments", res.status === 200 && attached === 0, `${res.status} ${attached}`);
  check("…and its AI story shows as unpublished again", (await AiStory.findByPk(trialStory.id)).is_posted === false);

  await call("POST", "/admin/updatepaymentStatus", { token: SUPER, json: { user_id: paid.id, payment_status: "UNSUBSCRIBED" } });
  await call("POST", "/admin/updatepaymentStatus", { token: SUPER, json: { user_id: paid.id, payment_status: "SUBSCRIBED" } });
  const drift = Math.abs(new Date((await User.findByPk(paid.id)).updated_at).getTime() - Date.now());
  check(`updated_at matches the clock with the server on ${process.env.TZ || "its own"} time`, drift < 60 * 1000, `${Math.round(drift / 60000)} minutes off`);

  res = await call("GET", "/admin/getAllUsers?search=paid@&limit=1&page=1", { token: SUPER });
  check("the customer list can be searched and paged", res.data?.data?.count === 1 && res.data.data.rows[0]?.email === "paid@msb.test", short(res.data?.data));
  res = await call("GET", "/admin/getAllUsers", { token: SUPER });
  check("…and without paging returns everyone, as before", Array.isArray(res.data?.data) && res.data.data.length === (await User.count()), `${res.data?.data?.length} vs ${await User.count()}`);
  res = await call("GET", "/blog/getAllBlogs?limit=2", { token: EDITOR });
  check("the admin story list pages", res.data?.data?.rows?.length === 2 && res.data.data.count > 2, short({ count: res.data?.data?.count }));
  res = await call("GET", "/story/getAllGeneratedStories?limit=1", { token: EDITOR });
  check("so does the admin AI story list", res.data?.data?.rows?.length === 1 && res.data.data.count >= 1, short({ count: res.data?.data?.count }));

  await User.create({ name: "=1+2", email: "formula@msb.test", password: hash("FormulaPass12") });
  const csvRes = await fetch(`${base}/admin/exportUsers`, { headers: { "x-access-token": SUPER } });
  const csv = new TextDecoder("utf-8", { ignoreBOM: true }).decode(new Uint8Array(await csvRes.arrayBuffer()));
  check("customers export as CSV that Excel reads as UTF-8", csvRes.status === 200 && /text\/csv/.test(csvRes.headers.get("content-type")) && csv.startsWith("﻿\"ID\",\"Name\""), `${csvRes.status} ${csvRes.headers.get("content-type")}`);
  check("…with formula-like names defused", csv.includes("\"'=1+2\"") && !csv.includes(",\"=1+2\""), csv.split("\r\n").find((l) => l.includes("formula@")));
  res = await call("GET", "/admin/exportUsers", { token: EDITOR });
  check("…for ADMIN-role admins only", res.status === 403, `${res.status}`);

  res = await call("GET", "/admin/getDashboardStats", { token: EDITOR });
  const stats = res.data?.data;
  check("one dashboard request gives every count, and the plans add up", res.status === 200 && stats.users.active === stats.users.paid + stats.users.trial + stats.users.free && stats.usersByMonth.length === 12 && typeof stats.stories === "number", short(stats?.users));
  res = await call("GET", "/admin/getUserCountByMonth", { token: EDITOR });
  check("users by month works without MySQL-only SQL", res.status === 200 && res.data?.data?.length === 12, `${res.status}`);
  res = await call("GET", "/category/getCategoryBySlug?slug=fiction");
  check("a category can be looked up by slug", res.status === 200 && res.data?.data?.id === fiction.id, `${res.status}`);
  res = await call("GET", "/category/getCategoryBySlug?slug=nope");
  check("…and an unknown slug is 404", res.status === 404, `${res.status}`);
  res = await call("GET", "/user/profile");
  check("error replies say success: false", res.status === 401 && res.data?.success === false, short(res.data));

  group("Cleaning HTML stored before this change");
  const dbFile = path.join(os.tmpdir(), `msb-sanitize-${process.pid}.sqlite`);
  const preload = path.join(os.tmpdir(), `msb-preload-${process.pid}.js`);
  fs.writeFileSync(preload, `const path=require("path"),Module=require("module");const appDir=${JSON.stringify(appDir)};const {Sequelize}=require(path.join(appDir,"node_modules/sequelize"));const s=new Sequelize({dialect:"sqlite",storage:${JSON.stringify(dbFile)},logging:false,dialectModule:require(path.join(appDir,"node_modules/sqlite3"))});const f=require.resolve(path.join(appDir,"src/config/central.db.js"));const m=new Module(f);m.filename=f;m.loaded=true;m.exports=s;require.cache[f]=m;`);
  const env = { ...process.env };
  const runScript = (args) => execFileSync(process.execPath, ["-r", preload, path.join(appDir, "scripts/sanitize-stored-html.js"), ...args], { cwd: appDir, env, encoding: "utf8" });
  const seed = `const path=require("path");const M=require(path.join(${JSON.stringify(appDir)},"src/models"));(async()=>{await require(path.join(${JSON.stringify(appDir)},"src/config/central.db.js")).sync();await M.Blogs.create({heading:"Old",description:"<p>ok</p><script>steal()</script>",type:"UNPAID"});await M.Blogs.create({heading:"Clean",description:"<p>fine</p>",type:"UNPAID"});await M.Blogs.create({heading:"Format",description:"<p>A&nbsp;B<br></p>",type:"UNPAID"});})();`;
  execFileSync(process.execPath, ["-r", preload, "-e", seed], { cwd: appDir, env });
  const dry = runScript([]);
  check("the dry run counts only rows with something to remove, and writes nothing", /blogs\.description: 1 of 3 rows have something to remove/.test(dry), dry.split("\n")[0]);
  const applied = runScript(["--apply"]);
  const descOf = (heading) => execFileSync(process.execPath, ["-r", preload, "-e", `const path=require("path");const M=require(path.join(${JSON.stringify(appDir)},"src/models"));M.Blogs.findOne({where:{heading:${JSON.stringify(heading)}}}).then(b=>console.log(b.description))`], { cwd: appDir, env, encoding: "utf8" }).trim();
  check("--apply cleans the stored HTML", /1 of 3 rows cleaned/.test(applied) && descOf("Old") === "<p>ok</p>", descOf("Old"));
  check("rows that would only be re-formatted are left exactly as they were", descOf("Format") === "<p>A&nbsp;B<br></p>", descOf("Format"));

  group("Recounting stored counts");
  const runRecount = (args) => execFileSync(process.execPath, ["-r", preload, path.join(appDir, "scripts/recount-story-counts.js"), ...args], { cwd: appDir, env, encoding: "utf8" });
  const seedCounts = `const path=require("path");const M=require(path.join(${JSON.stringify(appDir)},"src/models"));(async()=>{const u=await M.User.create({name:"R",email:"r@x.test"});const clean=await M.Blogs.findOne({where:{heading:"Clean"}});const fmt=await M.Blogs.findOne({where:{heading:"Format"}});await M.Blogs.update({likes_count:5,views_count:9},{where:{id:clean.id}});await M.BlogLike.create({user_id:u.id,blog_id:fmt.id});await M.BlogComment.create({user_id:u.id,blog_id:fmt.id,comment:"hi"});})();`;
  execFileSync(process.execPath, ["-r", preload, "-e", seedCounts], { cwd: appDir, env });
  const countsOf = () => execFileSync(process.execPath, ["-r", preload, "-e", `const path=require("path");const M=require(path.join(${JSON.stringify(appDir)},"src/models"));M.Blogs.findAll({order:[["id","ASC"]]}).then(bs=>console.log(bs.map(b=>b.heading+"="+b.likes_count+"/"+b.comment_count+"/"+b.views_count).join(" ")))`], { cwd: appDir, env, encoding: "utf8" }).trim();
  const recountDry = runRecount([]);
  check("the recount dry run finds stories with wrong like or comment counts, and writes nothing", /^2 of 3 stories have a wrong like or comment count/.test(recountDry) && countsOf().includes("Clean=5/0/9"), recountDry.split("\n")[0] + " | " + countsOf());
  runRecount(["--apply"]);
  check("--apply corrects likes and comments and leaves views alone", countsOf() === "Old=0/0/0 Clean=0/0/9 Format=1/1/0", countsOf());
  fs.rmSync(dbFile, { force: true });

  fs.rmSync(dbFile, { force: true }); fs.rmSync(preload, { force: true });

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close(); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("HARNESS ERROR:", e); process.exit(2); });
