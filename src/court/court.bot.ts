import { format } from "date-fns";
import { ko } from "date-fns/locale";
import HTMLParser from "./utils/htmlParser.js";
import Logger from "../app/logger.js";
import MessageService from "../message/telegram/message.service.js";
import { CourtEntity } from "./entities/court.entity.js";
import { CalendarEntity } from "./entities/calender.entity.js";
import CourtService from "./court.service.js";
import NextcloudTalkBot from "../message/nextcloud/nextcloudTalk.bot.js";

interface CourtBotOptions {
  courtType: string;
  courtNumbers: string[];
  courtName: string;
}
export default class CourtBot {
  private courtName: string;

  private courtType: string;

  private courtNumbers: string[];

  private logger = Logger.getInstance();

  private messageService = MessageService.getInstance();

  private courtService = CourtService.getInstance();

  private htmlParser = HTMLParser.getInstance();

  private nextCloudTalkBot = new NextcloudTalkBot(
    "https://cloud.haneul.app",
    "65s2q3vv",
    "5QR9Xt4kZmN7pL2wX6yH3fA8uE1jB0sDdqertvadfa"
  );

  constructor(options: CourtBotOptions) {
    this.logger.setHeader(`[${options.courtName}]`);
    this.courtNumbers = options.courtNumbers;
    this.courtType = options.courtType;
    this.courtName = options.courtName;
  }

  private async sendMessage(courts: CourtEntity[]) {
    if (courts.length === 0) return;

    try {
      this.logger.log("메시지 전송 중");
      let msg = `*${this.courtName} (${courts.length}곳)*`;
      msg += "\n";
      courts.forEach((court) => {
        msg += `*${court.title}*\n`;
        court.availableDates.forEach((availableDate) => {
          const targetDate = new Date();
          targetDate.setFullYear(availableDate.year);
          targetDate.setMonth(availableDate.month - 1);
          targetDate.setDate(availableDate.date);
          msg += `${format(targetDate, "MMM do (E)", { locale: ko })}\n`;
          availableDate.availableTimes.forEach((availableTime) => {
            msg += `[${availableTime.time}](${this.htmlParser.createLink(court)})\n`;
          });
          msg += "\n";
        });
      });

      const message = {
        room: "메인폰",
        msg: msg.trim(),
        sender: "courtChecker"
      };

      await this.messageService.sendMessage(message);

      this.logger.log("메시지 전송 완료");
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(error.message);
      }
    }
  }

  public async init(calendars: CalendarEntity[]) {
    try {
      this.logger.log("예약 가능한 코트 찾는 중");
      const courts = await this.courtService.fetchAvailableCourts(
        this.courtType,
        this.courtNumbers,
        calendars
      );
      this.logger.log("예약 가능한 코트 수", courts.length);
      this.sendMessage(courts);

      // await this.nextCloudTalkBot.sendMessage({
      //   message: "테스팅",
      //   silent: false
      // });
      // exampleUsage();
    } catch (error) {
      this.logger.error("에러 발생");
      if (error instanceof Error) {
        this.logger.error(error.message);
      }
    }
  }
}
