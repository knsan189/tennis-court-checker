export interface CalendarEntity {
  month: number;
  year: number;
}

export interface CalendarDateEntity extends CalendarEntity {
  date: number;
}
