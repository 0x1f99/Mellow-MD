import fs from "fs";
import path from "node:path";
import { DATA_DIR } from "../../utils/runtimePaths.js";

export default {
  name: "getsudo",
  description: "Get sudo users",
  category: "Sudo",
  usage: "getsudo",
  execute: async (sock, msg, args) => {
    const chatID = msg.key.remoteJid;
    const sudo = JSON.parse(fs.readFileSync(path.join(DATA_DIR, "sudoUserStore.json"), "utf8") || "[]");
    const sudoUsers = sudo.map((user) => `${user}`).join("\n");
    await sock.sendMessage(chatID, { text: `Sudo users are: ${sudoUsers}` });
  },
};
