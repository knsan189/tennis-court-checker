export interface CourtEntity {
  title: string;
  availableDates: AvailableDate[];
  month: number;
  year: number;
  courtType: string;
  courtNumber: string;
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
