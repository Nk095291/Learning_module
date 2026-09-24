# Architecture Recommendation: Booking Bug Fixes

## Architecture
- **Pattern**: existing simple Nest MVC — thin controllers → services (rules) → shared in-memory `Database`. No new layers, modules, interfaces or providers.
- **New source files (only two)**: `src/bookings/calendar-age.ts` (pure function, not a provider), `src/app.setup.ts` (`configureApp`).
- **Boundaries**: HTTP edge = global ValidationPipe (type checks, D7). Services = domain rules, throw Nest HTTP exceptions. `Database` = owns every cross-module data rule (availability, cascades, "does this seat have bookings") so movies/theaters/seats never depend on bookings.
- **Dependency direction**: controllers → services → Database. Bookings may depend on Users, Movies, Theaters, Database. Movies/Theaters/Users services never import from `bookings/`. Database imports only entity types.

## Placement decisions

### 1. Calendar-age helper — `src/bookings/calendar-age.ts`
- `export function ageOn(dateOfBirth: Date, today: Date): number` — named export, not a provider.
- UTC getters only (`getUTCFullYear/Month/Date`) for both dates (`new Date('YYYY-MM-DD')` parses as UTC midnight).
- Logic: year difference, minus 1 if today's (month, day) is before birth (month, day).
- BookingsService calls `ageOn(birthDate, new Date())`.
- Invalid-date check (`isNaN(birthDate.getTime())` → 400 'Invalid date of birth') stays in the service; helper assumes a valid Date.

### 2. Shared seat-availability rule — in `Database`
- Not in BookedSeatsService (MovieShowingsService would then need bookings module → cycle).
- Add `isSeatBookedForShowing(seatId, movieShowingId): boolean` = `Object.values(this.bookedSeats).some(b => b.movieShowingId === movieShowingId && b.seatId === seatId)`.
- `getAvailableSeats(showingId)` = seats where `theaterId === showing.theaterId && !isSeatBookedForShowing(seat.id, showingId)`.
- `BookedSeatsService.areSeatsAvailable(seatIds, showingId)` = `seatIds.every(id => !this.db.isSeatBookedForShowing(id, showingId))`. `findAllByMovieShowingId` stays.

### 3. Cascade helpers — in `Database`, children deleted before parents
- `removeBookingsByMovieShowingIds(showingIds: number[])`: Set of ids → delete booked seats with movieShowingId in set → delete bookings with movieShowingId in set.
- `removeBookingsByUserId(userId)`: collect that user's booking ids → delete booked seats with those bookingIds → delete bookings.
- `removeMovieShowingsByMovieId(movieId)`: compute showing ids → `removeBookingsByMovieShowingIds(ids)` → delete showings.
- `removeMovieShowingsByTheaterId(theaterId)`: new, same shape. Both may share a private `removeMovieShowingsWhere(predicate)`.
- `hasBookingsForSeat(seatId): boolean` (Slice 7), next to `isSeatBookedForShowing`.
- Service `remove` order (all guards before first delete):
  - MoviesService.remove: findOne (404) → db.removeMovieShowingsByMovieId(id) → delete db.movies[id]
  - TheatersService.remove: findOne (404) → db.removeMovieShowingsByTheaterId(id) → db.removeSeatsByTheaterId(id) → delete db.theaters[id]
  - UsersService.remove: isNaN (400) → mismatch (403) → findOne (404) → db.removeBookingsByUserId(id) → delete db.users[id]
- A booked seat in someone else's booking with userId = deleted user stays (not enriched; not in spec).

