import Axios, { AxiosResponse } from "axios";
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

  private static instance: HolidayService;

  constructor() {
    this.axios = Axios.create({
      baseURL: HOLIDAY_API_URL,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  public static getInstance() {
    if (!HolidayService.instance) {
      this.instance = new HolidayService();
    }
    return this.instance;
  }

  private separateMonthDay(locdate: number) {
    const date = locdate.toString();
    const month = parseInt(date.substring(4, 6), 10);
    const day = parseInt(date.substring(6, 8), 10);
    return { month, day };
  }

  private parseResponse(response: AxiosResponse<FetchHolidayResponse>): Holiday[] {
    if (response.data.response.body.items.item === undefined) {
      return [];
    }
    return Array.isArray(response.data.response.body.items.item)
      ? response.data.response.body.items.item.map((item) => this.separateMonthDay(item.locdate))
      : [this.separateMonthDay(response.data.response.body.items.item.locdate)];
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
          solMonth: calendar.month.toString().padStart(2, "0"),
          _type: "json",
          ServiceKey: HOLIDAY_API_SERVICE_KEY
        }
      });

      const holidays = this.parseResponse(response);

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
