// Security checks: who can reach what, tokens, password resets, uploads and rate limits.
// Runs against the real app on in-memory SQLite, with email and OpenAI stubbed. Start it with `npm test`.
const path = require("path"), fs = require("fs"), Module = require("module"), crypto = require("crypto");
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
let openaiCalls = 0;
inject("src/config/openAi.js", { chat: { completions: { create: async () => { openaiCalls++; return { choices: [{ message: { content: "<script>alert(1)</script>\nShe opened the café at dawn." } }] }; } } } });

const app = require(path.join(appDir, "app.js"));
const { Role, Admin, User, AiStory, OTP } = require(path.join(appDir, "src/models"));
const bcrypt = nm("bcryptjs");
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const forge = (payload, key) => { const h = b64({ alg: "HS256", typ: "JWT" }), p = b64({ ...payload, iat: Math.floor(Date.now() / 1000) }); return `${h}.${p}.${crypto.createHmac("sha256", key).update(`${h}.${p}`).digest("base64url")}`; };

(async () => {
  await sequelize.sync();
  const hash = (p) => bcrypt.hashSync(p, 4);
  const superRole = await Role.create({ name: "ADMIN", abbreviation: "ADM" });
  const editorRole = await Role.create({ name: "Editor", abbreviation: "EDT" });
  const superAdmin = await Admin.create({ name: "Super", email_id: "super@msb.test", password: hash("SuperPass12"), role_id: superRole.id });
  const editor = await Admin.create({ name: "Editor", email_id: "editor@msb.test", password: hash("EditorPass12"), role_id: editorRole.id });
  const alice = await User.create({ name: "Alice", email: "alice@msb.test", password: hash("AlicePass12") });
  await AiStory.create({ input: "A test story", heading: "A test story", description: "<p>x</p>", created_by: alice.id });

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
  let res;

  group("Admin tokens (audit 1.1)");
  res = await call("GET", "/admin/getAdminProfile", { token: forge({ id: superAdmin.id, role_id: superRole.id }, Buffer.alloc(0)) });
  check("token forged with an empty key is rejected", res.status === 401, res.status);
  res = await call("GET", "/admin/getAdminProfile", { token: forge({ id: superAdmin.id }, process.env.JWT_SECRET) });
  check("token signed with the USER secret is rejected", res.status === 401, res.status);
  res = await call("GET", "/admin/getAdminProfile", { token: forge({ id: 9999 }, process.env.ADMIN_JWT_SECRET) });
  check("valid signature for a non-existent admin is rejected", res.status === 401, res.status);
  res = await call("POST", "/admin/login", { json: { email: "super@msb.test", password: "SuperPass12" } });
  const superToken = res.data?.data?.token;
  check("super admin can log in", res.status === 200 && !!superToken, res.status + " " + res.text.slice(0, 120));
  res = await call("GET", "/admin/getAdminProfile", { token: superToken });
  check("admin profile works and leaks no password/otp", res.status === 200 && !("password" in res.data.data) && !("otp" in res.data.data), JSON.stringify(res.data).slice(0, 160));
  const w = await call("POST", "/admin/login", { json: { email: "super@msb.test", password: "WrongPass99" } });
  const n = await call("POST", "/admin/login", { json: { email: "nobody@msb.test", password: "WrongPass99" } });
  check("admin login: unknown email and wrong password look identical", w.status === 401 && n.status === 401 && w.text === n.text, `${w.status} ${w.text} | ${n.status} ${n.text}`);
  res = await call("POST", "/admin/login", { json: { email: "editor@msb.test", password: "EditorPass12" } });
  const editorToken = res.data?.data?.token;

  group("Endpoints that were open to anyone (audit 1.2)");
  for (const [m, p] of [["POST", "/admin/register"], ["GET", "/admin/getAdminById?id=1"], ["GET", "/admin/getUserById?id=1"], ["POST", "/admin/getLoginLogsOfUser"], ["POST", "/admin/updatepaymentStatus"], ["GET", "/admin/getBlogCount"], ["POST", "/role/create"], ["GET", "/role/all"], ["GET", "/story/getAllGeneratedStories"], ["GET", "/story/getStoryById/1"], ["POST", "/story/makeGeneratedStoryLive/1"], ["GET", "/blog/getAllBlogs"], ["GET", "/blog/getCommentsByBlogId?blog_id=1"]]) {
    res = await call(m, p);
    check(`no token: ${m} ${p.split("?")[0]} refused`, res.status === 400 || res.status === 401, res.status + " " + res.text.slice(0, 80));
  }

  group("Admin privilege escalation (audit 1.4)");
  for (const [m, p, opts] of [["POST", "/admin/register", { json: { name: "Mallory", email: "mallory@msb.test", role_id: superRole.id } }], ["PUT", "/admin/updateAdmin", { json: { admin_id: editor.id, role_id: superRole.id } }], ["PUT", "/role/editRole", { json: { role_id: editorRole.id, name: "ADMIN", abbreviation: "ADM" } }], ["DELETE", "/admin/deleteAdmin", { json: { admin_id: superAdmin.id } }], ["GET", "/admin/getUserById?id=" + alice.id]]) {
    res = await call(m, p, { token: editorToken, ...(opts || {}) });
    check(`editor can't ${m} ${p.split("?")[0]}`, res.status === 403, res.status + " " + res.text.slice(0, 80));
  }
  check("editor's role and the Editor role are unchanged", (await Admin.findByPk(editor.id)).role_id === editorRole.id && (await Role.findByPk(editorRole.id)).name === "Editor");
  res = await call("GET", "/admin/getBlogCount", { token: editorToken });
  check("editor still reaches dashboard stats", res.status === 200, res.status);
  const fd = new FormData(); fd.append("name", "Newbie"); fd.append("email", "newbie@msb.test"); fd.append("role_id", String(editorRole.id));
  res = await call("POST", "/admin/register", { token: superToken, form: fd });
  const newbieId = res.data?.data?.id;
  check("super admin creates an admin (multipart, like the panel)", res.status === 200 && !!newbieId, res.status + " " + res.text.slice(0, 120));
  check("register response contains no password hash", res.status === 200 && !("password" in res.data.data), JSON.stringify(res.data).slice(0, 160));
  const creds = mails.find((m) => m.type === "adminCreds" && m.to === "newbie@msb.test");
  check("emailed temporary password is random and 12 characters", !!creds && creds.password.length === 12, JSON.stringify(creds));
  res = await call("POST", "/admin/login", { json: { email: "newbie@msb.test", password: creds?.password } });
  const newbieToken = res.data?.data?.token;
  const before = (await call("GET", "/admin/getUserById?id=" + alice.id, { token: newbieToken })).status;
  await call("PUT", "/admin/updateAdmin", { token: superToken, json: { admin_id: newbieId, role_id: superRole.id } });
  res = await call("GET", "/admin/getUserById?id=" + alice.id, { token: newbieToken });
  check("a role change applies to an existing token immediately", before === 403 && res.status === 200, `${before} -> ${res.status}`);
  check("user details for admins contain no password", res.status === 200 && !("password" in res.data.data), JSON.stringify(res.data).slice(0, 120));
  await call("DELETE", "/admin/deleteAdmin", { token: superToken, json: { admin_id: newbieId } });
  res = await call("GET", "/admin/getAdminProfile", { token: newbieToken });
  check("a deleted admin's token stops working at once", res.status === 401, res.status);

  group("Uploads (audit 1.5)");
  const imagesDir = path.join(process.env.STORAGE_DIR || path.join(appDir, "public/uploads"), "images"); const count = () => fs.readdirSync(imagesDir).length;
  const png = () => new Blob([Buffer.from("89504e470d0a1a0a0000000d49484452", "hex")], { type: "image/png" });
  const start = count();
  let up = new FormData(); up.append("title", "Hack"); up.append("images", png(), "x.png");
  res = await call("POST", "/category/createCategory", { form: up });
  up = new FormData(); up.append("images", png(), "x.png");
  await call("POST", "/nope", { form: up });
  check("anonymous uploads are refused and write no files", (res.status === 400 || res.status === 401) && count() === start, `${res.status}, files ${start} -> ${count()}`);
  up = new FormData(); up.append("title", "Travel"); up.append("images", png(), "x.png");
  res = await call("POST", "/category/createCategory", { token: editorToken, form: up });
  check("admin upload works and gets an unguessable name", res.status === 200 && fs.readdirSync(imagesDir).some((f) => /^images-\d+-[0-9a-f]{12}\.png$/.test(f)), res.status + " " + fs.readdirSync(imagesDir).join(","));
  up = new FormData(); up.append("title", "Bad"); up.append("images", new Blob(["hello"], { type: "text/plain" }), "x.txt");
  res = await call("POST", "/category/createCategory", { token: editorToken, form: up });
  check("a non-image upload gets a JSON 400", res.status === 400 && res.data.success === false, res.status + " " + res.text.slice(0, 100));
  const uf = new FormData(); uf.append("name", "Carol"); uf.append("email", "carol@msb.test"); uf.append("user[id]", "999");
  res = await call("POST", "/admin/createUser", { token: superToken, form: uf });
  const carol = await User.findOne({ where: { email: "carol@msb.test" } });
  check("createUser records the signed-in admin, not a spoofed form field", res.status === 200 && carol?.created_by === superAdmin.id, `${res.status} created_by=${carol?.created_by}`);

  group("Forgot password (audit 1.3)");
  const loginAlice = (password) => call("POST", "/auth/login", { json: { email: "alice@msb.test", password } });
  res = await loginAlice("AlicePass12"); const aliceOld = res.data?.data?.tokens?.access?.token;
  check("user login works", res.status === 200 && !!aliceOld, res.status + " " + res.text.slice(0, 100));
  let m0 = mails.length;
  res = await call("POST", "/auth/otp", { json: { email: "ghost@msb.test", type: "forget_password" } });
  check("OTP for an unknown email: same 200, but no email sent", res.status === 200 && mails.length === m0, `${res.status} mails ${m0}->${mails.length}`);
  res = await call("POST", "/auth/otp", { json: { email: "alice@msb.test", type: "forget_password" } });
  let otp = mails.filter((m) => m.type === "otp").pop()?.otp;
  check("OTP goes to the real account and has 6 digits", res.status === 200 && /^\d{6}$/.test(otp || ""), res.status + " " + otp);
  const reset = (code, password = "NewAlice99x") => call("POST", "/auth/forgot-password", { json: { email: "alice@msb.test", otp: code, password, confirm_Password: password } });
  const wrong = otp === "000000" ? "111111" : "000000";
  for (let i = 0; i < 5; i++) res = await reset(wrong);
  check("wrong codes are refused", res.status === 400, res.status);
  res = await reset(otp);
  check("after 5 wrong guesses the code is dead, even the right one", res.status === 400, res.status + " " + res.text);
  await call("POST", "/auth/otp", { json: { email: "alice@msb.test", type: "forget_password" } });
  otp = mails.filter((m) => m.type === "otp").pop()?.otp;
  res = await reset(otp, "weak");
  check("the new password must meet the policy", res.status === 400, res.status);
  res = await reset(otp);
  check("the correct code resets the password", res.status === 200, res.status + " " + res.text);
  check("a confirmation email is sent", mails.some((m) => m.type === "reset" && m.to === "alice@msb.test"));
  res = await reset(otp, "Another123x");
  check("the same code can't be used twice", res.status === 400, res.status);
  res = await call("GET", "/user/profile", { token: aliceOld });
  check("sessions from before the reset are signed out", res.status !== 200, res.status);
  await call("POST", "/auth/otp", { json: { email: "alice@msb.test", type: "forget_password" } });
  otp = mails.filter((m) => m.type === "otp").pop()?.otp;
  await OTP.update({ otp_expiration_time: new Date(Date.now() - 60000) }, { where: { email: "alice@msb.test", is_active: true }, validate: false, hooks: false });
  res = await reset(otp);
  check("an expired code is refused", res.status === 400, res.status);

  group("Sessions and sign-in");
  res = await loginAlice("NewAlice99x"); const sessionA = res.data?.data?.tokens?.access?.token;
  res = await loginAlice("NewAlice99x"); const sessionB = res.data?.data?.tokens?.access?.token;
  res = await call("POST", "/auth/reset-password", { token: sessionA, json: { old_password: "NewAlice99x", new_password: "Third123pw", confirm_password: "Third123pw" } });
  const a = await call("GET", "/user/profile", { token: sessionA }), b = await call("GET", "/user/profile", { token: sessionB });
  check("changing the password keeps this session and signs out the others", res.status === 200 && a.status === 200 && b.status !== 200, `${res.status} ${a.status} ${b.status}`);
  check("profile response contains no password", a.status === 200 && !("password" in a.data.data), JSON.stringify(a.data).slice(0, 120));
  res = await call("POST", "/auth/logout", { token: sessionA });
  check("POST /auth/logout revokes the session", res.status === 200 && (await call("GET", "/user/profile", { token: sessionA })).status !== 200, res.status);
  res = await call("GET", "/user/profile", { token: "not.a.jwt" });
  check("a garbage user token gets 401, not a 500", res.status === 401, res.status);
  const u1 = await loginAlice("WrongPass99"), u2 = await call("POST", "/auth/login", { json: { email: "nobody@msb.test", password: "WrongPass99" } });
  check("user login: unknown email and wrong password look identical", u1.status === 401 && u2.status === 401 && u1.data.message === u2.data.message, `${u1.status} ${u2.status}`);

  group("Story generation");
  res = await loginAlice("Third123pw"); const sessionC = res.data?.data?.tokens?.access?.token;
  const calls0 = openaiCalls;
  res = await call("POST", "/story", { token: sessionC, json: { input: "x".repeat(201) } });
  check("an over-long title is refused before OpenAI is called", res.status === 400 && openaiCalls === calls0, `${res.status} calls ${calls0}->${openaiCalls}`);
  res = await call("POST", "/story", { token: sessionC, json: { input: "A cafe in Manali" } });
  const desc = res.data?.data?.description || "";
  check("model output is HTML-escaped before it is stored", res.status === 201 && desc.includes("&lt;script&gt;") && !desc.includes("<script>"), res.status + " " + desc.slice(0, 120));

  group("Errors and rate limits");
  res = await call("GET", "/does-not-exist");
  check("unknown route gives a JSON 404", res.status === 404 && res.data.success === false, res.status + " " + res.text.slice(0, 80));
  const bad = await fetch(base + "/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: "{bad json" });
  const badText = await bad.text();
  check("malformed JSON gives a JSON 400 with no stack trace", bad.status === 400 && badText.startsWith("{") && !/\n\s+at /.test(badText), bad.status + " " + badText.slice(0, 100));
  let statuses = [];
  for (let i = 0; i < 3; i++) { res = await call("POST", "/auth/otp", { json: { email: "zed@msb.test", type: "forget_password" } }); statuses.push(res.status); }
  check("OTP requests are rate limited per IP (5 per 15 min)", statuses.includes(429) && res.data?.success === false, statuses.join(","));
  statuses = [];
  for (let i = 0; i < 20; i++) { res = await call("POST", "/auth/login", { json: { email: "nobody@msb.test", password: "x1x2x3x4" } }); statuses.push(res.status); }
  check("repeated failed logins are rate limited (20 per 15 min)", statuses.includes(429), statuses.slice(-4).join(","));

  console.log(`\n${pass} passed, ${fail} failed`);
  server.close(); process.exit(fail ? 1 : 0);
})().catch((e) => { console.error("HARNESS ERROR:", e); process.exit(2); });
