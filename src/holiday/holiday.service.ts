import Axios from "axios";
import { OPEN_API_SERVICE_KEY } from "../app/config.js";
import { Calendar } from "../court/dto/calender.dto.js";

export interface Holiday {
  month: number;
  day: number;
}

interface FetchHolidayResponse {
  response: {
    header: {
      resultCode: string;
      resultMsg: string;
    };
    body: {
      items: {
        item?: {
          dateKind: string;
          dateName: string;
          locdate: number;
        }[];
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

  constructor() {
    const URL = "http://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService";
    this.axios = Axios.create({
      baseURL: URL,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  private separateMonthDay(locdate: number) {
    const date = locdate.toString();
    const month = parseInt(date.substring(4, 6), 10);
    const day = parseInt(date.substring(6, 8), 10);
    return { month, day };
  }

  public async fetchHoliday(calendar: Calendar) {
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
        ServiceKey: OPEN_API_SERVICE_KEY
      }
    });

    const holidays =
      response.data.response.body.items.item?.map((item) => this.separateMonthDay(item.locdate)) ||
      [];

    if (this.responseMap.size > 12) {
      this.responseMap.clear();
    }

    this.responseMap.set(key, holidays);
    return holidays;
  }
}
