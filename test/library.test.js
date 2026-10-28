// What the e2e suites stub out: config validation, the OpenAI request, email failures and Express 5 errors.
// Runs against the real app on in-memory SQLite, with email and OpenAI stubbed. Start it with `npm test`.
const path = require("path"), Module = require("module");
const appDir = process.argv[2] || path.resolve(__dirname, "..");
const nm = (p) => require(path.join(appDir, "node_modules", p));
let failed = 0;
const check = (name, ok, detail = "") => { if (!ok) failed++; console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "   [" + detail + "]" : ""}`); };
const clear = () => { for (const k of Object.keys(require.cache)) if (k.startsWith(appDir) && !k.includes("node_modules")) delete require.cache[k]; };
const inject = (rel, exports) => { const f = require.resolve(path.join(appDir, rel)); const m = new Module(f); m.filename = f; m.loaded = true; m.exports = exports; require.cache[f] = m; };
const base = { NODE_ENV: "test", CENTRAL_MYSQL_HOST: "127.0.0.1", CENTRAL_MYSQL_USER: "x", CENTRAL_MYSQL_DB: "x", JWT_SECRET: "a".repeat(32), ADMIN_JWT_SECRET: "b".repeat(32), ACCESSDOMAINS: "http://localhost:3000" };
const withEnv = (env, fn) => { const keys = [...Object.keys(base), "OPENAI_KEY", "OPENAI_MODEL"]; const saved = Object.fromEntries(keys.map((k) => [k, process.env[k]])); keys.forEach((k) => delete process.env[k]); Object.assign(process.env, base, env); try { return fn(); } finally { keys.forEach((k) => (saved[k] === undefined ? delete process.env[k] : (process.env[k] = saved[k]))); } };
const loadConfig = (env) => withEnv(env, () => { clear(); try { return require(path.join(appDir, "src/config/config.js")); } catch (e) { return e; } });

(async () => {
  // Config: OPENAI_KEY is required now, OPENAI_MODEL defaults to gpt-4o.
  let c = loadConfig({});
  check("config refuses to start without OPENAI_KEY", c instanceof Error && /"OPENAI_KEY" is required/.test(c.message), c.message);
  c = loadConfig({ OPENAI_KEY: "" });
  check("config refuses an empty OPENAI_KEY", c instanceof Error && /OPENAI_KEY/.test(c.message), c.message);
  c = loadConfig({ OPENAI_KEY: "sk-test" });
  check("OPENAI_MODEL defaults to gpt-4o", c.OPENAI_MODEL === "gpt-4o", c.OPENAI_MODEL);
  c = loadConfig({ OPENAI_KEY: "sk-test", OPENAI_MODEL: "gpt-4.1" });
  check("OPENAI_MODEL can be overridden", c.OPENAI_MODEL === "gpt-4.1", c.OPENAI_MODEL);

  // OpenAI request parameters, captured by a stub client.
  const sent = [];
  await withEnv({ OPENAI_KEY: "sk-test" }, async () => {
    clear();
    inject("src/config/openAi.js", { chat: { completions: { create: async (p) => { sent.push(p); return { choices: [{ message: { content: "A story." } }] }; } } } });
    const gen = require(path.join(appDir, "src/utils/rag-story-generator/generator.js"));
    await gen.generateStoryFromTitle("A title");
    await gen.generateShortStory("A long story");
  });
  check("story request uses max_completion_tokens, not the deprecated max_tokens", sent[0] && sent[0].max_completion_tokens === 800 && !("max_tokens" in sent[0]), JSON.stringify({ model: sent[0]?.model, max_completion_tokens: sent[0]?.max_completion_tokens }));
  check("summary request uses max_completion_tokens 500 and the configured model", sent[1] && sent[1].max_completion_tokens === 500 && !("max_tokens" in sent[1]) && sent[1].model === "gpt-4o");
  // The real v7 client accepts these parameters (request built, then stopped before it leaves the machine).
  const OpenAI = nm("openai");
  let body;
  const client = new OpenAI({ apiKey: "sk-test", maxRetries: 0, fetch: async (url, init) => { body = JSON.parse(init.body); throw new Error("stop"); } });
  await client.chat.completions.create(sent[0]).catch(() => {});
  check("openai 7 sends max_completion_tokens in the request body", body && body.max_completion_tokens === 800 && body.model === "gpt-4o");

  // Email: failures now reach the caller.
  const loadEmail = (smtp) => { clear(); inject("src/config/config.js", { env: "test", email: { smtp, from: "noreply@msb.test" } }); return require(path.join(appDir, "src/services/email.service.js")); };
  let mail = loadEmail({ host: "127.0.0.1", port: 1, connectionTimeout: 1000 });
  const err = await mail.sendForgotPasswordOTP("alice@msb.test", "123456").then(() => null, (e) => e);
  check("reset-code email rejects when SMTP is unreachable", err && /ECONNREFUSED|ESOCKET|ECONNECTION/.test(err.code || err.message), err && (err.code || err.message));
  mail = loadEmail({ jsonTransport: true });
  const info = await mail.sendForgotPasswordOTP("alice@msb.test", "123456");
  check("reset-code email resolves with the message when sent", info && JSON.parse(info.message).html.includes("123456"));

  // Express 5 routes rejected promises from async handlers to the error handler (no catchAsync any more).
  clear();
  Object.assign(process.env, base, { OPENAI_KEY: "sk-test" });
  const { Sequelize } = nm("sequelize");
  const sequelize = new Sequelize({ dialect: "sqlite", storage: ":memory:", logging: false, dialectModule: nm("sqlite3") });
  inject("src/config/central.db.js", sequelize);
  inject("src/config/openAi.js", {});
  let unhandled = 0;
  process.on("unhandledRejection", () => unhandled++);
  const app = require(path.join(appDir, "app.js"));
  const { Role, Admin, Blogs, Category } = require(path.join(appDir, "src/models"));
  await sequelize.sync();
  const role = await Role.create({ name: "ADMIN", abbreviation: "ADM" });
  const admin = await Admin.create({ name: "Super", email_id: "super@msb.test", password: "x", role_id: role.id });
  const blog = await Blogs.create({ heading: "A blog", description: "Text", type: "FREE", created_by: admin.id }).catch((e) => e);
  const token = nm("jsonwebtoken").sign({ id: admin.id }, process.env.ADMIN_JWT_SECRET, { algorithm: "HS256", expiresIn: "1h" });
  const server = app.listen(0); await new Promise((r) => server.on("listening", r));
  const url = `http://127.0.0.1:${server.address().port}`;
  const call = async (method, p, body, headers = {}) => { const r = await fetch(url + p, { method, headers: { "content-type": "application/json", ...headers }, body: body && JSON.stringify(body) }); return { status: r.status, body: await r.json().catch(() => null) }; };

  let r = await call("PUT", "/api/v1/blog/updateBlog", { blog_id: 9999, heading: "x" }, { "x-access-token": token });
  check("ApiError thrown in an async controller -> JSON 400", r.status === 400 && r.body?.success === false && r.body?.message === "Invalid Blog Id", JSON.stringify(r.body));
  if (blog instanceof Error) check("seed a blog", false, blog.message);
  else {
    r = await call("PUT", "/api/v1/blog/updateBlog", { blog_id: blog.id, heading: "Renamed" }, { "x-access-token": token });
    check("2.6 fixed: editing a story without categories no longer crashes", r.status === 200 && r.body?.data?.heading === "Renamed", JSON.stringify(r.body).slice(0, 120));
  }
  // A raw (non-ApiError) rejection from an async handler, with no catchAsync around it.
  const realFindAll = Category.findAll;
  Category.findAll = async () => { throw new TypeError("boom"); };
  r = await call("GET", "/api/v1/category/all");
  Category.findAll = realFindAll;
  check("raw TypeError in an async handler -> JSON 500, details hidden", r.status === 500 && r.body?.success === false && r.body?.message === "Internal Server Error", JSON.stringify(r.body));
  r = await call("GET", "/api/healthcheck");
  check("server still answers afterwards", r.status === 200);
  check("no unhandled promise rejections", unhandled === 0, String(unhandled));


  // bcryptjs 3 async hashing on the one path the e2e suite does not call: admin change-password.
  const bcrypt = nm("bcryptjs");
  const admin2 = await Admin.create({ name: "Editor", email_id: "admin2@msb.test", password: bcrypt.hashSync("OldPass1234", 4), role_id: role.id });
  const token2 = nm("jsonwebtoken").sign({ id: admin2.id }, process.env.ADMIN_JWT_SECRET, { algorithm: "HS256", expiresIn: "1h" });
  r = await call("POST", "/api/v1/admin/change-password", { old_password: "OldPass1234", new_password: "NewPass5678", confirm_password: "NewPass5678" }, { "x-access-token": token2 });
  check("admin change-password succeeds", r.status === 200, JSON.stringify(r.body));
  const stored = (await Admin.scope("withPassword").findByPk(admin2.id)).password;
  check("new admin hash is bcrypt cost 10", /^\$2[ab]\$10\$/.test(stored), stored.slice(0, 7));
  r = await call("POST", "/api/v1/admin/login", { email: "admin2@msb.test", password: "NewPass5678" });
  check("admin signs in with the new password", r.status === 200 && Boolean(r.body?.data?.token), String(r.status));
  r = await call("POST", "/api/v1/admin/login", { email: "admin2@msb.test", password: "OldPass1234" });
  check("old admin password no longer works", r.status === 401, String(r.status));

  server.close();
  console.log(`\n${failed === 0 ? "all checks passed" : failed + " check(s) failed"}`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error("HARNESS ERROR", e); process.exit(2); });
