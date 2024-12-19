import { format } from "date-fns";
import { ko } from "date-fns/locale";
import Logger from "../app/logger.js";
import { CourtAvailableTime } from "./entities/court.entity.js";
import { CalendarEntity } from "./entities/calender.entity.js";
import CourtService from "./court.service.js";
import NextcloudTalkBot from "../nextcloud/nextcloud.bot.js";

interface CourtBotOptions {
  courtType: string;
  courtNumbers: string[];
  placeName: string;
}

interface GroupedAvailableTime {
  courtName: CourtAvailableTime["courtName"];
  url: CourtAvailableTime["url"];
  availableDates: {
    year: number;
    month: number;
    date: number;
    availableTimes: string[];
  }[];
}

export default class CourtBot {
  private courtName: string;

  private courtType: string;

  private courtNumbers: string[];

  private logger = Logger.getInstance();

  private courtService = CourtService.getInstance();

  private nextCloudTalkBot = new NextcloudTalkBot(
    "https://cloud.haneul.app",
    "65s2q3vv",
    "5QR9Xt4kZmN7pL2wX6yH3fA8uE1jB0sDdqertvadfa"
  );

  constructor(options: CourtBotOptions) {
    this.logger.setHeader(`[${options.placeName}]`);
    this.courtNumbers = options.courtNumbers;
    this.courtType = options.courtType;
    this.courtName = options.placeName;
  }

  private groupByCourtName(availableTimes: CourtAvailableTime[]): GroupedAvailableTime[] {
    const groupedAvailableTime: GroupedAvailableTime[] = [];
    availableTimes.forEach((availableTime) => {
      const courtName = availableTime.courtName;
      const court = groupedAvailableTime.find((grouped) => grouped.courtName === courtName);
      if (court) {
        const availableDate = court.availableDates.find(
          (availableDate) =>
            availableDate.year === availableTime.year &&
            availableDate.month === availableTime.month &&
            availableDate.date === availableTime.date
        );
        if (availableDate) {
          availableDate.availableTimes.push(availableTime.time);
        } else {
          court.availableDates.push({
            year: availableTime.year,
            month: availableTime.month,
            date: availableTime.date,
            availableTimes: [availableTime.time]
          });
        }
      } else {
        groupedAvailableTime.push({
          url: availableTime.url,
          courtName,
          availableDates: [
            {
              year: availableTime.year,
              month: availableTime.month,
              date: availableTime.date,
              availableTimes: [availableTime.time]
            }
          ]
        });
      }
    });
    return groupedAvailableTime;
  }

  private async sendMessage(availableTimes: CourtAvailableTime[]) {
    if (availableTimes.length === 0) {
      this.logger.log("예약 가능한 코트 없음");
      return;
    }

    const courts = this.groupByCourtName(availableTimes);

    try {
      this.logger.log("메시지 전송 중");
      let msg = `### ${this.courtName}\n`;
      courts.forEach((court) => {
        msg += `#### ${court.courtName}\n`;
        court.availableDates.forEach((availableDate) => {
          const targetDate = new Date();
          targetDate.setFullYear(availableDate.year);
          targetDate.setMonth(availableDate.month - 1);
          targetDate.setDate(availableDate.date);
          msg += `- **${format(targetDate, "MMM do (E)", { locale: ko })}** \n`;
          availableDate.availableTimes.forEach((availableTime) => {
            msg += `[${availableTime}](${court.url}) \n`;
          });
          msg += "\n";
        });
        msg += "--- \n";
      });
      await this.nextCloudTalkBot.sendMessage({
        message: msg.trim(),
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
