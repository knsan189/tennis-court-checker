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

  private checkDateIsWednesday(date: number, calendar: CalendarEntity): boolean {
    this.today = new Date();
    this.today.setFullYear(calendar.year);
    this.today.setDate(date);
    this.today.setMonth(calendar.month - 1);
    const dayOfWeek = this.today.getDay();
    return dayOfWeek === 3;
  }

  private checkIsNightTime(time: CourtAvailableTime["time"]): boolean {
    const nightTime = ["19:00", "20:00", "21:00", "22:00"];
    return nightTime.includes(time);
  }

  public static getInstance() {
    if (!this.instance) {
      this.instance = new HTMLParser();
    }
    return this.instance;
  }

  private parseListItem(li: cheerio.Cheerio<cheerio.Element>): CourtAvailableTime["time"] {
    return li.text().trim().replace(this.regex, "").replace(" [신청]", "");
  }

  private createCourtAvailability(
    date: number,
    time: string,
    courtName: string,
    courtType: string,
    courtNumber: string,
    calendar: CalendarEntity
  ): CourtAvailableTime {
    const courtData = {
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

    return { ...courtData, url: this.createLink(courtData) };
  }

  public async parseHTML(
    htmlString: string,
    calendar: CalendarEntity,
    courtType: string,
    courtNumber: string
  ): Promise<CourtAvailableTime[]> {
    try {
      this.holidays = await this.holidayService.fetchHoliday(calendar);
      const $ = cheerio.load(htmlString);
      const courtName = $("option:selected", $("#flag")).text().trim();
      const availableTimes: CourtAvailableTime[] = [];

      $("td", $(".calendar")).each((_, tdElement) => {
        const td = $(tdElement);
        const date = Number($("span.day", td).text().trim());

        if (this.checkDateIsWeekend(date, calendar) || this.checkDateIsHoliday(date, calendar)) {
          $("li.blu", $("ul", td)).each((_, element) => {
            const time = this.parseListItem($(element));
            availableTimes.push(
              this.createCourtAvailability(date, time, courtName, courtType, courtNumber, calendar)
            );
          });
        }

        if (this.checkDateIsWednesday(date, calendar)) {
          $("li.blu", $("ul", td)).each((_, element) => {
            const time = this.parseListItem($(element));
            if (this.checkIsNightTime(time.split("~")[0])) {
              availableTimes.push(
                this.createCourtAvailability(
                  date,
                  time,
                  courtName,
                  courtType,
                  courtNumber,
                  calendar
                )
              );
            }
          });
        }
      });

      return availableTimes;
    } catch (error) {
      console.error("Error parsing HTML:", error);
      return [];
    }
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
