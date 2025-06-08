import * as cheerio from "cheerio";
import HolidayService, { Holiday } from "../../holiday/holiday.service.js";
import { CourtAvailableTime } from "../entities/court.entity.js";
import { CalendarEntity } from "../entities/calender.entity.js";
import { COURT_RESERVATION_URL } from "../court.config.js";

class HTMLParser {
  private static instance: HTMLParser;
  private readonly WHITESPACE_REGEX = /\n|\t/g;
  private readonly NIGHT_TIMES = ["19:00", "20:00", "21:00"];
  private readonly WEEKEND_DAYS = [0, 6];
  private readonly WEDNESDAY = 3;
  private readonly DEFAULT_START_HOUR = 15; // 기본 시작 시간 (오후 3시)

  private courtName = "";
  private courtType = "";
  private calendar: CalendarEntity = { month: 0, year: 0 };
  private courtNumber = "";
  private holidays: Holiday[] = [];
  private $: cheerio.CheerioAPI = cheerio.load("");
  private startHour: number = this.DEFAULT_START_HOUR;

  private readonly holidayService = HolidayService.getInstance();

  private constructor() {}

  public static getInstance(): HTMLParser {
    if (!HTMLParser.instance) {
      HTMLParser.instance = new HTMLParser();
    }
    return HTMLParser.instance;
  }

  public setStartHour(hour: number): void {
    if (hour >= 0 && hour <= 23) {
      this.startHour = hour;
    } else {
      throw new Error("Start hour must be between 0 and 23");
    }
  }

  public getStartHour(): number {
    return this.startHour;
  }

  private createDateForCalendar(day: number): Date {
    const date = new Date();
    date.setFullYear(this.calendar.year);
    date.setMonth(this.calendar.month - 1);
    date.setDate(day);
    return date;
  }

  private isHoliday(day: number): boolean {
    return this.holidays.some(
      (holiday) => holiday.day === day && holiday.month === this.calendar.month
    );
  }

  private isWeekend(day: number): boolean {
    const dayOfWeek = this.createDateForCalendar(day).getDay();
    return this.WEEKEND_DAYS.includes(dayOfWeek);
  }

  private isWednesday(day: number): boolean {
    return this.createDateForCalendar(day).getDay() === this.WEDNESDAY;
  }

  private isNightTime(time: string): boolean {
    return this.NIGHT_TIMES.includes(time);
  }

  private parseListItem(li: cheerio.Cheerio<cheerio.Element>): string {
    return li.text().trim().replace(this.WHITESPACE_REGEX, "").replace(" [신청]", "");
  }

  private createCourtAvailability(day: number, time: string): CourtAvailableTime {
    const courtData = {
      id: `${this.courtNumber}-${this.calendar.year}-${this.calendar.month}-${day}-${time}`,
      date: day,
      time,
      courtName: this.courtName,
      courtType: this.courtType,
      courtNumber: this.courtNumber,
      month: this.calendar.month,
      year: this.calendar.year,
      url: ""
    };
    return { ...courtData, url: this.createReservationLink(courtData) };
  }

  private processWeekendOrHoliday(
    td: cheerio.Cheerio<cheerio.Element>,
    day: number
  ): CourtAvailableTime[] {
    const availableTimes: CourtAvailableTime[] = [];
    this.$("li.blu", this.$("ul", td)).each((_, element) => {
      const time = this.parseListItem(this.$(element));
      const startTime = time.split("~")[0];
      if (parseInt(startTime.split(":")[0]) >= this.startHour) {
        availableTimes.push(this.createCourtAvailability(day, time));
      }
    });
    return availableTimes;
  }

  private processWednesday(
    td: cheerio.Cheerio<cheerio.Element>,
    day: number
  ): CourtAvailableTime[] {
    const availableTimes: CourtAvailableTime[] = [];
    this.$("li.blu", this.$("ul", td)).each((_, element) => {
      const time = this.parseListItem(this.$(element));
      const startTime = time.split("~")[0];
      if (this.isNightTime(startTime)) {
        availableTimes.push(this.createCourtAvailability(day, time));
      }
    });
    return availableTimes;
  }

  public async parseHTML(
    htmlString: string,
    calendar: CalendarEntity,
    courtType: string,
    courtNumber: string
  ): Promise<CourtAvailableTime[]> {
    try {
      this.$ = cheerio.load(htmlString, null, false);

      // Initialize state
      this.calendar = calendar;
      this.courtType = courtType;
      this.courtNumber = courtNumber;
      this.courtName = this.$("option:selected", this.$("#flag")).text().trim();
      this.holidays = await this.holidayService.fetchHoliday(calendar);

      return this.extractAvailableTimes();
    } catch (error) {
      console.error("Error parsing HTML:", error);
      return [];
    }
  }

  private extractAvailableTimes(): CourtAvailableTime[] {
    const availableTimes: CourtAvailableTime[] = [];

    const tdElements = this.$(".calendar td").toArray();

    for (const tdElement of tdElements) {
      const td = this.$(tdElement);
      const dayText = this.$("span.day", td).text().trim();
      const day = Number(dayText);

      if (!day) continue;

      if (this.isWeekend(day) || this.isHoliday(day)) {
        availableTimes.push(...this.processWeekendOrHoliday(td, day));
      } else if (this.isWednesday(day)) {
        availableTimes.push(...this.processWednesday(td, day));
      }
    }

    return availableTimes;
  }

  public createReservationLink(availableTime: CourtAvailableTime): string {
    const link = new URL(COURT_RESERVATION_URL);
    link.searchParams.append("flag", availableTime.courtNumber);
    link.searchParams.append("month", availableTime.month.toString());
    link.searchParams.append("year", availableTime.year.toString());
    link.searchParams.append("types", availableTime.courtType);
    link.searchParams.append("menuLevel", "2");
    link.searchParams.append("menuNo", "351");
    return link.toString();
  }
}

export default HTMLParser;
