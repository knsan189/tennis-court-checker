import CourtChecker from "./src/courtChecker.js";

process.title = "tennisCourtChecker";

const courtChecker = new CourtChecker();
courtChecker.startChecking();
