import Axios, { AxiosInstance } from "axios";
import { API_URL, COURT_TYPE } from "../app/config.js";
import HTMLParser from "./htmlParser.js";
import { Holiday } from "../holiday/holiday.service.js";
import { AvailableDate, CourtInfo } from "./dto/court.dto.js";
import { Calendar } from "./dto/calender.dto.js";

export default class CourtService {
  private axios: AxiosInstance;

  private htmlParser = new HTMLParser();

  private DateSet = new Set<string>();

  private courts: CourtInfo[] = [];

  constructor() {
    this.axios = Axios.create({
      baseURL: API_URL,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  private checkDuplicate(title: string, month: number, date: number, time: string) {
    const key = `${title}-${month}-${date}-${time}`;
    return this.DateSet.has(key);
  }

  private async fetchHTML(courtNumber: string, calendar: Calendar) {
    const response = await this.axios({
      params: {
        types: COURT_TYPE,
        flag: courtNumber,
        menuLevel: 2,
        menuNo: 351,
        year: calendar.year,
        month: calendar.month
      }
    });
    return response.data;
  }

  public async fetchCourt(courtNumber: string, calendar: Calendar, holidays: Holiday[]) {
    const html = await this.fetchHTML(courtNumber, calendar);
    return this.htmlParser.parseHTML(html, calendar.month, courtNumber, holidays);
  }

  public async fetchAllCourts(courtNumbers: string[], calendars: Calendar[], holidays: Holiday[]) {
    const promiseArray = calendars
      .map((calendar) =>
        courtNumbers.map((courtNumber) => this.fetchCourt(courtNumber, calendar, holidays))
      )
      .flat();
    this.courts = await Promise.all(promiseArray);
    return this.courts;
  }

  public async fetchAvailableCourts(
    courtNumbers: string[],
    calendars: Calendar[],
    holidays: Holiday[]
  ) {
    const courtInfos = await this.fetchAllCourts(courtNumbers, calendars, holidays);
    return this.filterDuplicateCourts(courtInfos);
  }

  public async filterDuplicateCourts(courts: CourtInfo[]) {
    const availableCourts: CourtInfo[] = [];

    courts.forEach((courtInfo) => {
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
            this.checkDuplicate(
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

    return availableCourts;
  }

  clearDateSet() {
    this.DateSet.clear();
  }
}
