export enum BookedSeatStatus {
  RESERVED = 'RESERVED',
  CANCELLED = 'CANCELLED',
}

export class BookedSeat {
  id: number;
  seatId: number;
  seatGroupId: number;
  status: BookedSeatStatus;
  created_at: Date;
}
