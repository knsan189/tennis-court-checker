import { configDotenv } from "dotenv";
import validate from "../app/validator.js";

configDotenv();

export const { HOLIDAY_API_URL, HOLIDAY_API_SERVICE_KEY } = process.env;

validate({ HOLIDAY_API_URL, HOLIDAY_API_SERVICE_KEY });
