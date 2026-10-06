import { Litterbox } from "node-catbox";
import { unlink, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileTypeFromBuffer } from "file-type";
import { TEMP_DIR } from "./runtimePaths.js";

const litterbox = new Litterbox();

export async function uploadToCatbox(buffer, name) {
  const fileType = await fileTypeFromBuffer(buffer);
  if (!fileType) throw new Error("Unable to determine the uploaded file type");

  await mkdir(TEMP_DIR, { recursive: true });
  const filePath = path.join(TEMP_DIR, `${name}.${fileType.ext}`);
  await writeFile(filePath, buffer);

  try {
    return await litterbox.uploadFile({ path: filePath });
  } finally {
    await unlink(filePath);
  }
}
