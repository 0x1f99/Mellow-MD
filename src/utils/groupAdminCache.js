export async function isGroup(jid) {
  return jid.endsWith("@g.us");
}

export const groupCache = new Map();

export async function getGroupAdmins(sock, groupId) {
  const cacheTtl = 5 * 60 * 1000;
  const cached = groupCache.get(groupId);
  if (cached && Date.now() - cached.fetchedAt < cacheTtl) return cached.admins;

  const metadata = await sock.groupMetadata(groupId);
  const admins = new Set(
    metadata.participants
      .filter((participant) => participant.admin === "admin" || participant.admin === "superadmin")
      .map((participant) => participant.id),
  );
  groupCache.set(groupId, { admins, fetchedAt: Date.now() });
  return admins;
}

export async function isSenderAdmin(sock, senderId, groupId) {
  const admins = await getGroupAdmins(sock, groupId);
  return admins.has(senderId);
}

export async function isPrivate(jid) {
  return jid.endsWith("@s.whatsapp.net");
}
