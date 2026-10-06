import { formatTime, getTimeZone } from "../../utils/localDateTime.js";

export default {
  name: "time",
  description: "Check the current time",
  category: "Utility",
  usage: "time",
  execute: async (sock, msg, args) => {
    const time = formatTime(new Date(), args[0] || getTimeZone());
    await sock.sendMessage(msg.key.remoteJid, { text: `Time: ${time}` }, { quoted: msg });
  },
};
