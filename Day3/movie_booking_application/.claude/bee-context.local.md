## Developer Decisions (inline clarification)
- Scope: fix ALL confirmed bugs from docs/specs/qc-plan.md — D1–D12 plus the 365.25-day birthday age bug.
- D8 delete policy: CASCADE delete (movie → its showings → their bookings + booked seats; theater → its seats + showings → their bookings + booked seats; user → their bookings + booked seats). Seat delete policy: to be decided in spec.
- Nonexistent or other-theater seat in a booking → 400 Bad Request.

## Pre-existing developer edits (uncommitted, made by the developer — preserve them)
- console.log(dob) removed from src/bookings/bookings.service.ts
- User.dob changed from Date to string (src/users/entities/user.entity.ts) and seed users now use dob: '1990-05-12' strings (src/database/database.service.ts)

## Context Summary

### Project Structure
- Stack: TypeScript 6, NestJS 12, ESM ("type": "module", nodenext) — relative imports end in `.js`. strict: true, strictPropertyInitialization: false, vitest/globals types.
- Layout: one Nest feature module per folder under src/: users/, movies/ (movies + movie-showings), theaters/ (theaters + seats), bookings/ (bookings + booked-seats), database/ (in-memory Database provider + @Global DatabaseModule). Each feature has controller, service, module, dto/, entities/.
- class-validator and class-transformer are NOT installed.

### Architecture Pattern
- Simple Nest MVC: thin controllers → services with all rules → shared in-memory Database (seed data, id counters, helpers removeSeatsByTheaterId, removeMovieShowingsByMovieId, getAvailableSeats).
- Dependency direction: BookingsService → UsersService, MovieShowingsService, BookedSeatsService, Database. MovieShowingsService → MoviesService, TheatersService. SeatsService → TheatersService. BookingsModule imports Users, Theaters, Movies modules.
- Cascade risk: Movies/Theaters/Users services must NOT inject bookings-side services (module cycle). Put cascade deletes in Database helpers (matches existing removeSeatsByTheaterId).

