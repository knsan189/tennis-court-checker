import { format } from "date-fns";
import { ko } from "date-fns/locale";
import Logger from "../app/logger.js";
import { CourtAvailableTime } from "./entities/court.entity.js";
import { CalendarDateEntity, CalendarEntity } from "./entities/calender.entity.js";
import CourtService from "./court.service.js";
import NextcloudTalkBot from "../nextcloud/nextcloud.bot.js";
import {
  NEXTCLOUD_BOT_TOKEN,
  NEXTCLOUD_CONVERSATION_ID,
  NEXTCLOUD_URL
} from "../nextcloud/nextcloud.config.js";
import MailerService from "../mailer/mailer.service.js";

interface CourtBotOptions {
  courtType: string;
  courtNumbers: string[];
  placeName: string;
}

interface GroupedAvailableTime {
  courtName: CourtAvailableTime["courtName"];
  url: CourtAvailableTime["url"];
  dates: {
    year: number;
    month: number;
    date: number;
    times: string[];
  }[];
}

export default class CourtBot {
  private courtName: string;

  private courtType: string;

  private courtNumbers: string[];

  private logger = Logger.getInstance();

  private courtService = CourtService.getInstance();

  private mailService = MailerService.getInstance();

  private nextCloudTalkBot = new NextcloudTalkBot(
    NEXTCLOUD_URL,
    NEXTCLOUD_CONVERSATION_ID,
    NEXTCLOUD_BOT_TOKEN
  );

  constructor(options: CourtBotOptions) {
    this.logger.setHeader(`[${options.placeName}]`);
    this.courtNumbers = options.courtNumbers;
    this.courtType = options.courtType;
    this.courtName = options.placeName;
  }

  private isSameDate(date1: CalendarDateEntity, date2: CalendarDateEntity) {
    return date1.year === date2.year && date1.month === date2.month && date1.date === date2.date;
  }

  private groupByCourtName(availableTimes: CourtAvailableTime[]): GroupedAvailableTime[] {
    const groupedAvailableTime: GroupedAvailableTime[] = [];
    availableTimes.forEach((availableTime) => {
      const courtName = availableTime.courtName;
      const court = groupedAvailableTime.find((grouped) => grouped.courtName === courtName);
      if (court) {
        const availableDate = court.dates.find((date) => this.isSameDate(date, availableTime));
        if (availableDate) {
          availableDate.times.push(availableTime.time);
        } else {
          court.dates.push({
            year: availableTime.year,
            month: availableTime.month,
            date: availableTime.date,
            times: [availableTime.time]
          });
        }
      } else {
        groupedAvailableTime.push({
          url: availableTime.url,
          courtName,
          dates: [
            {
              year: availableTime.year,
              month: availableTime.month,
              date: availableTime.date,
              times: [availableTime.time]
            }
          ]
        });
      }
    });
    return groupedAvailableTime;
  }

  private createMarkdownMessage(courts: GroupedAvailableTime[]) {
    let msg = `## ${this.courtName}\n`;
    courts.forEach((court, index) => {
      msg += `### ${court.courtName}\n`;
      court.dates.forEach((date) => {
        const targetDate = new Date();
        targetDate.setFullYear(date.year, date.month - 1, date.date);
        const formattedDate = format(targetDate, "MMM do (E)", { locale: ko });
        msg += `- **${formattedDate}** \n`;
        date.times.forEach((time, i) => {
          msg += `[${time}](${court.url})`;
          msg += (i + 1) % 4 === 0 ? "\n" : " ";
        });
        msg += "\n";
      });
      if (index !== courts.length - 1) {
        msg += "--- \n";
      }
    });
    return msg.trim();
  }

  private async sendMessage(availableTimes: CourtAvailableTime[]) {
    try {
      if (availableTimes.length === 0) {
        this.logger.log("예약 가능한 코트 없습니다.");
        return;
      }

      const courts = this.groupByCourtName(availableTimes);

      this.logger.log("메시지 전송 중");
      await this.nextCloudTalkBot.sendMessage({
        message: this.createMarkdownMessage(courts),
        silent: false
      });

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
      this.logger.log("예약 가능한 코트 시간 수", courts.length);
      this.sendMessage(courts);
    } catch (error) {
      this.logger.error("에러 발생");
      if (error instanceof Error) {
        this.logger.error(error.message);
      }
    }
  }
}
