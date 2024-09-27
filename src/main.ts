import { PROCESS_NAME } from "./app/config.js";
import CourtChecker from "./court/court.bot.js";

process.title = PROCESS_NAME;

const courtChecker = new CourtChecker();

courtChecker.startChecking();
