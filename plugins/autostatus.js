import { loadStatusConfig, setStatusConfig } from "../lib/index.js";
import { explicitLog, print } from "../lib/log.js";

async function reactToStatus(sock, statusKey) {
  try {
    await sock.relayMessage(
      "status@broadcast",
      {
        reactionMessage: {
          key: {
            remoteJid: "status@broadcast",
            id: statusKey.id,
            participant: statusKey.participant || statusKey.remoteJid,
            fromMe: false,
          },
          text: "✨",
        },
      },
      {
        messageId: statusKey.id,
        statusJidList: [statusKey.remoteJid, statusKey.participant || statusKey.remoteJid],
      },
    );
    explicitLog("Reacted to status");
  } catch (error) {
    print("error", error.message);
  }
}
export const handleStatusUpdates = async (sock, status) => {
  try {
    const { view, enabled, like } = await loadStatusConfig();
    if (!enabled) return;
    const jid = status.key.participant;
    const exceptView = process.env.STATUS_EXCEPT_VIEW ? process.env.STATUS_EXCEPT_VIEW.split(",") : [];
    const onlyView = process.env.STATUS_ONLY_VIEW ? process.env.STATUS_ONLY_VIEW.split(",") : [];
    const allowed = !exceptView.includes(jid) && (onlyView.length === 0 || onlyView.includes(jid));
    await new Promise((r) => setTimeout(r, 1000));
    if (view && allowed) await sock.readMessages([status.key]);
    if (like && allowed) await reactToStatus(sock, status.key);
  } catch (error) {
    print("error", "Error handling status update: " + error.message);
  }
};

export default {
  name: "autostatus",
  description: "Automatically reacts to status updates based on configuration.",
  category: "utility",
  usage: "autostatus dl on|off autostatus view on|off autostatus like on|off autostatus",
  aliases: ["astatus", "as"],
  ownerOnly: true,
  execute: async (sock, msg, args, mellow = {}) => {
    const { chatID } = mellow;
    const action = args[0];
    if (!action) {
      const statusConfig = await loadStatusConfig();
      const msg = `Current Status Config:\nEnabled: ${statusConfig.enabled}\nView: ${statusConfig.view}\nLike: ${statusConfig.like}\nExcept View: ${process.env.STATUS_EXCEPT_VIEW || "None"}\nOnly View: ${process.env.STATUS_ONLY_VIEW || "None"}`;
      return sock.sendMessage(chatID, { text: msg });
    }
    if (action === "view") {
      const viewAction = args[1];
      if (!viewAction || !["on", "off"].includes(viewAction)) {
        return sock.sendMessage(chatID, {
          text: "Please specify `on` or `off` for the view action.",
        });
      }
      const statusConfig = await loadStatusConfig();
      statusConfig.view = viewAction === "on";
      await setStatusConfig(statusConfig);
      await sock.sendMessage(chatID, {
        text: `Auto view status has been turned ${viewAction}.`,
      });
    } else if (action === "like") {
      const likeAction = args[1];
      if (!likeAction || !["on", "off"].includes(likeAction)) {
        return sock.sendMessage(chatID, {
          text: "Please specify `on` or `off` for the like action.",
        });
      }
      const statusConfig = await loadStatusConfig();
      statusConfig.like = likeAction === "on";
      await setStatusConfig(statusConfig);
      await sock.sendMessage(chatID, {
        text: `Auto like status has been turned ${likeAction}.`,
      });
    } else if (action === "on" || action === "off") {
      const statusConfig = await loadStatusConfig();
      statusConfig.enabled = action === "on";
      await setStatusConfig(statusConfig);
      await sock.sendMessage(chatID, {
        text: `Auto status has been turned ${action}.`,
      });
    }
  },
};
