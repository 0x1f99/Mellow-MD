import makeWASocket, { useMultiFileAuthState, DisconnectReason, Browsers } from "@whiskeysockets/baileys";
import pino from "pino";
import { print, explicitLog } from "./src/utils/consoleLogger.js";
import { initSession, validateCreds } from "./src/utils/whatsappSession.js";
import { handleGroupUpdate, handleMessage } from "./src/utils/eventHandlers.js";
import store from "./src/utils/messageHistoryStore.js";
import { pullLatestUpdates } from "./src/utils/gitUpdateService.js";
import messagem from "./src/utils/startupNotification.js";
import { SESSION_DIR } from "./src/utils/runtimePaths.js";
import { commandHandler } from "./src/utils/pluginRegistry.js";

await pullLatestUpdates().catch(() => console.log("Error checking for updates"));

setInterval(
  async () => {
    await pullLatestUpdates().catch(() => console.log("Error checking for updates"));
  },
  1000 * 60 * 60 * 24,
);

let hasSent = false;
let sock;
let isRestarting = false;

const startBot = async () => {
  await commandHandler.init();

  try {
    await initSession(process.env.SESSION_ID ?? "");
    await validateCreds();
  } catch (error) {
    console.error("Failed to initialize the WhatsApp session:", error.message);
    process.exit(1);
  }

  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  const logger = pino({ level: "fatal" });

  sock = makeWASocket({
    auth: state,
    connectTimeoutMs: 15000,
    keepAliveIntervalMs: 25000,
    logger: logger.child({ level: "fatal" }),
    defaultQueryTimeoutMs: 45000,
    retryRequestDelayMs: 150,
    maxMsgRetryCount: 1,
    generateHighQualityLinkPreview: true,
    syncFullHistory: false,
    getMessage: async (key) => {
      const msgId = key.id;
      explicitLog("Getting message from DB");
      const message = await store.getMessage(msgId);
      return message || "";
    },
    shouldSyncHistoryMessage: () => false,
    printQRInTerminal: false,
    browser: Browsers.android("Mellow"),
    markOnlineOnConnect: process.env.ALWAYS_ONLINE === "true" || false,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      const user = sock.user.id.split(":")[0] + "@s.whatsapp.net";
      if (!hasSent) {
        const text = await messagem();
        await sock.sendMessage(user, { text: text });
        hasSent = true;
      }
      print("connection", "Connected to whatsapp");
    } else if (connection === "close") {
      const disconnectError = lastDisconnect?.error;
      const statusCode = disconnectError && "output" in disconnectError ? disconnectError.output.statusCode : undefined;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect && !isRestarting) {
        isRestarting = true;
        print("connection", "Reconnecting...");
        setTimeout(() => {
          isRestarting = false;
          startBot();
        }, 5000);
      }
    }
  });

  sock.ev.on("messages.upsert", async (message) => {
    try {
      await handleMessage(sock, message);
    } catch (error) {
      console.error("Error in message handler:", error);
    }
  });

  sock.ev.on("group-participants.update", async (update) => {
    try {
      await handleGroupUpdate(sock, update);
    } catch (error) {
      console.error("Error in group participants update handler:", error);
    }
  });

  sock.ev.on("contacts.update", async (update) => {
    try {
      for (const contact of update) {
        store.saveContact(contact);
      }
    } catch (error) {
      console.error("Error in contacts update handler:", error);
    }
  });

  sock.ev.on("contacts.upsert", async (update) => {
    try {
      for (const contact of update) {
        console.log(contact);
        store.saveContact(contact);
      }
    } catch (error) {
      print("error", "Error in contacts upsert handler: " + error.message);
    }
  });

  sock.ev.on("messaging-history.set", async (update) => {
    const { messages, contacts } = update;
    try {
      if (!messages || !contacts) {
        print("error", "Received messaging history set without messages or contacts");
        return;
      }
      explicitLog(`Received messaging history set with ${messages.length} messages and ${contacts.length} contacts`);
      for (const message of messages) {
        await store.saveMessage(message);
      }
      for (const contact of contacts) {
        store.saveContact(contact);
      }
    } catch (error) {
      print("error", "Error in messaging history set handler: " + error.message);
    }
  });

  return sock;
};

startBot();
