// Converts every table that isn't utf8mb4 yet, so emoji and non-Western text can be saved. It works on
// whatever is in the database when it runs, including rows and tables added after any backup.
// Before and after each table it compares the row count and a checksum of every text column, and stops
// if anything differs. Converting never deletes rows; latin1 text maps to utf8mb4 without loss.
// Back up first, and stop the app while it runs (a few seconds) so no write lands mid-check.
// Reports first; pass --apply to convert. Running it again only touches tables still left.
//   node scripts/convert-to-utf8mb4.js [--apply]
const sequelize = require("../src/config/central.db");

const TEXT_TYPES = ["char", "varchar", "tinytext", "text", "mediumtext", "longtext", "enum", "set"];

const select = (sql, replacements) => sequelize.query(sql, { type: "SELECT", replacements });
const ident = (name) => `\`${name.replace(/`/g, "``")}\``;

// The row count, plus for every text column a checksum and a count of non-empty values, read as utf8mb4.
const fingerprint = async (table) => {
  const columns = await select(
    `SELECT column_name AS name FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND data_type IN (?) ORDER BY ordinal_position`,
    [table, TEXT_TYPES]
  );
  const parts = ["COUNT(*) AS row_count"];
  columns.forEach(({ name }, i) => {
    parts.push(`SUM(CRC32(CONVERT(${ident(name)} USING utf8mb4))) AS sum${i}`, `COUNT(${ident(name)}) AS filled${i}`);
  });
  const [row] = await select(`SELECT ${parts.join(", ")} FROM ${ident(table)}`);
  return row;
};

const main = async () => {
  const apply = process.argv.includes("--apply");
  const tables = await select(
    `SELECT table_name AS name FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE' AND table_collation NOT LIKE 'utf8mb4%'
     ORDER BY table_name`
  );

  if (!tables.length) {
    console.log("Every table is already utf8mb4. Nothing to do.");
    return;
  }
  console.log(`${tables.length} tables to convert: ${tables.map((t) => t.name).join(", ")}`);
  if (!apply) {
    console.log("Nothing was changed. Back up the database, stop the app, then run again with --apply.");
    return;
  }

  // New tables default to utf8mb4 from now on.
  await sequelize.query("ALTER DATABASE CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");

  for (const { name } of tables) {
    const before = await fingerprint(name);
    await sequelize.query(`ALTER TABLE ${ident(name)} CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    const after = await fingerprint(name);
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      throw new Error(`${name}: the rows or text differ after converting. Stopped here; compare this table with the backup.`);
    }
    console.log(`${name}: converted, all ${after.row_count} rows and their text unchanged`);
  }
  console.log("Done. Every table is utf8mb4, with the same rows and text as before.");
};

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
