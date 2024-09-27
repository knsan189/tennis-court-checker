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
