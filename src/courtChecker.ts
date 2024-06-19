import Axios from "axios";
import HTMLParser, { AvailableDate, AvailableTime, CourtInfo } from "./htmlParser.js";
import Mailer from "./mailer.js";
import { configDotenv } from "dotenv";
import Logger from "./logger.js";

configDotenv();
const logger = Logger.getInstance();

const API_URL = process.env.API_URL;

if (!API_URL) {
  throw new Error("환경변수가 설정되지 않았습니다.");
}

// 중복 메일 전송 방지를 위한 Set
const DateSet = new Set<string>();

export default class CourtChecker {
  private axios;
  private intervalTime = 1000 * 60 * 30; // 30분 간격으로 실행
  private courtNumbers = ["07", "08", "09", "10", "11", "12", "13", "14"];
  private targetMonths: number[] = [];
  private htmlParser = new HTMLParser();
  private mailer = new Mailer();

  constructor() {
    const URL = API_URL;
    this.axios = Axios.create({
      baseURL: URL,
      headers: {
        "Content-Type": "application/json",
      },
    });
    const thisMonth = new Date().getMonth() + 1;
    this.targetMonths.push(thisMonth, thisMonth > 11 ? 1 : thisMonth + 1);
  }

  private async fetchHTML(courtNumber: string, month: number) {
    const response = await this.axios({
      params: {
        types: "8",
        flag: courtNumber,
        menuLevel: 2,
        menuNo: 351,
        year: 2024,
        month,
      },
    });

    return this.htmlParser.parseHTML(response.data, month);
  }

  private checkIsMailSended(title: string, month: number, date: number, time: string) {
    const key = `${title}-${month}-${date}-${time}`;
    return DateSet.has(key);
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
        availableDates: [],
      };

      courtInfo.availableDates.forEach((availableDate) => {
        if (availableDate.availableTimes.length === 0) return;

        const newAvailableDate: AvailableDate = {
          month: availableDate.month,
          date: availableDate.date,
          availableTimes: [],
        };

        availableDate.availableTimes.forEach((availableTime) => {
          if (
            this.checkIsMailSended(
              newAvailableCourt.title,
              availableTime.month,
              availableTime.date,
              availableTime.time,
            )
          )
            return;
          newAvailableDate.availableTimes.push(availableTime);
          DateSet.add(
            `${newAvailableCourt.title}-${availableTime.month}-${availableTime.date}-${availableTime.time}`,
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
    const text = courts
      .map((court) => {
        const dateText = court.availableDates
          .map((date) => {
            const timeText = date.availableTimes.map((time) => `${time.time}`).join("\n");
            return `${date.month}월 ${date.date}일\n${timeText}`;
          })
          .join("\n");
        return `${court.title}\n${dateText}\n`;
      })
      .join("\n");
    await this.mailer.sendMail(text);
  }

  private async checkAllCourts() {
    logger.log("시작");
    const promiseArr = this.targetMonths
      .map((month) => this.courtNumbers.map((courtNumber) => this.fetchHTML(courtNumber, month)))
      .flat();

    const courtInfos = await Promise.all(promiseArr);
    const availableCourts = this.getAvailableCourts(courtInfos);
    await this.sendMail(availableCourts);
    logger.log("종료");
  }

  public startChecking() {
    setInterval(() => this.checkAllCourts(), this.intervalTime);
    this.checkAllCourts();
  }
}
