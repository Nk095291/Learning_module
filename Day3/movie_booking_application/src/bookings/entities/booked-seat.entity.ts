export class BookedSeat {
  id: number;
  seatId: number;
  bookingId: number;
  userId?: number;
  userDOB?: string;
  movieShowingId?: number;
  created_at: Date;
}
