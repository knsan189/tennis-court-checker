import { format } from "date-fns";
import { ko } from "date-fns/locale";
import HTMLParser from "./utils/htmlParser.js";
import Logger from "../app/logger.js";
import MailerService from "../mailer/mailer.service.js";
import MessageService from "../message/message.service.js";
import { CourtEntity } from "./entities/court.entity.js";
import { CalendarEntity } from "./entities/calender.entity.js";
import CourtService from "./court.service.js";

interface CourtBotOptions {
  courtType: string;
  courtNumbers: string[];
  courtName: string;
}
export default class CourtBot {
  private courtName: string;

  private courtType: string;

  private courtNumbers: string[];

  private htmlParser = HTMLParser.getInstance();

  private mailerService = MailerService.getInstance();

  private logger = Logger.getInstance();

  private messageService = MessageService.getInstance();

  private courtService = CourtService.getInstance();

  constructor(options: CourtBotOptions) {
    this.logger.setHeader(`[${options.courtName}]`);
    this.courtNumbers = options.courtNumbers;
    this.courtType = options.courtType;
    this.courtName = options.courtName;
  }

  private async sendMail(courts: CourtEntity[]) {
    if (courts.length === 0) return;
    this.logger.log("메일 전송 중");
    const html = this.htmlParser.generateHTML(courts);
    await this.mailerService.sendMail(html, `${this.courtName} 예약 가능 코트 ${courts.length} 곳`);
    this.logger.log("메일 전송 완료");
  }

  private async sendMessage(courts: CourtEntity[]) {
    if (courts.length === 0) return;
    this.logger.log("메시지 전송 중");
    let msg = `${this.courtName} (${courts.length}곳)\n\n`;

    courts.forEach((court) => {
      msg += `${court.title}\n`;
      court.availableDates.forEach((availableDate) => {
        const targetDate = new Date();
        targetDate.setMonth(availableDate.month - 1);
        targetDate.setDate(availableDate.date);

        msg += `${format(targetDate, "MMM do (E)", { locale: ko })}\n`;
        availableDate.availableTimes.forEach((availableTime) => {
          msg += `${availableTime.time}\n`;
        });
        msg += "\n";
      });
    });

    const message = {
      room: "메인폰",
      msg: msg.trim(),
      sender: "courtChecker"
    };

    await this.messageService.sendMessageQueue(message);
    this.logger.log("메시지 전송 완료");
  }

  public async init(calendars: CalendarEntity[]) {
    try {
      // this.logger.log("시작");
      this.logger.log("예약 가능한 코트 찾는 중");
      const courts = await this.courtService.fetchAvailableCourts(
        this.courtType,
        this.courtNumbers,
        calendars
      );
      this.logger.log("예약 가능한 코트 수", courts.length);
      await this.sendMessage(courts);
      await this.sendMail(courts);
      // this.logger.log("종료");
    } catch (error) {
      this.logger.error("에러 발생");
      if (error instanceof Error) this.logger.error(error.message);
    }
  }
}
