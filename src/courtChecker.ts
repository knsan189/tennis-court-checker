import Axios from "axios";
import HTMLParser, { CourtInfo } from "./htmlParser.js";
import Mailer from "./mailer.js";
import { configDotenv } from "dotenv";

configDotenv();

const API_URL = process.env.API_URL;

if (!API_URL) {
  throw new Error("환경변수가 설정되지 않았습니다.");
}

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

  private async checkAvailableTime(courtInfos: CourtInfo[]) {
    // 예약 가능한 시간이 있는지 체크
    // 있으면 이메일 발송
    // 없으면 아무것도 하지 않음
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
