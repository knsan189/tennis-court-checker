import Axios from "axios";
import HTMLParser, { AvailableDate, AvailableTime, CourtInfo } from "./htmlParser.js";
import Mailer from "./mailer.js";
import { configDotenv } from "dotenv";

configDotenv();

const API_URL = process.env.API_URL;

if (!API_URL) {
  throw new Error("환경변수가 설정되지 않았습니다.");
}

const DateSet = new Set<string>();

export default class CourtChecker {
  private axios;
  private intervalTime = 1000 * 60 * 60 * 2; // 2시간 간격으로 실행
  private courtNumbers = ["07", "08", "09", "10", "11", "12", "13", "14"];
  private targetMonths: number[] = [];

  private htmlParser = new HTMLParser();
  private mailer = new Mailer();

  constructor() {
    const URL = "https://www.auc.or.kr/reservation/program/rental/calendarView";
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
      method: "get",
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

  private async sendMail(text: string) {
    this.mailer.sendMail(text);
  }

  private checkIsMailSended(title: string, month: number, date: number, time: string) {
    const key = `${title}-${month}-${date}-${time}`;
    return DateSet.has(key);
  }

  private async checkAvailableTime(courtInfos: CourtInfo[]) {
    const availableCourts: CourtInfo[] = [];

    courtInfos.forEach((courtInfo) => {
      if (courtInfo.availableDates.length === 0) {
        return;
      }

      console.log(courtInfo.availableDates);
      const availableCourt: CourtInfo = {
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
              courtInfo.title,
              availableTime.month,
              availableTime.date,
              availableTime.time,
            )
          )
            return;
          newAvailableDate.availableTimes.push(availableTime);
          DateSet.add(`${availableTime.month}-${availableTime.date}-${availableTime.time}`);
        });
        availableCourt.availableDates.push(newAvailableDate);
      });
      availableCourts.push(availableCourt);
    });

    if (availableCourts.length === 0) {
      console.log("[예약 가능한 코트가 없습니다.]", new Date().toLocaleString());
      return;
    }

    const text = availableCourts
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

    console.log(
      "[메일 전송]",
      new Date().toLocaleString(),
      "가능한 코트",
      availableCourts.length,
      "곳",
    );

    this.sendMail(text);
  }

  private async getAvailableTime() {
    const currentTime = new Date();
    console.log("[시작]", currentTime.toLocaleString());
    const promiseArr = this.targetMonths
      .map((month) => this.courtNumbers.map((courtNumber) => this.fetchHTML(courtNumber, month)))
      .flat();

    const courtInfos = await Promise.all(promiseArr);
    this.checkAvailableTime(courtInfos);
  }

  public startChecking() {
    setInterval(() => this.getAvailableTime(), this.intervalTime);
    this.getAvailableTime();
  }
}
