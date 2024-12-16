import type { CalendarEntity } from "./calender.entity";

export interface CourtEntity {
  title: string;
  availableDates: AvailableDate[];
  month: number;
  year: number;
  courtType: string;
  courtNumber: string;
}

export interface AvailableDate extends CalendarEntity {
  date: number;
  availableTimes: AvailableTime[];
}

export interface AvailableTime extends CalendarEntity {
  date: number;
  time: string;
}
