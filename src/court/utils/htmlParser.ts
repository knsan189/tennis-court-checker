import * as cheerio from "cheerio";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import html from "html-template-tag";
import HolidayService, { Holiday } from "../../holiday/holiday.service.js";
import { AvailableTime, CourtEntity } from "../entities/court.entity.js";
import { COURT_RESERVATION_URL } from "../court.config.js";
import { CalendarEntity } from "../entities/calender.entity.js";

class HTMLParser {
  private regex = /\n|\t/g;

  private today = new Date();

  private holidays: Holiday[] = [];

  private holidayService = HolidayService.getInstance();

  private checkDateIsWeekend(date: number, month: number): boolean {
    this.today.setDate(date);
    this.today.setMonth(month - 1);
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
        this.checkDateIsWeekend(date, calendar.month) ||
        this.holidays.some((holiday) => holiday.day === date && holiday.month === calendar.month)
      ) {
        const ul = $("ul", td);
        const availableTimes: AvailableTime[] = [];
        $("li.blu", ul).each((j, liElement) => {
          const li = $(liElement);
          const time = li.text().trim().replace(this.regex, "").replace(" [신청]", "");
          availableTimes.push({ time, date, month: calendar.month });
        });
        if (availableTimes.length > 0)
          courtInfo.availableDates.push({ date, month: calendar.month, availableTimes });
      }
    });

    return courtInfo;
  }

  private createLink(court: CourtEntity): string {
    const link = new URL(COURT_RESERVATION_URL);
    link.searchParams.append("flag", court.courtNumber);
    link.searchParams.append("month", court.month.toString());
    link.searchParams.append("year", this.today.getFullYear().toString());
    link.searchParams.append("types", court.courtType);
    link.searchParams.append("menuLevel", "2");
    link.searchParams.append("menuNo", "351");
    return link.toString();
  }

  public generateHTML(courtInfos: CourtEntity[]): string {
    const template = html`
      <!doctype html>
      <html lang="ko">
        <head>
          <meta charset="UTF-8" />
          <title>테니스 코트 예약 가능 시간</title>
        </head>
        <body style="font-family: Arial, sans-serif; margin: 20px;">
          <div style="max-width: 600px; margin: auto;">
            <ul style="list-style-type: none; padding: 0;">
              ${courtInfos.map((court) => {
                const link = this.createLink(court);
                return html`<li
                  style="background-color: #f8f9fa; margin-bottom: 10px; padding: 10px; border-radius: 5px;"
                >
                  <a href="${link.toString()}" style="text-decoration: none; color: #007bff;"
                    >${court.title}</a
                  >
                  <ul style="list-style-type: none; padding: 0; margin-top: 16px;">
                    ${court.availableDates.map((date) => {
                      const targetDate = new Date();
                      targetDate.setMonth(date.month - 1);
                      targetDate.setDate(date.date);
                      return html` <li
                        style="background-color: #f8f9fa; margin-bottom: 10px; padding: 10px; border-radius: 5px;"
                      >
                        ${format(targetDate, "MMM do (E)", { locale: ko })}
                        <ul style="list-style-type: none; padding: 0; margin-top: 8px;">
                          ${date.availableTimes.map(
                            (time) =>
                              html`<li
                                style="display: inline-block; margin-right: 10px; background-color: #f8f9fa; padding: 10px; border-radius: 5px;"
                              >
                                ${time.time}
                              </li>`
                          )}
                        </ul>
                      </li>`;
                    })}
                  </ul>
                </li>`;
              })}
            </ul>
          </div>
        </body>
      </html>
    `;

    return template;
  }
}

export default HTMLParser;
