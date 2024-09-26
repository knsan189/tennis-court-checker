import Axios from "axios";
import { OPEN_API_SERVICE_KEY } from "./config.js";

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

  public async fetchHoliday(month: number) {
    const response = await this.axios<FetchHolidayResponse>({
      url: "/getRestDeInfo",
      params: {
        solYear: new Date().getFullYear(),
        solMonth: month,
        _type: "json",
        ServiceKey: OPEN_API_SERVICE_KEY
      }
    });

    return (
      response.data.response.body.items.item?.map((item) => this.separateMonthDay(item.locdate)) ||
      []
    );
  }
}
