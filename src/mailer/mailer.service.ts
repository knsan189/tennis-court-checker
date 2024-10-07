import { configDotenv } from "dotenv";
import nodemailer from "nodemailer";
import SMTPTransport from "nodemailer/lib/smtp-transport";
import Logger from "../app/logger.js";
import {
  MAILER_PASSWORD,
  MAILER_RECEIVER_EMAIL,
  MAILER_SERVICE,
  MAILER_USERNAME
} from "./mailer.config.js";

configDotenv();
const logger = new Logger();

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
      to: MAILER_RECEIVER_EMAIL
    };

    this.transporter = nodemailer.createTransport(configOptions);
  }

  public static getInstance() {
    return new MailerService();
  }

  public async sendMail(text: string, subject: string) {
    try {
      await this.transporter.sendMail({ ...this.mailOptions, html: text, subject });
    } catch (error) {
      logger.error("메일 전송 실패");
      if (error instanceof Error) {
        logger.error(error.message);
      }
    }
  }
}
