import { configDotenv } from "dotenv";
import Logger from "./logger";

configDotenv();

export const { API_URL, INTERVAL_TIME, RESERVATION_URL } = process.env;

const logger = Logger.getInstance();

const checkEnv = () => {
  const object: { [key: string]: any } = { API_URL, INTERVAL_TIME, RESERVATION_URL };

  Object.keys(object).forEach((key: string) => {
    if (!object[key]) {
      throw new Error(`${key} 환경변수가 설정되지 않았습니다.`);
    }
  });

  logger.log("환경변수 설정 완료");
};

checkEnv();
