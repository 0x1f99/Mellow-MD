import { exec } from "child_process";
import { simpleGit } from "simple-git";
import { promisify } from "util";
import { print } from "./consoleLogger.js";

const git = simpleGit();
const execAsync = promisify(exec);

const pullLatestUpdates = async () => {
  const oldCommit = await git.revparse(["HEAD"]);
  await git.pull();

  const newCommit = await git.revparse(["HEAD"]);

  if (oldCommit === newCommit) {
    print("info", "No updates available");
    return { updated: false };
  }
  if (process.env.AUTO_UPDATE_BOT !== "true") {
    print("info", "Auto-update is disabled.");
    return { updated: false };
  }

  const diff = await git.diff([oldCommit, newCommit, "--name-only"]);

  if (diff.includes("package.json") || diff.includes("yarn.lock")) {
    print("info", "Dependencies changed. Installing...");
    await execAsync("yarn install --frozen-lockfile");
    print("info", "Dependencies installed successfully");
  }
  return { updated: true };
};

const getLocalCommitHash = async () => {
  return await git.revparse(["HEAD"]);
};

const getCurrentBranch = async () => {
  return (await git.branch()).current;
};

const checkForUpdates = async () => {
  const local = await getLocalCommitHash();
  const branch = await getCurrentBranch();
  const response = await fetch(
    `https://api.github.com/repos/DemmyJay-99/Mellow-MD/compare/${encodeURIComponent(local)}...${encodeURIComponent(branch)}`,
    { headers: { accept: "application/vnd.github+json" } },
  );
  if (!response.ok) throw new Error(`GitHub update check failed (HTTP ${response.status})`);
  const data = await response.json();
  const commits = data.commits.map((c) => `* ${c.commit.message.split("\n")[0]}`);
  return {
    available: data.status === "behind",
    commitLength: commits.length,
    commits: commits.join("\n"),
  };
};

export { pullLatestUpdates, getLocalCommitHash, checkForUpdates };
