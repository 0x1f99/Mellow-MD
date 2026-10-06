import fs from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { CONFIG_FILE, DATA_DIR } from "./runtimePaths.js";

const GROUP_DATA_FILE = path.join(DATA_DIR, "group.json");
const STATUS_DATA_FILE = path.join(DATA_DIR, "status.json");

async function readData(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify({}));
  return JSON.parse(fs.readFileSync(filePath, "utf8") || "{}");
}

async function writeData(data, filePath) {
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error(`Error writing to ${filePath}:`, error);
    return false;
  }
}

async function loadUserGroupData() {
  const defaults = { antilink: {}, welcome: {}, goodbye: {}, warnings: {} };
  try {
    if (!fs.existsSync(GROUP_DATA_FILE)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(GROUP_DATA_FILE, JSON.stringify(defaults, null, 2));
      return defaults;
    }
    return JSON.parse(fs.readFileSync(GROUP_DATA_FILE, "utf8") || "{}");
  } catch (error) {
    console.error("Error loading user group data:", error);
    return defaults;
  }
}

async function getGroupConfig(jid) {
  const data = await loadUserGroupData();
  return data.antilink[jid] || { enabled: false, action: "delete" };
}

async function setGroupConfig(jid, config) {
  const data = await loadUserGroupData();
  data.antilink[jid] = config;
  await writeData(data, GROUP_DATA_FILE);
}

async function getWarns(jid, sender) {
  const data = await loadUserGroupData();
  return data.warnings[jid]?.[sender] || 0;
}

async function setWarns(jid, sender, count) {
  const data = await loadUserGroupData();
  if (!data.warnings[jid]) data.warnings[jid] = {};
  data.warnings[jid][sender] = count;
  await writeData(data, GROUP_DATA_FILE);
}

async function isWelcomeOn(jid) {
  const data = await loadUserGroupData();
  return data.welcome[jid] || false;
}

async function setWelcome(jid, enabled) {
  const data = await loadUserGroupData();
  data.welcome[jid] = enabled;
  await writeData(data, GROUP_DATA_FILE);
}

async function isGoodbyeOn(jid) {
  const data = await loadUserGroupData();
  return data.goodbye[jid] || false;
}

async function setGoodbye(jid, enabled) {
  const data = await loadUserGroupData();
  data.goodbye[jid] = enabled;
  await writeData(data, GROUP_DATA_FILE);
}

async function loadStatusConfig() {
  const defaults = { enabled: false, view: false, like: false, dl: false };
  try {
    if (!fs.existsSync(STATUS_DATA_FILE)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      fs.writeFileSync(STATUS_DATA_FILE, JSON.stringify(defaults, null, 2));
      return defaults;
    }
    return JSON.parse(fs.readFileSync(STATUS_DATA_FILE, "utf8") || "{}");
  } catch (error) {
    console.error("Error loading status config:", error);
    return defaults;
  }
}

async function setStatusConfig(config) {
  await writeData(config, STATUS_DATA_FILE);
}

async function setvar(variable, value) {
  variable = variable.toUpperCase();
  process.env[variable] = value;
  const lines = (await readFile(CONFIG_FILE, "utf8")).split("\n");
  const varIndex = lines.findIndex((line) => new RegExp(`^\\s*${variable}\\s*=`).test(line));
  if (varIndex === -1) lines.push(`${variable}='${value}'`);
  else lines[varIndex] = `${variable}='${value}'`;
  await writeFile(CONFIG_FILE, lines.join("\n"));
}

async function getvar(variable) {
  return process.env[variable.toUpperCase()];
}

async function delvar(variable) {
  variable = variable.toUpperCase();
  delete process.env[variable];
  const lines = (await readFile(CONFIG_FILE, "utf8")).split("\n");
  const varIndex = lines.findIndex((line) => new RegExp(`^\\s*${variable}\\s*=`).test(line));
  if (varIndex !== -1) lines.splice(varIndex, 1);
  await writeFile(CONFIG_FILE, lines.join("\n"));
}

async function allvars() {
  const lines = (await readFile(CONFIG_FILE, "utf8")).split("\n");
  const vars = {};
  for (const line of lines) {
    const [key, value] = line.split("=");
    if (key && value) vars[key] = value;
  }
  return vars;
}

export {
  readData,
  writeData,
  getGroupConfig,
  setGroupConfig,
  getWarns,
  setWarns,
  isWelcomeOn,
  setWelcome,
  isGoodbyeOn,
  setGoodbye,
  loadStatusConfig,
  setStatusConfig,
  setvar,
  getvar,
  delvar,
  allvars,
};
