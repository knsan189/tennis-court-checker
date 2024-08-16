import Axios from "axios";
import HTMLParser, { AvailableDate, CourtInfo } from "./htmlParser.js";
import Mailer from "./mailer.js";
import Logger from "./logger.js";
import { API_URL, COURT_FLAGS, COURT_TYPE, INTERVAL_TIME, MAIL_TITLE } from "./config.js";

const logger = Logger.getInstance();
let today = new Date();

export default class CourtChecker {
  private axios;

  private intervalTime = 1000 * 60 * Number(INTERVAL_TIME);

  private courtNumbers = COURT_FLAGS;

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

    return this.htmlParser.parseHTML(response.data, month, courtNumber);
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

  private async checkAllCourts() {
    try {
      logger.log("시작");

      if (today.getDate() !== new Date().getDate()) {
        this.DateSet.clear();
        today = new Date();
      }

      const promiseArr = this.targetMonths
        .map((month) => this.courtNumbers.map((courtNumber) => this.fetchHTML(courtNumber, month)))
        .flat();

      const courtInfos = await Promise.all(promiseArr);
      const availableCourts = this.getAvailableCourts(courtInfos);
      await this.sendMail(availableCourts);
      logger.log("종료");
    } catch (error) {
      logger.error("에러 발생");
    }
  }

  public startChecking() {
    logger.log("start checking", INTERVAL_TIME || 0, "분 간격으로 실행");
    setInterval(() => this.checkAllCourts(), this.intervalTime);
    this.checkAllCourts();
  }
}
