import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT_DIR = fileURLToPath(new URL("../../", import.meta.url));
export const CONFIG_FILE = path.join(ROOT_DIR, "config.env");
export const DATA_DIR = path.join(ROOT_DIR, "data");
export const SESSION_DIR = path.join(ROOT_DIR, "session");
export const TEMP_DIR = path.join(ROOT_DIR, "tmp");
