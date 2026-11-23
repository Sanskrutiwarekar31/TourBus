require("dotenv").config();

const path = require("path");
const store = require("./store");

async function main() {
  const file = process.argv[2] ? path.resolve(process.argv[2]) : path.join(__dirname, "..", "data", "store.json");
  await store.connect();
  const counts = await store.migrateJsonFile(file);
  console.log("[migration] imported JSON store record counts:", counts);
  await require("mongoose").disconnect();
}

main().catch(async err => {
  console.error("[migration] failed:", err.message);
  await require("mongoose").disconnect();
  process.exitCode = 1;
});
