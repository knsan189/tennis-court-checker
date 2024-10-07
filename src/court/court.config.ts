import { configDotenv } from "dotenv";
import validate from "../app/validator.js";

configDotenv();

export const { COURT_VIEW_URL, COURT_RESERVATION_URL } = process.env;

validate({
  COURT_VIEW_URL,
  COURT_RESERVATION_URL
});
