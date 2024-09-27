import CourtChecker from "./src/court/court.bot.js";

process.title = process.env.PROCESS_NAME || "tennisCourt";

const courtChecker = new CourtChecker();
courtChecker.startChecking();
