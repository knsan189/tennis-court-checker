import { configDotenv } from "dotenv";
import validate from "../app/validator.js";

configDotenv();

export const { COURT_VIEW_URL, COURT_RESERVATION_URL, COURT_TYPE } = process.env;

validate({
  COURT_VIEW_URL,
  COURT_RESERVATION_URL,
  COURT_FLAGS: process.env.COURT_FLAGS,
  COURT_TYPE
});

export const COURT_FLAGS = process.env.COURT_FLAGS.split(",").map((i) => i.trim());
