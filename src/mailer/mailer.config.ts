import { configDotenv } from "dotenv";
import validate from "../app/validator.js";

configDotenv();

export const { MAILER_SERVICE, MAILER_USERNAME, MAILER_PASSWORD, MAILER_RECEIVER_EMAIL } =
  process.env;

validate({ MAILER_SERVICE, MAILER_USERNAME, MAILER_PASSWORD, MAILER_RECEIVER_EMAIL });
