import { configDotenv } from "dotenv";
import validate from "../app/validator.js";

configDotenv();

export const { NEXTCLOUD_BOT_TOKEN, NEXTCLOUD_CONVERSATION_ID, NEXTCLOUD_URL } = process.env;

validate({
  NEXTCLOUD_BOT_TOKEN,
  NEXTCLOUD_CONVERSATION_ID,
  NEXTCLOUD_URL
});
