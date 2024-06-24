import { configDotenv } from "dotenv";
import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import Logger from "./logger.js";

configDotenv();
const logger = Logger.getInstance();
const { EMAIL_SERVICE, EMAIL_USERNAME, EMAIL_PASSWORD, RECEIVER_EMAIL } = process.env;

if (!EMAIL_SERVICE || !EMAIL_USERNAME || !EMAIL_PASSWORD || !RECEIVER_EMAIL) {
  throw new Error("환경변수가 설정되지 않았습니다.");
}

export default class Mailer {
  private transporter;

  private mailOptions;

  constructor() {
    const configOptions: SMTPTransport.Options = {
      service: EMAIL_SERVICE,
      auth: {
        user: EMAIL_USERNAME,
        pass: EMAIL_PASSWORD
      }
    };

    this.mailOptions = {
      from: `Tennis Court Checker <${EMAIL_USERNAME}>`,
      to: RECEIVER_EMAIL,
      subject: "테니스 예약 가능 시간"
    };

    this.transporter = nodemailer.createTransport(configOptions);
  }

  public async sendMail(text: string, subject: string) {
    try {
      await this.transporter.sendMail({ ...this.mailOptions, text, subject });
      logger.log("메일 전송 성공");
    } catch (error) {
      logger.error("메일 전송 실패");
    }
  }
}
