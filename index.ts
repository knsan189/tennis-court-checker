import CourtChecker from "./src/courtChecker.js";

process.title = "tennisCourt";

const courtChecker = new CourtChecker();
courtChecker.startChecking();
