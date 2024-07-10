import * as cheerio from "cheerio";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import html from "html-template-tag";
import { RESERVATION_URL } from "./config.js";

export interface CourtInfo {
  title: string;
  availableDates: AvailableDate[];
  month: number;
  flag: string;
}

export interface AvailableDate {
  month: number;
  date: number;
  availableTimes: AvailableTime[];
}

export interface AvailableTime {
  month: number;
  date: number;
  time: string;
}

class HTMLParser {
  private regex = /\n|\t/g;

  private today = new Date();

  private checkDateIsWeekend(date: number, month: number): boolean {
    this.today.setDate(date);
    this.today.setMonth(month - 1);
    const dayOfWeek = this.today.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  }

  public parseHTML(htmlString: string, month: number, courtNumber: string): CourtInfo {
    const $ = cheerio.load(htmlString);
    const select = $("#flag");
    const option = $("option:selected", select);

    const courtInfo: CourtInfo = {
      title: option.text().trim(),
      month,
      availableDates: [],
      flag: courtNumber
    };

    const calendar = $(".calendar");
    $("td", calendar).each((i, tdElement) => {
      const td = $(tdElement);
      const date = Number($("span.day", td).text().trim());
      const today = new Date().getDate();
      if (date <= today || !this.checkDateIsWeekend(date, month)) return;
      const ul = $("ul", td);
      const availableTimes: AvailableTime[] = [];
      $("li.blu", ul).each((j, liElement) => {
        const li = $(liElement);
        const time = li.text().trim().replace(this.regex, "").replace(" [신청]", "");
        availableTimes.push({ time, date, month });
      });
      if (availableTimes.length > 0) courtInfo.availableDates.push({ date, month, availableTimes });
    });

    return courtInfo;
  }

  private createLink(court: CourtInfo): string {
    const link = new URL(RESERVATION_URL || "");
    link.searchParams.append("flag", court.flag);
    link.searchParams.append("month", court.month.toString());
    link.searchParams.append("year", this.today.getFullYear().toString());
    link.searchParams.append("types", "8");
    link.searchParams.append("menuLevel", "2");
    link.searchParams.append("menuNo", "351");
    return link.toString();
  }

  public generateHTML(courtInfos: CourtInfo[]): string {
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
