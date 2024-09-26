import CourtChecker from "./src/court/courtChecker.js";

process.title = process.env.PROCESS_NAME || "tennisCourt";

const courtChecker = new CourtChecker();
courtChecker.startChecking();
