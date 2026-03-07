import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_PATH = path.join(__dirname, "../../../restman.config.json");

const DEFAULT_CONFIG = {
  dbEngine: "mongodb",
};

export function readConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
    }
  } catch {}
  return { ...DEFAULT_CONFIG };
}

export function writeConfig(data) {
  const current = readConfig();
  const updated = { ...current, ...data };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(updated, null, 2), "utf-8");
  return updated;
}

export function getDbEngine() {
  return readConfig().dbEngine || "mongodb";
}
