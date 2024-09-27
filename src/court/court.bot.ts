import HTMLParser from "./htmlParser.js";
import Logger from "../app/logger.js";
import { COURT_FLAGS, INTERVAL_TIME, MAIL_TITLE } from "../app/config.js";
import HolidayService, { Holiday } from "../holiday/holiday.service.js";
import MailerService from "../mailer/mailer.service.js";
import MessageService from "../message/message.service.js";
import { CourtInfo } from "./dto/court.dto.js";
import { Calendar } from "./dto/calender.dto.js";
import CourtService from "./court.service.js";

export default class CourtChecker {
  private intervalTime = 1000 * 60 * Number(INTERVAL_TIME);

  private courtNumbers = COURT_FLAGS;

  private holidays: Holiday[] = [];

  private targetCalendars: Calendar[] = [];

  private htmlParser = new HTMLParser();

  private mailerService = new MailerService();

  private logger = Logger.getInstance();

  private holidayService = new HolidayService();

  private messageService = new MessageService();

  private courtService = new CourtService();

  private today?: Date;

  private async sendMail(courts: CourtInfo[]) {
    if (courts.length === 0) return;
    this.logger.log("메일 전송 중");
    const html = this.htmlParser.generateHTML(courts);
    await this.mailerService.sendMail(html, `${MAIL_TITLE} 예약 가능 코트 ${courts.length} 곳`);
    this.logger.log("메일 전송 완료");
  }

  private async getHolidays() {
    this.logger.log("공휴일 정보 가져오는 중");
    const holidayPromiseArr = this.targetCalendars.map((calendar) =>
      this.holidayService.fetchHoliday(calendar)
    );
    this.holidays = (await Promise.all(holidayPromiseArr)).flat();
    this.logger.log(this.holidays.length, "개의 공휴일 정보 가져옴");
  }

  private checkDateChanged() {
    return !this.today || this.today.getDate() !== new Date().getDate();
  }

  private async sendMessage(courts: CourtInfo[]) {
    if (courts.length === 0) return;
    this.logger.log("메시지 전송 중");
    let msg = `${MAIL_TITLE} (${courts.length}곳)\n\n`;

    courts.forEach((court) => {
      msg += `${court.title}\n`;
      court.availableDates.forEach((availableDate) => {
        msg += `${availableDate.month}월 ${availableDate.date}일\n`;
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

  private setTargetCalendar() {
    const date = new Date();
    const thisMonth = date.getMonth() + 1;
    const thisYear = date.getFullYear();

    this.targetCalendars = [
      { month: thisMonth, year: thisYear },
      {
        month: thisMonth > 11 ? 1 : thisMonth + 1,
        year: thisMonth > 11 ? thisYear + 1 : thisYear
      }
    ];
    this.logger.log(
      "대상 달 설정 완료",
      this.targetCalendars.map((calendar) => calendar.month).join(", ")
    );
  }

  private async init() {
    try {
      this.logger.log("시작");
      this.setTargetCalendar();
      if (this.checkDateChanged()) {
        this.today = new Date();
        this.courtService.clearDateSet();
        await this.getHolidays();
      }
      this.logger.log("예약 가능한 코트 찾는 중");
      const courts = await this.courtService.fetchAvailableCourts(
        this.courtNumbers,
        this.targetCalendars,
        this.holidays
      );
      this.logger.log("예약 가능한 코트 수", courts.length);

      await this.sendMessage(courts);
      // await this.sendMail(courts);
      this.logger.log("종료");
    } catch (error) {
      this.logger.error("에러 발생");
      if (error instanceof Error) this.logger.error(error.message);
    }
  }

  public startChecking() {
    this.logger.log(MAIL_TITLE, INTERVAL_TIME, "분 간격으로 실행");
    setInterval(() => this.init(), this.intervalTime);
    this.init();
  }
}
