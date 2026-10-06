import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { print } from "./consoleLogger.js";
import { SESSION_DIR } from "./runtimePaths.js";

const validateCreds = async () => {
  try {
    const credsPath = path.join(SESSION_DIR, "creds.json");
    if (!existsSync(credsPath)) {
      throw new Error("Session not found");
    }
    const creds = JSON.parse(await readFile(credsPath, "utf8"));
    if (!creds.noiseKey || !creds.signedIdentityKey || !creds.signedPreKey || !creds.me?.id) {
      throw new Error("Invalid session");
    }
    if (!creds.registered) {
      throw new Error("Session not registered");
    }
    print("success", "SESSION VALIDATED");
  } catch (error) {
    print("error", `Error validating session: ${error.message}`);
    throw new Error(error.message);
  }
};

/**
 * Save credentials
 * @param {string} sessionID
 */
const initSession = async (sessionID) => {
  try {
    const GITHUB_USERNAME = "DemmyJay-99";
    const credsPath = path.join(SESSION_DIR, "creds.json");
    if (existsSync(credsPath)) {
      const existingCreds = await readFile(credsPath, "utf8");
      try {
        JSON.parse(existingCreds);
        return;
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
        print("warning", "Existing session credentials are invalid; fetching them again.");
      }
    }
    if (!sessionID || sessionID === "") {
      throw new Error(
        "SESSION_ID is missing. Set it in config.env at the project root or as a process environment variable; generate one from the Mellow MD pairing site.",
      );
    }
    const gistURL = `https://gist.githubusercontent.com/${GITHUB_USERNAME}/${sessionID}/raw/creds.json`;
    const response = await fetch(gistURL);
    if (!response.ok) throw new Error(`Invalid session (HTTP ${response.status})`);
    const data = await response.text();
    JSON.parse(data);
    await mkdir(SESSION_DIR, { recursive: true });
    await writeFile(credsPath, data);
    print("success", "Session validated");
  } catch (error) {
    print("error", `Error validating session: ${error.message}`);
    throw error;
  }
};

export { initSession, validateCreds };