### Test Infrastructure
- vitest ^4.1.2, globals: true. Unit tests colocated src/**/*.spec.ts; e2e in test/*.e2e-spec.ts (vitest.config.e2e.ts).
- Run: `npm test` (vitest run), `npm run test:e2e`, `npm run test:cov`.
- Convention: no mocks. beforeEach creates `new Database()` and wires real services manually, e.g. `new BookingsService(db, new UsersService(db), new MovieShowingsService(db, new MoviesService(db), new TheatersService(db)), new BookedSeatsService(db))`. Tests use `// given / // when / // then`. Errors asserted with `expect(fn).toThrow(BadRequestException)` + `toThrow('<message>')`, then assert nothing persisted (`Object.keys(db.bookings)`). Names `it('should ...')`, top describe per service, nested describe per method.
- e2e: Test.createTestingModule({ imports: [AppModule] }) → createNestApplication → app.init in beforeEach, app.close in afterEach; supertest (`import request from 'supertest'`, `App` from 'supertest/types'). Fresh Database per app.
- Clock: not frozen; assertAgeRating uses Date.now(). Existing age test (DOB 2020-01-01, rating 13) time-bombs on 2033-01-01. DEVELOPER DECISION: do NOT freeze the clock (no vi.useFakeTimers). Age tests build userDOB relative to today via a test helper (e.g. dobYearsAgo(years, dayOffset)), using the same timezone as the production calendar-age helper and clamping Feb 29 → Feb 28.
- Existing tests: src/bookings/bookings.service.spec.ts (8 tests), src/app.controller.spec.ts, scaffold test/app.e2e-spec.ts.
- NOTE: docs/specs/qc-plan.md has many items marked [x] by the developer, but the corresponding tests do NOT exist in the repo. Do not assume they exist.

### Conventions
- No CLAUDE.md. oxlint (`npm run lint`), no-explicit-any off. Prettier singleQuote, trailingComma all. Existing formatting uneven — keep formatting churn out of behaviour diffs.
- Services throw Nest NotFoundException / BadRequestException / ForbiddenException with template messages (`User ${id} not found`). Controllers use `+id`. DTOs plain classes, no decorators, no ValidationPipe. Storage: Record<number, Entity> keyed by id.

### Change Area (per bug)
- D1 duplicate seatId: bookings.service.ts create — add duplicate check (Set size) → 400 before areSeatsAvailable.
- D2 nonexistent / other-theater seat → 400: same method; check db.seats[seatId] exists and seat.theaterId === showing.theaterId.
- D3 getAvailableSeats: database.service.ts uses `!this.bookedSeats[seat.id]` (wrong key, no showing filter). Filter Object.values(bookedSeats) by movieShowingId and match seatId. Same rule exists in booked-seats.service.ts areSeatsAvailable. Keeping the rule in Database avoids a Movies→Bookings module cycle; consider one shared rule.
- D4 counters: database.service.ts userId = 2 and theaterId = 2 → should start at 3. Others fine (seat 4, movie 2, showing 2, booking 1, bookedSeat 1).
- D5 body id override: 7 creates use `{ id: next(), ...dto }`: users.service.ts, movies.service.ts, movie-showings.service.ts, seats.service.ts, theaters.service.ts, bookings.service.ts, booked-seats.service.ts. Fix: spread dto first, then id (and created_at). bookings create also stores the raw bookedSeats DTO array in db.bookings — should not be stored.
- D6 invalid DOB: assertAgeRating — isNaN(date.getTime()) → 400.
- Birthday bug: replace 365.25-day division with pure calendar ageOn(dob, now) (year diff minus 1 if month/day not reached). Tests use relative DOBs, not a frozen clock (developer decision).
- D7 string seatId: no pipe in src/main.ts; DTOs undecorated. QC plan suggests shared src/app.setup.ts configureApp(app) used by main.ts and a new test/bookings.e2e-spec.ts. Needs `npm i class-validator class-transformer`, decorators (@IsInt, @IsArray/@ArrayNotEmpty, @ValidateNested({each:true}) + @Type, @IsOptional, @IsDateString).
- D8 cascade: movies.service.ts remove never calls removeMovieShowingsByMovieId; theaters.service.ts remove removes seats but not showings/bookings/booked seats; users.service.ts remove removes only the user. Throwing reads: MovieShowingsService.findAll/findOne, BookingsService.findAll/findOne, SeatsService.findAll. Add Database helpers (e.g. removeBookingsByMovieShowingIds, removeBookingsByUserId) deleting bookings + bookedSeats together. Compute showing ids before deleting. Seat delete: orphan booked seat does not break reads today; options are cascade booked seats (may leave empty bookings — conflicts with D10 invariant) or reject while booked (safer).
- D9 seats update: uses enriching findOne → stores `theater` in db.seats. Read raw db.seats[id] with 404 guard for writes.
- D10 empty/missing bookedSeats → 400 (missing currently crashes .map → 500).
- D11 unknown seat userId: use usersService.findOne(userId).dob (404) instead of getDob; getDob then dead.
- D12 movies.service.ts findAll returns this.db.movies → Object.values.
- Ordering: all guards must run before any write (db.bookings write, booked seat creates).

### Risks
- Global ValidationPipe({ whitelist: true }) strips all props from undecorated DTOs → decorate every Create DTO (PartialType inherits metadata), or scope the pipe to bookings, or omit whitelist.
- transform: true may change `@Headers('user-id') userId: number` behaviour in users.controller.ts (service relies on isNaN and loose != with string). Cover with a test.
- Nested validation needs @Type from class-transformer.
- New dependencies → npm install + package-lock change; confirm NestJS 12 compatibility.
- D3 fix may change results existing tests implicitly rely on (seat 1 == bookedSeat id 1 alignment).
- Theater cascade: compute showing ids before deleting.

### Tidy Opportunities
- Dead seatGroupId counter + nextSeatGroupId() in database.service.ts.
- Unused BadRequestException import in movie-showings.service.ts.
- UsersService.getDob dead after D11.
- Duplicated availability logic (Database.getAvailableSeats vs BookedSeatsService.areSeatsAvailable).
- Enrichment block repeated 3x in bookings.service.ts.
- BookingsService.create will exceed 30 lines — extract assertSeatsBookable(seatIds, showing) and a pure ageOn helper.
- Formatting (Prettier) — keep separate from behaviour diffs.
- theaters/seats creates lack created_at (minor inconsistency).

### Design System
- UI-involved: no (API-only NestJS backend).

Key files: docs/specs/qc-plan.md, src/bookings/{bookings.service.ts,booked-seats.service.ts,bookings.service.spec.ts,dto/*}, src/database/database.service.ts, src/users/{users.service.ts,users.controller.ts}, src/movies/{movies.service.ts,movie-showings.service.ts}, src/theaters/{seats.service.ts,theaters.service.ts}, src/main.ts, test/app.e2e-spec.ts, vitest.config*.ts, package.json
