import * as cheerio from "cheerio";
import HolidayService, { Holiday } from "../../holiday/holiday.service.js";
import { CourtAvailableTime } from "../entities/court.entity.js";
import { CalendarEntity } from "../entities/calender.entity.js";
import { COURT_RESERVATION_URL } from "../court.config.js";

class HTMLParser {
  private regex = /\n|\t/g;

  private today = new Date();

  private holidays: Holiday[] = [];

  private holidayService = HolidayService.getInstance();

  private static instance: HTMLParser;

  private checkDateIsHoliday(date: number, calendar: CalendarEntity): boolean {
    return this.holidays.some(
      (holiday) => holiday.day === date && holiday.month === calendar.month
    );
  }

  private checkDateIsWeekend(date: number, calendar: CalendarEntity): boolean {
    this.today = new Date();
    this.today.setFullYear(calendar.year);
    this.today.setDate(date);
    this.today.setMonth(calendar.month - 1);
    const dayOfWeek = this.today.getDay();
    const days = [0, 6];
    return days.includes(dayOfWeek);
  }

  public static getInstance() {
    if (!this.instance) {
      this.instance = new HTMLParser();
    }
    return this.instance;
  }

  public async parseHTML(
    htmlString: string,
    calendar: CalendarEntity,
    courtType: string,
    courtNumber: string
  ): Promise<CourtAvailableTime[]> {
    this.holidays = await this.holidayService.fetchHoliday(calendar);

    const $ = cheerio.load(htmlString);
    const select = $("#flag");
    const option = $("option:selected", select);
    const availableTimes: CourtAvailableTime[] = [];
    const courtName = option.text().trim();
    const calendarElement = $(".calendar");

    $("td", calendarElement).each((i, tdElement) => {
      const td = $(tdElement);
      const date = Number($("span.day", td).text().trim());
      if (this.checkDateIsWeekend(date, calendar) || this.checkDateIsHoliday(date, calendar)) {
        const ul = $("ul", td);
        $("li.blu", ul).each((j, liElement) => {
          const li = $(liElement);
          const time = li.text().trim().replace(this.regex, "").replace(" [신청]", "");
          const newCourt = {
            id: `${courtNumber}-${calendar.year}-${calendar.month}-${date}-${time}`,
            date,
            time,
            courtName,
            courtType,
            courtNumber,
            month: calendar.month,
            year: calendar.year,
            url: ""
          };
          availableTimes.push({ ...newCourt, url: this.createLink(newCourt) });
        });
      }
    });

    return availableTimes;
  }

  public createLink(availableTime: CourtAvailableTime): string {
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
