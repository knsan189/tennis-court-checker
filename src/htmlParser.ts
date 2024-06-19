import * as cheerio from "cheerio";

export interface CourtInfo {
  title: string;
  availableDates: AvailableDate[];
  month: number;
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

  private checkDateIsWeekend(date: number, month: number): boolean {
    const targetDay = new Date();
    targetDay.setDate(date);
    targetDay.setMonth(month - 1);
    const dayOfWeek = targetDay.getDay();
    return dayOfWeek === 0 || dayOfWeek === 6;
  }

  public parseHTML(htmlString: string, month: number): CourtInfo {
    const $ = cheerio.load(htmlString);
    const select = $("#flag");
    const option = $("option:selected", select).text();
    const courtInfo: CourtInfo = { title: option, month, availableDates: [] };
    const calendar = $(".calendar");
    $("td", calendar).each((i, el) => {
      const td = $(el);
      const date = Number($("span.day", td).text().trim());
      const today = new Date().getDate();
      if (date <= today || !this.checkDateIsWeekend(date, month)) return;
      const ul = $("ul", td);
      const availableTimes: AvailableTime[] = [];
      $("li.blu", ul).each((i, el) => {
        const li = $(el);
        const time = li.text().trim().replace(this.regex, "").replace(" [신청]", "");
        availableTimes.push({ time, date, month });
      });
      if (availableTimes.length > 0) courtInfo.availableDates.push({ date, month, availableTimes });
    });

    return courtInfo;
  }
}

export default HTMLParser;