### 4. BookingsService.create split (~15 lines)
```
create(dto) {
  const user = this.usersService.findOne(dto.userId);                    // 404
  const showing = this.movieShowingsService.findOne(dto.movieShowingId); // 404
  const seatIds = this.assertSeatSelectionValid(dto.bookedSeats, showing.theaterId);
  this.assertSeatsAvailable(seatIds, showing.id);
  this.assertAgeEligible(dto.bookedSeats, showing.movie.ageRating);
  const booking = this.saveBooking(dto);
  for (const seat of dto.bookedSeats) this.bookedSeatsService.create(seat, booking.id, showing.id);
  return { ...booking, bookedSeats: ..., user, movieShowing: showing };
}
```
Private helpers, each ≤ ~15 lines:
- `assertSeatSelectionValid(bookedSeats: CreateBookedSeatDto[] | undefined, theaterId): number[]` — missing/empty → 'At least one seat must be selected'; duplicates (Set size) → 'Each seat can only be selected once'; per id: `this.db.seats[id]` missing → 'Seat ${id} does not exist'; wrong theater → 'Seat ${id} is not in the theater of this showing'. Use db.seats directly, not SeatsService.findOne. Split out `assertSeatsInTheater` if it grows.
- `assertSeatsAvailable(seatIds, showingId)` — existing check → 'Selected seats are not available'.
- `assertAgeEligible(bookedSeats, ageRating)` — per seat: resolveDateOfBirth → parse → invalid-date check → `ageOn(...) < ageRating` → 400 'User must be at least ${ageRating} to book this movie'.
- `resolveDateOfBirth(seat): string` — `seat.userId !== undefined ? this.usersService.findOne(seat.userId).dob : seat.userDOB` (404 for unknown user); no DOB → 400 'Providing DOB is mandatory for booking'. Then remove `UsersService.getDob`.
- `saveBooking(dto): Booking` — see §5.
- Enrichment duplication in findAll/findOne: out of scope, leave it.

### 5. D5 create-object shape
- Users, movies, movie showings: `{ ...dto, id: this.db.nextXId(), created_at: new Date() }`.
- Theaters, seats: `{ ...dto, id: this.db.nextXId() }` (no created_at added).
- Booked seat: `{ ...dto, id: this.db.nextBookedSeatId(), created_at: new Date(), bookingId, movieShowingId }`.
- Booking: explicit typed fields — `const booking: Booking = { id: this.db.nextBookingId(), userId: dto.userId, movieShowingId: dto.movieShowingId, created_at: new Date() };`
- Database counters: `userId = 3`, `theaterId = 3`; others unchanged.

### 6. Seat update without enrichment (Slice 5)
- Private `SeatsService.getStoredSeat(id)` → `this.db.seats[id]` or 404 'Seat ${id} not found'. Used by update and remove; findOne = `{ ...this.getStoredSeat(id), theater: ... }`.
- update: theaterId guard first, then `Object.assign(stored, dto)`.
- `MoviesService.findAll` → `Object.values(this.db.movies)`.

### 7. Seat delete (Slice 7)
- `SeatsService.remove`: getStoredSeat (404) → `if (this.db.hasBookingsForSeat(id))` throw `ConflictException('Seat ${id} has bookings and cannot be deleted')` → delete.

### 8. DTO decorators (type checks only)
| DTO | Decorators |
|---|---|
| CreateBookingDto | userId, movieShowingId: `@IsInt()`; bookedSeats: `@IsArray() @ArrayNotEmpty() @ValidateNested({ each: true }) @Type(() => CreateBookedSeatDto)` |
| CreateBookedSeatDto | seatId: `@IsInt()`; userId: `@IsOptional() @IsInt()`; userDOB: `@IsOptional() @IsDateString()` |
| CreateUserDto | email: `@IsString()`; dob: `@IsDateString()` |
| CreateMovieDto | title: `@IsString()`; ageRating: `@IsInt()` |
| CreateMovieShowingDto | movieId, theaterId: `@IsInt()`; startTime, endTime, showDate: `@IsString()` |
| CreateTheaterDto | all four: `@IsString()` |
| CreateSeatDto | theaterId, col: `@IsInt()`; seatNumber, row: `@IsString()` |
- Update DTOs stay `PartialType(...)` from @nestjs/mapped-types (inherits metadata, all optional).
- Missing bookedSeats fails @IsArray → 400 (no @IsOptional).
- Without transform, Nest still returns the whitelisted plain object → `id` stripped (AC 8.7).
- `@Headers('user-id') userId: number` and `@Param('id') id: string` have primitive metatypes → pipe skips them (AC 8.8).

### 9. `src/app.setup.ts`
```ts
export function configureApp(app: INestApplication): INestApplication {
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  return app;
}
```
- main.ts: `const app = await NestFactory.create(AppModule); configureApp(app); await app.listen(...)`.
- E2E beforeEach: `app = moduleFixture.createNestApplication(); configureApp(app); await app.init();`. Also add configureApp to existing test/app.e2e-spec.ts.

