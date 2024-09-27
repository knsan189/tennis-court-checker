import { configDotenv } from "dotenv";
import validate from "../app/validator.js";

configDotenv();

export const { MESSENGER_API_URL, MESSENGER_ENABLED } = process.env;
export const IS_MESSENGER_ENABLED = MESSENGER_ENABLED === "true";

validate({ MESSENGER_API_URL, MESSENGER_ENABLED });
