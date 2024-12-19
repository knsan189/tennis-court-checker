import Axios, { AxiosInstance } from "axios";
import HTMLParser from "./utils/htmlParser.js";
import { AvailableDate, CourtEntity } from "./entities/court.entity.js";
import { CalendarEntity } from "./entities/calender.entity.js";
import { COURT_VIEW_URL } from "./court.config.js";

export default class CourtService {
  private axios: AxiosInstance;

  private htmlParser = new HTMLParser();

  private DateSet = new Set<string>();

  private courts: CourtEntity[] = [];

  private today = new Date();

  private timestamp: Date = new Date();

  private static instance: CourtService;

  constructor() {
    this.axios = Axios.create({
      baseURL: COURT_VIEW_URL
    });
  }

  public static getInstance() {
    if (!CourtService.instance) {
      CourtService.instance = new CourtService();
    }
    return CourtService.instance;
  }

  private checkDuplicate(title: string, month: number, date: number, time: string) {
    const key = `${title}-${month}-${date}-${time}`;
    return this.DateSet.has(key);
  }

  private async fetchHTML(courtType: string, courtNumber: string, calendar: CalendarEntity) {
    const response = await this.axios({
      params: {
        types: courtType,
        flag: courtNumber,
        menuLevel: 2,
        menuNo: 351,
        year: calendar.year,
        month: calendar.month
      }
    });
    return response.data;
  }

  public async fetchCourt(courtType: string, courtNumber: string, calendar: CalendarEntity) {
    const html = await this.fetchHTML(courtType, courtNumber, calendar);
    const court = await this.htmlParser.parseHTML(html, calendar, courtType, courtNumber);
    return court;
  }

  public async fetchAllCourts(
    courtType: string,
    courtNumbers: string[],
    calendars: CalendarEntity[]
  ) {
    const promiseArray = calendars
      .map((calendar) =>
        courtNumbers.map((courtNumber) => this.fetchCourt(courtType, courtNumber, calendar))
      )
      .flat();

    this.timestamp = new Date();
    this.courts = await Promise.all(promiseArray);
    return this.courts;
  }

  public async fetchAvailableCourts(
    courtType: string,
    courtNumbers: string[],
    calendars: CalendarEntity[]
  ) {
    await this.fetchAllCourts(courtType, courtNumbers, calendars);
    return this.filterDuplicateCourts(this.courts);
  }

  public async filterDuplicateCourts(courts: CourtEntity[]) {
    const availableCourts: CourtEntity[] = [];

    if (this.today.getDate() !== new Date().getDate()) {
      this.DateSet.clear();
      this.today = new Date();
    }

    courts.forEach((courtInfo) => {
      if (courtInfo.availableDates.length === 0) {
        return;
      }

      const newAvailableCourt: CourtEntity = {
        title: courtInfo.title,
        month: courtInfo.month,
        year: courtInfo.year,
        courtType: courtInfo.courtType,
        courtNumber: courtInfo.courtNumber,
        availableDates: []
      };

      courtInfo.availableDates.forEach((availableDate) => {
        if (availableDate.availableTimes.length === 0) return;

        const newAvailableDate: AvailableDate = {
          year: availableDate.year,
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

  public getLatestResponse() {
    return { courts: this.courts, timestamp: this.timestamp, size: this.courts.length };
  }
}