## Files per slice (test names describe behaviour; never slice/defect numbers)
| Slice | Source | Tests |
|---|---|---|
| 1 Booking rejects invalid seat selections | src/bookings/bookings.service.ts (assertSeatSelectionValid, split create) | src/bookings/bookings.service.spec.ts > create (other-theater test creates seat 4 in theater 2 in `given`) |
| 2 Age eligibility uses calendar age | new src/bookings/calendar-age.ts; bookings.service.ts (assertAgeEligible, resolveDateOfBirth); src/users/users.service.ts (remove getDob) | new src/bookings/calendar-age.spec.ts (fixed-date pure cases: on birthday, day before, Feb 29 birth); bookings.service.spec.ts (relative-DOB cases, invalid DOB, unknown seat user, rewritten underage test). `dobYearsAgo(years, dayOffset = 0)` at top of bookings.service.spec.ts: UTC parts, clamp Feb 29 → Feb 28, `Date.UTC(y, m, d + dayOffset)`, `toISOString().slice(0, 10)` |
| 3 Availability per showing and per seat | src/database/database.service.ts (isSeatBookedForShowing, getAvailableSeats); src/bookings/booked-seats.service.ts (areSeatsAvailable) | new src/movies/movie-showings.service.spec.ts > findOne (showing 2 via MovieShowingsService.create); bookings.service.spec.ts for rebooking/cross-showing |
| 4 Fresh, unique ids | database.service.ts counters; the 7 creates | new users.service.spec.ts, theaters.service.spec.ts, movies.service.spec.ts, seats.service.spec.ts, booked-seats.service.spec.ts; plus movie-showings.service.spec.ts, bookings.service.spec.ts — each `create` > "should ignore a client-supplied id". Pass extra id/created_at via variable or cast (excess-property check) |
| 5 Clean reads/updates | movies.service.ts (findAll); seats.service.ts (getStoredSeat, update) | movies.service.spec.ts > findAll; seats.service.spec.ts > update |
| 6 Cascade deletes | database.service.ts helpers; movies/theaters/users services remove | movies/theaters/users .service.spec.ts > remove; wire real MovieShowingsService, BookingsService, SeatsService by hand |
| 7 Seat delete rejected while booked | seats.service.ts (remove); database.service.ts (hasBookingsForSeat) | seats.service.spec.ts > remove |
| 8 HTTP type-checking | package.json/lock (class-validator, class-transformer); new src/app.setup.ts; src/main.ts; all 7 Create DTOs | new test/bookings.e2e-spec.ts (8.1–8.5); new test/create-requests.e2e-spec.ts (8.6, 8.7); new test/users.e2e-spec.ts (8.8); test/app.e2e-spec.ts updated. Verifier checks 8.9 by reading main.ts + e2e beforeEach |

All paths under M:/Incubyte/Learning_Module/Day3/movie_booking_application/.

## Testability notes
- No mocks; `new Database()` + real services. Database helpers tested through service behaviour (no separate database.service.spec.ts needed).
- All guards before first write; rejection tests assert `Object.keys(db.bookings)` / `db.bookedSeats` and seeded records unchanged.
- AC 3.4 and 3.5 likely pass on today's code (regression guards, not red tests). The red tests for D3 are 3.1/3.2 via getAvailableSeats.
- Midnight flake: helper and service both use UTC "today"; accepted per spec.
- Slice 8 decorator-metadata risk: ValidationPipe needs `design:paramtypes` for @Body DTO. Write AC 8.1 first, watch it fail before adding the pipe, then pass after. Controllers must import DTOs as values, never `import type`.
- Slice 8 dependency check: confirm class-validator/class-transformer load under Nest 12 ESM (app boots, e2e runs).

## Slice order
Keep the current order. No slice depends on a later one.

## Evolution triggers
- Database > ~8 cross-entity/cascade helpers or branching cascade rules → `CascadeDeletes` or per-entity repositories inside database/.
- Real persistence → repository per module, DB FKs ON DELETE CASCADE/RESTRICT, drop in-memory helpers.
- Tests must pin time, or timezone-aware age rules → `Clock` provider in BookingsService.
- A 4th enrichment copy or booking response change → extract `toBookingView(booking)`.
- More movies/theaters rules needing booking data → dependency-free `availability` module or domain events.
- Validation beyond type checks → custom class-validator constraints next to DTOs.
- Concurrency / multiple processes → transactional storage or locking for check-then-write in create.
