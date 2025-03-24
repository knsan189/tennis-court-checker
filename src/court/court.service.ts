import Axios, { AxiosInstance } from "axios";
import HTMLParser from "./utils/htmlParser.js";
import { CourtAvailableTime } from "./entities/court.entity.js";
import { CalendarEntity } from "./entities/calender.entity.js";
import { COURT_VIEW_URL } from "./court.config.js";

export default class CourtService {
  private axios: AxiosInstance;

  private htmlParser = HTMLParser.getInstance();

  private DateSet = new Set<string>();

  private availableTimes: CourtAvailableTime[] = [];

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

  public async fetchCourtsAvailableTimes(
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
    const responses = await Promise.all(promiseArray);
    this.availableTimes = responses.flat();
    return this.availableTimes;
  }

  public async fetchAvailableCourts(
    courtType: string,
    courtNumbers: string[],
    calendars: CalendarEntity[]
  ) {
    await this.fetchCourtsAvailableTimes(courtType, courtNumbers, calendars);
    return this.filterDuplicates(this.availableTimes);
  }

  public async filterDuplicates(availableTimes: CourtAvailableTime[]) {
    if (this.today.getDate() !== new Date().getDate()) {
      this.DateSet.clear();
      this.today = new Date();
    }

    return availableTimes.filter((time) => {
      if (this.DateSet.has(time.id)) {
        return false;
      }
      this.DateSet.add(time.id);
      return true;
    });
  }

  public getLatestResponse() {
    return {
      availableTimes: this.availableTimes,
      timestamp: this.timestamp,
      size: this.availableTimes.length
    };
  }
}
