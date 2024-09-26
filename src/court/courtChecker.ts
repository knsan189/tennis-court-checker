import Axios from "axios";
import HTMLParser, { AvailableDate, CourtInfo } from "../htmlParser.js";
import Mailer from "../mailer.js";
import Logger from "../logger.js";
import { API_URL, COURT_FLAGS, COURT_TYPE, INTERVAL_TIME, MAIL_TITLE } from "../config.js";
import HolidayService, { Holiday } from "../holiday.js";
import MessageService from "../message.js";

const logger = Logger.getInstance();
const holidayService = new HolidayService();
const messageService = new MessageService();
let today: Date;

export default class CourtChecker {
  private axios;

  private intervalTime = 1000 * 60 * Number(INTERVAL_TIME);

  private courtNumbers = COURT_FLAGS;

  private holidays: Holiday[] = [];

  private targetMonths: number[] = [];

  private htmlParser = new HTMLParser();

  private mailer = new Mailer();

  /** 중복 메일 전송 방지를 위한 Set */
  private DateSet = new Set<string>();

  constructor() {
    const URL = API_URL;
    this.axios = Axios.create({
      baseURL: URL,
      headers: {
        "Content-Type": "application/json"
      }
    });
    const thisMonth = new Date().getMonth() + 1;
    this.targetMonths.push(thisMonth, thisMonth > 11 ? 1 : thisMonth + 1);
  }

  private async fetchHTML(courtNumber: string, month: number) {
    const response = await this.axios({
      params: {
        types: COURT_TYPE,
        flag: courtNumber,
        menuLevel: 2,
        menuNo: 351,
        year: 2024,
        month
      }
    });

    return this.htmlParser.parseHTML(response.data, month, courtNumber, this.holidays);
  }

  private checkIsMailSended(title: string, month: number, date: number, time: string) {
    const key = `${title}-${month}-${date}-${time}`;
    return this.DateSet.has(key);
  }

  private getAvailableCourts(courtInfos: CourtInfo[]): CourtInfo[] {
    const availableCourts: CourtInfo[] = [];

    courtInfos.forEach((courtInfo) => {
      if (courtInfo.availableDates.length === 0) {
        return;
      }

      const newAvailableCourt: CourtInfo = {
        title: courtInfo.title,
        month: courtInfo.month,
        flag: courtInfo.flag,
        availableDates: []
      };

      courtInfo.availableDates.forEach((availableDate) => {
        if (availableDate.availableTimes.length === 0) return;

        const newAvailableDate: AvailableDate = {
          month: availableDate.month,
          date: availableDate.date,
          availableTimes: []
        };

        availableDate.availableTimes.forEach((availableTime) => {
          if (
            this.checkIsMailSended(
              newAvailableCourt.title,
              availableTime.month,
              availableTime.date,
              availableTime.time
            )
          )
            return;
          newAvailableDate.availableTimes.push(availableTime);
          this.DateSet.add(
            `${newAvailableCourt.title}-${availableTime.month}-${availableTime.date}-${availableTime.time}`
          );
        });
        if (newAvailableDate.availableTimes.length > 0)
          newAvailableCourt.availableDates.push(newAvailableDate);
      });
      if (newAvailableCourt.availableDates.length > 0) availableCourts.push(newAvailableCourt);
    });

    if (availableCourts.length === 0) {
      logger.log("예약 가능한 코트가 없습니다.");
    } else {
      logger.log(`예약 가능한 코트 총 ${availableCourts.length} 곳`);
    }
    return availableCourts;
  }

  private async sendMail(courts: CourtInfo[]) {
    if (courts.length === 0) return;
    const html = this.htmlParser.generateHTML(courts);
    await this.mailer.sendMail(html, `${MAIL_TITLE} 예약 가능 코트 ${courts.length} 곳`);
  }

  private async getHolidays() {
    logger.log("공휴일 정보 가져오는 중");
    const holidayPromiseArr = this.targetMonths.map((month) => holidayService.fetchHoliday(month));
    this.holidays = (await Promise.all(holidayPromiseArr)).flat();
    logger.log(this.holidays.length, "개의 공휴일 정보 가져옴");
  }

  private async getCourts() {
    logger.log("사이트 크롤링 시작");
    const promiseArr = this.targetMonths
      .map((month) => this.courtNumbers.map((courtNumber) => this.fetchHTML(courtNumber, month)))
      .flat();
    const courts = await Promise.all(promiseArr);
    logger.log("사이트 크롤링 완료");
    return courts;
  }

  private async checkDateChanged() {
    if (!today || today.getDate() !== new Date().getDate()) {
      today = new Date();
      this.DateSet.clear();
      await this.getHolidays();
    }
  }

  private async sendMessage(courts: CourtInfo[]) {
    if (courts.length === 0) return;
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

    await messageService.sendMessageQueue(message);
  }

  private async init() {
    try {
      logger.log("시작");
      await this.checkDateChanged();
      const courts = await this.getCourts();
      const availableCourts = this.getAvailableCourts(courts);
      await this.sendMessage(availableCourts);
      // await this.sendMail(availableCourts);
      logger.log("종료");
    } catch (error) {
      logger.error("에러 발생");
      if (error instanceof Error) logger.error(error.message);
    }
  }

  public startChecking() {
    logger.log("start checking", INTERVAL_TIME || 0, "분 간격으로 실행");
    setInterval(() => this.init(), this.intervalTime);
    this.init();
  }
}
