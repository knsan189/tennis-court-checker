import CourtChecker from "./src/courtChecker";

process.title = "tennisCourtChecker";

const courtChecker = new CourtChecker();
courtChecker.startChecking();
