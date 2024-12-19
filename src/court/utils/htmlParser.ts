import * as cheerio from "cheerio";
import HolidayService, { Holiday } from "../../holiday/holiday.service.js";
import { AvailableTime, CourtEntity } from "../entities/court.entity.js";
import { CalendarEntity } from "../entities/calender.entity.js";
import { COURT_RESERVATION_URL } from "../court.config.js";

class HTMLParser {
  private regex = /\n|\t/g;

  private today = new Date();

  private holidays: Holiday[] = [];

  private holidayService = HolidayService.getInstance();

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
    return new HTMLParser();
  }

  public async parseHTML(
    htmlString: string,
    calendar: CalendarEntity,
    courtType: string,
    courtNumber: string
  ): Promise<CourtEntity> {
    this.holidays = await this.holidayService.fetchHoliday(calendar);

    const $ = cheerio.load(htmlString);
    const select = $("#flag");
    const option = $("option:selected", select);
    const courtInfo: CourtEntity = {
      title: option.text().trim(),
      year: calendar.year,
      month: calendar.month,
      availableDates: [],
      courtNumber,
      courtType
    };

    const calendarElement = $(".calendar");
    $("td", calendarElement).each((i, tdElement) => {
      const td = $(tdElement);
      const date = Number($("span.day", td).text().trim());
      if (
        this.checkDateIsWeekend(date, calendar) ||
        this.holidays.some((holiday) => holiday.day === date && holiday.month === calendar.month)
      ) {
        const ul = $("ul", td);
        const availableTimes: AvailableTime[] = [];
        $("li.blu", ul).each((j, liElement) => {
          const li = $(liElement);
          const time = li.text().trim().replace(this.regex, "").replace(" [신청]", "");
          availableTimes.push({ ...calendar, time, date });
        });
        if (availableTimes.length > 0)
          courtInfo.availableDates.push({
            ...calendar,
            date,
            month: calendar.month,
            availableTimes
          });
      }
    });

    return courtInfo;
  }

  public createLink(court: CourtEntity): string {
    const link = new URL(COURT_RESERVATION_URL);
    link.searchParams.append("flag", court.courtNumber);
    link.searchParams.append("month", court.month.toString());
    link.searchParams.append("year", court.year.toString());
    link.searchParams.append("types", court.courtType);
    link.searchParams.append("menuLevel", "2");
    link.searchParams.append("menuNo", "351");
    return link.toString();
  }
}

export default HTMLParser;
