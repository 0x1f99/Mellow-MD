import fs from "fs/promises";
import { existsSync } from "fs";
import path from "node:path";
import { DATA_DIR } from "./runtimePaths.js";

const sudoPath = path.join(DATA_DIR, "sudoUserStore.json");
export const sudoUsersCache = new Set();

export async function loadSudoUsers() {
  if (!existsSync(sudoPath)) {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(sudoPath, "[]");
  }
  const raw = await fs.readFile(sudoPath, "utf8");
  try {
    return JSON.parse(raw);
  } catch {
    console.error("sudoUserStore.json is corrupted, defaulting to empty list");
    return [];
  }
}

export async function refreshSudoCache() {
  const sudoUsers = await loadSudoUsers();
  sudoUsersCache.clear();
  for (const user of sudoUsers) sudoUsersCache.add(user);
}

export function isSudo(userId) {
  return sudoUsersCache.has(userId);
}

await refreshSudoCache();
