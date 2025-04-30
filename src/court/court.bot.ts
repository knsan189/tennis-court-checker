import { format } from "date-fns";
import { ko } from "date-fns/locale";
import Logger from "../app/logger.js";
import { CourtAvailableTime } from "./entities/court.entity.js";
import { CalendarEntity } from "./entities/calender.entity.js";
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

interface DateWithTimes {
  year: number;
  month: number;
  date: number;
  times: string[];
}

interface GroupedAvailableTime {
  courtName: CourtAvailableTime["courtName"];
  url: CourtAvailableTime["url"];
  dates: DateWithTimes[];
}

export default class CourtBot {
  private courtName: string;
  private courtType: string;
  private courtNumbers: string[];
  private logger = Logger.getInstance();
  private courtService: CourtService;
  private mailService: MailerService;
  private nextCloudTalkBot: NextcloudTalkBot;

  constructor(
    options: CourtBotOptions,
    courtService = CourtService.getInstance(),
    mailService = MailerService.getInstance(),
    nextCloudBot = new NextcloudTalkBot(
      NEXTCLOUD_URL,
      NEXTCLOUD_CONVERSATION_ID,
      NEXTCLOUD_BOT_TOKEN
    )
  ) {
    this.logger.setHeader(`[${options.placeName}]`);
    this.courtNumbers = options.courtNumbers;
    this.courtType = options.courtType;
    this.courtName = options.placeName;
    this.courtService = courtService;
    this.mailService = mailService;
    this.nextCloudTalkBot = nextCloudBot;
  }

  public async init(calendars: CalendarEntity[]): Promise<void> {
    try {
      this.logger.log("예약 가능한 코트 찾는 중");
      const courts = await this.fetchAvailableCourts(calendars);
      this.logger.log("예약 가능한 코트 시간 수", courts.length);
      await this.sendMessage(courts);
    } catch (error) {
      this.handleError("코트 초기화 중 에러 발생", error);
    }
  }

  private async fetchAvailableCourts(calendars: CalendarEntity[]): Promise<CourtAvailableTime[]> {
    return this.courtService.fetchAvailableCourts(this.courtType, this.courtNumbers, calendars);
  }

  private async sendMessage(availableTimes: CourtAvailableTime[]): Promise<void> {
    try {
      if (availableTimes.length === 0) {
        this.logger.log("예약 가능한 코트 없습니다.");
        return;
      }

      const courts = this.groupByCourtName(availableTimes);
      const message = this.createMarkdownMessage(courts);

      this.logger.log("메시지 전송 중");
      await this.nextCloudTalkBot.sendMessage({
        message,
        silent: false
      });
      this.logger.log("메시지 전송 완료");
    } catch (error) {
      this.handleError("메시지 전송 중 에러 발생", error);
    }
  }

  private groupByCourtName(availableTimes: CourtAvailableTime[]): GroupedAvailableTime[] {
    const groupedAvailableTime: GroupedAvailableTime[] = [];

    availableTimes.forEach((availableTime) => {
      const { courtName, url, year, month, date, time } = availableTime;
      const existingCourt = groupedAvailableTime.find((court) => court.courtName === courtName);

      if (existingCourt) {
        this.addTimeToExistingCourt(existingCourt, { year, month, date, time });
      } else {
        groupedAvailableTime.push({
          courtName,
          url,
          dates: [{ year, month, date, times: [time] }]
        });
      }
    });

    return groupedAvailableTime;
  }

  private addTimeToExistingCourt(
    court: GroupedAvailableTime,
    { year, month, date, time }: Pick<CourtAvailableTime, "year" | "month" | "date" | "time">
  ): void {
    const existingDate = court.dates.find(
      (d) => d.year === year && d.month === month && d.date === date
    );

    if (existingDate) {
      existingDate.times.push(time);
    } else {
      court.dates.push({ year, month, date, times: [time] });
    }
  }

  private createMarkdownMessage(courts: GroupedAvailableTime[]): string {
    let msg = ``;

    courts.forEach((court) => {
      msg += `### ${court.courtName}\n`;

      court.dates.forEach((date) => {
        msg += this.formatDateSection(date);
      });
    });

    return msg.trim();
  }

  private formatDateSection(date: DateWithTimes): string {
    const targetDate = new Date();
    targetDate.setFullYear(date.year, date.month - 1, date.date);
    const formattedDate = format(targetDate, "MMM do (E)", { locale: ko });

    let section = `- **${formattedDate}** \n`;

    date.times.forEach((time) => {
      // section += `[${time}](${url})`;
      section += `${time}\n`;
    });

    return section + "\n";
  }

  private handleError(context: string, error: unknown): void {
    this.logger.error(context);
    if (error instanceof Error) {
      this.logger.error(error.message);
    } else if (error) {
      this.logger.error(String(error));
    }
  }
}
