export interface CourtAvailableTime {
  id: string;
  month: number;
  year: number;
  date: number;
  time: string;
  /** 코트 이름  ex) 테니스장1 */
  courtName: string;
  /** 공원 타입 */
  courtType: string;
  /** 코트 ID */
  courtNumber: string;
  url: string;
}
