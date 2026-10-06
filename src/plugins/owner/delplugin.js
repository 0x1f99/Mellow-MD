import { commandHandler } from "../../utils/pluginRegistry.js";
import { unlink } from "fs/promises";
import { explicitLog } from "../../utils/consoleLogger.js";

export default {
  name: "delplugin",
  description: "Uninstall external plugins",
  usage: "delplugin <plugin name>",
  category: "Bot",
  ownerOnly: true,
  aliases: ["uninstall"],
  execute: async (sock, msg, args, mellow = {}) => {
    const { chatID } = mellow;
    const text = args[0]?.toLowerCase();
    if (!text) {
      return await sock.sendMessage(chatID, {
        text: "No plugin name provided",
      });
    }
    try {
      const plugin = commandHandler.getCommand(text);
      if (!plugin?.external || !plugin.file) {
        explicitLog(`No command with this name: ${text}`);
        return await sock.sendMessage(chatID, {
          text: "External plugin not found",
        });
      }
      const { command, file } = plugin;
      await unlink(file);
      const result = await commandHandler.unloadCommand(command.name);
      if (!result) {
        explicitLog(`Failed to unload ${text} after deleting file`);
        return await sock.sendMessage(chatID, {
          text: "Plugin file deleted, but command could not be unloaded",
        });
      }
      explicitLog(`Uninstalled ${text} plugin`);
      await sock.sendMessage(chatID, {
        text: `Plugin ${text} deleted`,
      });
    } catch (err) {
      console.error("Failed to remove plugin:", err.message);
      if (err.code === "ENOENT") {
        return await sock.sendMessage(chatID, {
          text: "Plugin file does not exist",
        });
      }
      await sock.sendMessage(chatID, {
        text: "Failed to delete plugin",
      });
    }
  },
};
