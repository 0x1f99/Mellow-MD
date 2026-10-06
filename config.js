import { configDotenv } from "dotenv";
import { CONFIG_FILE } from "./src/utils/runtimePaths.js";

configDotenv({
  path: CONFIG_FILE,
  quiet: true,
});

export default {
  prefix: ["!", "."],
  botName: "Mellow MD",
  OwnerName: "Mellow",
  reactEmoji: "✨",
  aza: {
    bank: process.env["BANK_NAME"],
    number: process.env["BANK_NUMBER"],
    AccName: process.env["BANK_ACCOUNT_NAME"],
  },
};
