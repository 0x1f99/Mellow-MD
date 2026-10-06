import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { explicitLog } from "./consoleLogger.js";
import { ROOT_DIR } from "./runtimePaths.js";

const PLUGINS_DIR = path.join(ROOT_DIR, "src", "plugins");
const EXTERNAL_PLUGINS_DIR = path.join(PLUGINS_DIR, "eplugins");

async function findPluginFiles(directory, excludedDirectories = new Set()) {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }

  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const filePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!excludedDirectories.has(entry.name)) {
        files.push(...(await findPluginFiles(filePath, excludedDirectories)));
      }
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(filePath);
    }
  }
  return files;
}

class CommandHandler {
  constructor() {
    this.commands = new Map();
    this.aliases = new Map();
    this.ready = this.loadCommands();
  }

  getCommands() {
    return Array.from(this.commands.values(), ({ command }) => command);
  }

  async getPlugins() {
    await this.init();
    return this.getCommands();
  }

  async loadCommands() {
    const commandFiles = await findPluginFiles(PLUGINS_DIR, new Set(["eplugins"]));
    for (const filePath of commandFiles) {
      try {
        const { default: command } = await import(pathToFileURL(filePath).href);
        this.registerCommand(command, filePath);
      } catch (error) {
        console.error(`[SKIP] Failed to load plugin ${filePath}:`, error.message);
      }
    }

    const externalFiles = await findPluginFiles(EXTERNAL_PLUGINS_DIR);
    for (const filePath of externalFiles) {
      try {
        const { default: command } = await import(pathToFileURL(filePath).href);
        explicitLog(`Installing ${command.name}`);
        this.registerCommand(command, filePath, true);
        explicitLog(`Installed ${command.name}`);
      } catch (error) {
        console.error(`[SKIP] Failed to load external plugin ${filePath}:`, error.message);
      }
    }
  }

  async init() {
    await this.ready;
    return this;
  }

  getCommand(text) {
    const key = text.toLowerCase();
    if (this.commands.has(key)) return this.commands.get(key);
    const target = this.aliases.get(key);
    return target ? this.commands.get(target) : undefined;
  }

  async loadCommand(filePath) {
    await this.init();
    const absolutePath = path.resolve(filePath);
    if (!absolutePath.startsWith(`${EXTERNAL_PLUGINS_DIR}${path.sep}`)) {
      throw new Error("External plugins must be installed under src/plugins/eplugins");
    }

    const url = pathToFileURL(absolutePath);
    url.searchParams.set("v", String(Date.now()));
    const { default: command } = await import(url.href);
    if (!this.registerCommand(command, absolutePath, true)) {
      throw new Error(`Invalid plugin module: ${path.basename(absolutePath)}`);
    }
    return command.name;
  }

  async unloadCommand(name) {
    const nameLower = String(name).toLowerCase();
    const entry = this.commands.get(nameLower);
    if (!entry) {
      console.warn(`[SKIP] Command "${nameLower}" is not registered.`);
      return false;
    }

    this.commands.delete(nameLower);
    for (const [alias, target] of this.aliases) {
      if (target === nameLower) this.aliases.delete(alias);
    }
    return entry;
  }

  registerCommand(command, filePath, external = false) {
    if (!command?.name || typeof command.execute !== "function") {
      console.error(`[SKIP] Plugin at ${filePath || "unknown"} is missing a valid command name or handler function.`);
      return false;
    }

    const nameLower = command.name.toLowerCase();
    const aliasKeys = (command.aliases || []).map((alias) => String(alias).toLowerCase());
    if (this.commands.has(nameLower)) {
      console.warn(
        `[REPLACE] Command "${nameLower}" is already registered. Replacing with new version from ${filePath || "unknown"}.`,
      );
      for (const [alias, target] of this.aliases) {
        if (target === nameLower) this.aliases.delete(alias);
      }
    }
    this.commands.set(nameLower, { command, file: filePath, external });
    for (const alias of aliasKeys) {
      if (this.commands.has(alias)) {
        console.warn(`[SKIP] Alias "${alias}" conflicts with an existing command name.`);
        continue;
      }
      this.aliases.set(alias, nameLower);
    }
    return true;
  }
}

export const commandHandler = new CommandHandler();
