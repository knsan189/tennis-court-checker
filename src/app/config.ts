import { configDotenv } from "dotenv";
import validate from "./validator.js";

configDotenv();

export const { INTERVAL_TIME, LISTEN_PORT } = process.env;

validate({ INTERVAL_TIME, LISTEN_PORT });
