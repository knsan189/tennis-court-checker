import { configDotenv } from "dotenv";
import Logger from "./logger.js";

configDotenv();

export const {
  API_URL = "",
  INTERVAL_TIME = "",
  RESERVATION_URL = "",
  EMAIL_SERVICE = "",
  EMAIL_USERNAME = "",
  EMAIL_PASSWORD = "",
  RECEIVER_EMAIL = "",
  MAIL_TITLE = "",
  COURT_TYPE = "",
  OPEN_API_SERVICE_KEY = ""
} = process.env;

export const COURT_FLAGS = process.env.COURT_FLAGS?.split(",").map((i) => i.trim()) || [];

const logger = Logger.getInstance();

const checkEnv = () => {
  const object: { [key: string]: any } = {
    API_URL,
    INTERVAL_TIME,
    RESERVATION_URL,
    EMAIL_SERVICE,
    EMAIL_USERNAME,
    EMAIL_PASSWORD,
    RECEIVER_EMAIL,
    MAIL_TITLE,
    COURT_TYPE,
    OPEN_API_SERVICE_KEY
  };

  Object.keys(object).forEach((key: string) => {
    if (!object[key]) {
      throw new Error(`${key} 환경변수가 설정되지 않았습니다.`);
    }
  });

  logger.log("환경변수 설정 완료");
};

checkEnv();
