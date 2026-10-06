import path from "node:path";
import { getDurationFromFile, toSticker, trimVideo } from "../../utils/mediaProcessor.js";
export default {
  name: "sticker",
  description: "Convert an image or video to a sticker",
  category: "Media",
  usage: "Reply to an image or video message with .sticker",
  aliases: ["s"],
  execute: async (sock, msg, args, mellow = {}) => {
    const { downloadContentFromMessage } = await import("@whiskeysockets/baileys");
    const { chatID, quotedMessage } = mellow;
    const mediaMessage = quotedMessage?.imageMessage || quotedMessage?.videoMessage || quotedMessage?.documentMessage;
    if (!mediaMessage) {
      return sock.sendMessage(chatID, {
        text: "Reply to an image or video message.",
      });
    }
    const type = quotedMessage?.imageMessage ? "image" : quotedMessage?.videoMessage ? "video" : "document";
    const isVideo = type === "video";
    const stream = await downloadContentFromMessage(mediaMessage, type);
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    let buffer = Buffer.concat(chunks);
    if (isVideo) {
      const duration = await getDurationFromFile(buffer);
      if (duration > 5) {
        buffer = await trimVideo(buffer, "mp4", 0, 5);
      }
    }
    const documentExt = mediaMessage.fileName ? path.extname(mediaMessage.fileName).slice(1) : "";
    const mediaExt = isVideo ? "mp4" : documentExt || (mediaMessage.mimetype?.split("/")[1] ?? "jpg");
    const [stickerNameRaw, stickerAuthorRaw] = (process.env.STICKER_PACKNAME || "").split(",");
    const stickerName = stickerNameRaw || "Mellow MD";
    const stickerAuthor = stickerAuthorRaw || "Mellow";
    const sticker = await toSticker(buffer, mediaExt, {
      pack: stickerName,
      author: stickerAuthor,
      animated: isVideo || mediaMessage.mimetype === "image/gif",
    });
    if (sticker.length > 500 * 1024) {
      return sock.sendMessage(chatID, {
        text: "Sticker is too large to send.",
      });
    }
    await sock.sendMessage(chatID, { sticker: sticker });
  },
};
