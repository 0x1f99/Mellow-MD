import { refreshSudoCache, loadSudoUsers } from "../../utils/sudoUserStore.js";
import fs from "fs/promises";
import path from "node:path";
import { DATA_DIR } from "../../utils/runtimePaths.js";

export default {
  name: "delsudo",
  description: "Remove a user from sudo",
  category: "Sudo",
  usage: "Reply to a user or mention one.",
  aliases: ["removesudo", "unsudo", "dsudo"],
  ownerOnly: true,
  execute: async (sock, msg, args, mellow = {}) => {
    const { chatID, ctxInfo } = mellow;
    const sudoPath = path.join(DATA_DIR, "sudoUserStore.json");
    const sudoUsers = await loadSudoUsers();
    let targetJid;
    if (ctxInfo?.participant) {
      targetJid = ctxInfo.participant;
    } else if (ctxInfo?.mentionedJid?.length) {
      targetJid = ctxInfo.mentionedJid[0];
    } else {
      await sock.sendMessage(chatID, {
        text: "Reply to a user or mention one.",
      });
      return;
    }
    const index = sudoUsers.indexOf(targetJid);
    if (index === -1) {
      await sock.sendMessage(chatID, {
        text: "User is not sudo.",
      });
      return;
    }
    sudoUsers.splice(index, 1);
    await fs.writeFile(sudoPath, JSON.stringify(sudoUsers));
    await refreshSudoCache();
    await sock.sendMessage(chatID, { text: `${targetJid} is no longer sudo` });
  },
};
