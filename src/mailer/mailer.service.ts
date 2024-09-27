import { configDotenv } from "dotenv";
import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import Logger from "../app/logger.js";
import {
  MAILER_PASSWORD,
  MAILER_RECEIVER_EMAIL,
  MAILER_SERVICE,
  MAILER_TITLE,
  MAILER_USERNAME
} from "./mailer.config.js";

configDotenv();
const logger = Logger.getInstance();

export default class MailerService {
  private transporter;

  private mailOptions;

  constructor() {
    const configOptions: SMTPTransport.Options = {
      service: MAILER_SERVICE,
      auth: {
        user: MAILER_USERNAME,
        pass: MAILER_PASSWORD
      }
    };

    this.mailOptions = {
      from: `Tennis Court Checker <${MAILER_USERNAME}>`,
      to: MAILER_RECEIVER_EMAIL,
      subject: MAILER_TITLE
    };

    this.transporter = nodemailer.createTransport(configOptions);
  }

  public async sendMail(text: string, subject: string) {
    try {
      await this.transporter.sendMail({ ...this.mailOptions, html: text, subject });
      logger.log("메일 전송 성공");
    } catch (error) {
      logger.error("메일 전송 실패");
    }
  }
}
