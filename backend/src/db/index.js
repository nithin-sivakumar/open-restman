import { getDbEngine } from "./config.js";

let adapter = null;

export async function initDb() {
  const engine = getDbEngine();
  if (engine === "sqlite") {
    const sqlite = await import("./sqliteAdapter.js");
    adapter = {
      collections: sqlite.collections,
      environments: sqlite.environments,
      history: sqlite.history,
    };
    console.log("✅ SQLite connected");
  } else {
    const mongo = await import("./mongoAdapter.js");
    adapter = {
      collections: mongo.collections,
      environments: mongo.environments,
      history: mongo.history,
    };
    // mongoose connection is handled in server.js
  }
  return adapter;
}

export function getDb() {
  if (!adapter) throw new Error("DB not initialized");
  return adapter;
}
