import Axios from "axios";
import { CalendarEntity } from "../court/entities/calender.entity.js";
import { HOLIDAY_API_SERVICE_KEY, HOLIDAY_API_URL } from "./holiday.config.js";
import Logger from "../app/logger.js";

export interface Holiday {
  month: number;
  day: number;
}

interface HolidayItem {
  dateKind: string;
  dateName: string;
  locdate: number;
}

interface FetchHolidayResponse {
  response: {
    header: {
      resultCode: string;
      resultMsg: string;
    };
    body: {
      items: {
        item?: HolidayItem[] | HolidayItem;
      };
      numOfRows: number;
      pageNo: number;
      totalCount: number;
    };
  };
}

export default class HolidayService {
  private axios;

  private responseMap: Map<string, Holiday[]> = new Map();

  private logger = Logger.getInstance();

  constructor() {
    this.axios = Axios.create({
      baseURL: HOLIDAY_API_URL,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  public static getInstance() {
    return new HolidayService();
  }

  private separateMonthDay(locdate: number) {
    const date = locdate.toString();
    const month = parseInt(date.substring(4, 6), 10);
    const day = parseInt(date.substring(6, 8), 10);
    return { month, day };
  }

  public async fetchHoliday(calendar: CalendarEntity): Promise<Holiday[]> {
    try {
      const key = `${calendar.year}-${calendar.month}`;
      const cache = this.responseMap.get(key);

      if (cache) {
        return cache;
      }

      const response = await this.axios<FetchHolidayResponse>({
        url: "/getRestDeInfo",
        params: {
          solYear: calendar.year,
          solMonth: calendar.month,
          _type: "json",
          ServiceKey: HOLIDAY_API_SERVICE_KEY
        }
      });

      const holidayItems = response.data.response.body.items.item;

      if (!holidayItems) {
        return [];
      }

      let holidays: Holiday[] = [];

      if (Array.isArray(holidayItems)) {
        holidays = holidayItems.map((item) => this.separateMonthDay(item.locdate));
      } else {
        holidays = [this.separateMonthDay(holidayItems.locdate)];
      }

      if (this.responseMap.size > 12) {
        this.responseMap.clear();
      }

      this.responseMap.set(key, holidays);
      return holidays;
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(error.message);
      }
      return [];
    }
  }
}
