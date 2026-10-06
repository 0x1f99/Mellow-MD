import { commandHandler } from "../../utils/pluginRegistry.js";

export default {
  name: "help",
  description: "Get help for commands",
  category: "General",
  usage: "help to get a list of all commands, or help <command> to get help for a specific command",
  execute: async (sock, msg, args) => {
    const remoteJid = msg.key.remoteJid;
    await commandHandler.init();

    if (args[0]) {
      const query = args[0].toLowerCase();
      const command = commandHandler.getCommand(query)?.command;
      if (!command) {
        await sock.sendMessage(remoteJid, {
          text: `Command ${query} not found`,
        });
        return;
      }

      const commandName = command.name.charAt(0).toUpperCase() + command.name.slice(1);
      const description = command.description || "No description available";
      const category = command.category || "No category available";
      const usage = command.usage || "No usage available";
      const aliases = command.aliases ? command.aliases.join(", ") : "No aliases available";
      const helpText =
        `*${commandName}* \n\n` +
        `*Description:* ${description}\n` +
        `*Category:* ${category}\n` +
        `*Usage:* ${usage}\n` +
        `*Aliases:* ${aliases}\n`;
      return await sock.sendMessage(remoteJid, { text: helpText });
    }

    const commands = commandHandler.getCommands().sort((a, b) => a.name.localeCompare(b.name));
    const helpText =
      "Available commands:\n\n" +
      commands.map((command) => `*${command.name}* - ${command.description || "No description available"}`).join("\n");
    await sock.sendMessage(remoteJid, { text: helpText });
  },
};
