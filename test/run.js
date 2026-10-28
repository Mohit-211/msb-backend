// Runs the end-to-end suites: `npm test`.
// Each suite gets its own process, because each one swaps modules in Node's require cache, and a
// throwaway environment: fresh secrets, an in-memory database and a temporary upload folder.
const { spawnSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const root = path.resolve(__dirname, "..");
const storage = fs.mkdtempSync(path.join(os.tmpdir(), "msb-test-"));
for (const dir of ["images", "videos"]) fs.mkdirSync(path.join(storage, dir));

const env = {
  ...process.env,
  NODE_ENV: "test",
  // Not UTC, so tests catch dates that shift with the server's time zone.
  TZ: "America/New_York",
  PORT: "0",
  CENTRAL_MYSQL_HOST: "127.0.0.1",
  CENTRAL_MYSQL_USER: "test",
  CENTRAL_MYSQL_DB: "test",
  ACCESSDOMAINS: "http://localhost:3000",
  OPENAI_KEY: "sk-test",
  STORAGE_DIR: storage,
  JWT_SECRET: crypto.randomBytes(32).toString("hex"),
  ADMIN_JWT_SECRET: crypto.randomBytes(32).toString("hex"),
};

let failed = 0;
for (const suite of ["security", "access", "library"]) {
  console.log(`\n=== ${suite}`);
  const run = spawnSync(process.execPath, [path.join(__dirname, `${suite}.test.js`), root], { env, stdio: "inherit" });
  if (run.status !== 0) failed++;
}

fs.rmSync(storage, { recursive: true, force: true });
console.log(failed ? `\n${failed} suite(s) failed` : "\nAll suites passed");
process.exit(failed ? 1 : 0);
