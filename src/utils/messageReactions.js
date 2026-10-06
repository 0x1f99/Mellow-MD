export async function reactToMessage(sock, msg, emoji) {
  try {
    await sock.sendMessage(msg.key.remoteJid, {
      react: {
        text: emoji,
        key: msg.key,
      },
    });
  } catch (error) {
    console.error("Error reacting to message:", error);
  }
}

export async function clearReact(sock, msg) {
  await sock.sendMessage(msg.key.remoteJid, {
    react: {
      text: "",
      key: msg.key,
    },
  });
}
