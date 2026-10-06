import config from "../../config.js";
import p from "../../package.json" with { type: "json" };
import { checkForUpdates } from "./gitUpdateService.js";
import { commandHandler } from "./pluginRegistry.js";
import { formatDate, formatTime } from "./localDateTime.js";

const message = async () => {
  const now = new Date();
  const date = formatDate(now);
  const time = formatTime(now);
  const updateInfo = (await checkForUpdates().catch(() => null))?.available;
  const prefix = process.env.PREFIX ? process.env.PREFIX.split(",") : config.prefix;
  const autoUpdate = process.env.AUTO_UPDATE_BOT === "true" ? "ON ✅" : "OFF ❌";
  const alwaysOnline = process.env.ALWAYS_ONLINE === "true" ? "ON ✅" : "OFF ❌";
  const user = process.env.OWNER_NAME || config.OwnerName;
  const plugins = await commandHandler.getPlugins();
  const version = p.version;
  const text =
    `╔═════════╗\n` +
    ` MELLOW MD V${version}\n` +
    `╚═════════╝\n` +
    `${updateInfo ? "Update available!" : ""}\n` +
    `╔═══⚙ CONFIG══╗\n` +
    `   ❖ Prefix: ${prefix.join(" | ")}\n` +
    `   ❖ Auto Update: ${autoUpdate}\n` +
    `   ❖ Always online: ${alwaysOnline}\n` +
    `   ❖ User:  ${user}\n` +
    `   ❖ Plugins: ${plugins.length}\n` +
    `   ❖ Date: ${date}\n` +
    `   ❖ Time: ${time}\n` +
    `╚═══════════╝\n` +
    `*Mellow MD is now online*\n` +
    `▸ Type ${prefix[0]}menu to see all commands\n` +
    `Join for updates: https://t.me/mellowmd`;
  return text;
};

export default message;
