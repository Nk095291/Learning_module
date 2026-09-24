# QC Plan: movie_booking_application

## Execution Instructions

Read this plan. Work through each item in the priority queue in order.
For each item: complete the refactoring steps first (if any), then write the tests.
Mark each checkbox done as you complete it ([ ] -> [x]).

Analysis method: text-based pattern matching

### Conventions for every test in this plan

- Framework: vitest. ESM imports need the `.js` suffix (e.g. `import { Database } from '../database/database.service.js'`).
- Unit test pattern (matches `src/bookings/bookings.service.spec.ts`): `beforeEach` builds a fresh `new Database()` and wires **real** services by hand (`new TheatersService(db)`, `new MoviesService(db)`, etc.). **No mocks.** Write each test body as given / when / then.
- Seed data you can rely on in a fresh `Database`: users 1 (john) and 2 (jane), both born 1990-05-12; theaters 1 and 2; seats 1 (A1), 2 (A2), 3 (B1), all in theater 1; movie 1 "Inception", ageRating 13; movie showing 1 (movie 1, theater 1). If a test needs more data, add it explicitly in the test's "given" block (e.g. `db.seats[4] = {...}`) so the setup is visible.
- **Defect-exposing test** = a test for a confirmed bug. It is expected to go RED when you first write it. Keep it, then make the smallest production fix that turns it GREEN (a suggested fix direction is given for each one). Run the whole suite after each fix. Do not skip or delete a RED test to "get green".
- Effort tags: **quick win** (< 1 hour), **moderate** (half a day), **significant** (1+ days).
- Existing tests are listed under "Already covered". Do not write them again.



### Hotspot score caveat

Git history is thin: 2 commits, 1 author, and every file has churn 1-2. Score = churn x complexity (3 high / 2 med / 1 low) x authors (1). Because churn and authors hardly vary, the score works as a complexity tier, not a real ranking. Items with the same score are ordered by how many confirmed defects they contain and how many callers they have (fan-in).

## Analysis Summary


| Metric                    | Value                                                                                                                       |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Files analyzed            | 42 source files under src/ (7 services + Database provider analyzed in depth; controllers, modules, DTOs, entities scanned) |
| Hotspots identified       | 8 (7 services + Database)                                                                                                   |
| Already tested            | 0 fully (BookingsService is partly tested, with good behavior-level tests)                                                  |
| Needing tests             | 8 (7 service/provider items + 1 HTTP e2e item)                                                                              |
| Needing refactoring first | 1 (BookingsService spec: freeze the clock, test-only change)                                                                |




## Priority Queue


| #   | File                                                                                | Hotspot Score | Complexity | Effort          | Reward | Reasoning                                                                                                                                                   |
| --- | ----------------------------------------------------------------------------------- | ------------- | ---------- | --------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | src/bookings/bookings.service.ts                                                    | 6             | high       | Med (moderate)  | High   | 2x changes, 1 author, partial tests. Core money path. Holds 6 uncovered defects (D1, D2, D6, D10, D11, birthday boundary). Existing age test is a time bomb |
| 2   | src/database/database.service.ts                                                    | 6             | high       | Low (quick win) | High   | 2x changes, 1 author, no tests. Fan-in 7. `getAvailableSeats` is wrong (D3), so every showing read shows the wrong free seats                               |
| 3   | src/users/users.service.ts                                                          | 4             | med        | Low (quick win) | High   | 2x changes, 1 author, no tests. Holds authorization (400/403). Counter collision overwrites seeded user (D4). Body `id` override (D5)                       |
| 4   | src/movies/movies.service.ts                                                        | 4             | low-med    | Low (quick win) | Med    | 2x changes, 1 author, no tests. Delete leaves orphan showings that crash reads (D8). `findAll` returns a map, not an array (D12). D5                        |
| 5   | src/theaters/seats.service.ts                                                       | 4             | med        | Low (quick win) | Med    | 2x changes, 1 author, no tests. `update` writes the nested `theater` object into storage (D9)                                                               |
| 6   | src/theaters/theaters.service.ts                                                    | 4             | low-med    | Low (quick win) | Med    | 2x changes, 1 author, no tests. Counter collision (D4). Only service with a cascade (seats)                                                                 |
| 7   | src/movies/movie-showings.service.ts                                                | 4             | med        | Low (quick win) | Med    | 2x changes, 1 author, no tests. Referential 404 guards on create/findOne have no tests. Every booking passes through it                                     |
| 8   | test/bookings.e2e-spec.ts (HTTP: src/main.ts + src/bookings/bookings.controller.ts) | 2             | low        | Med (moderate)  | High   | No domain e2e exists. D7 (string `seatId` re-books a seat) happens only over HTTP, because no ValidationPipe is configured                                  |




## Detailed Plan



### [ ] 1. src/bookings/bookings.service.ts — Hotspot: 6

**Test status:** partial tests (strong behavior tests for the happy path, one double-book case and one age case; the validation branches and all input-integrity defects have no tests)

**Already covered (do NOT duplicate):** create with userId; create with userDOB; create with multiple seats; double-book of the same seat on the same showing -> 400; underage userDOB -> 400; findAll returns enriched bookings; findOne returns an enriched booking; findOne(999) -> 404.

**Refactoring needed:**

- [ ] Freeze the clock in `src/bookings/bookings.service.spec.ts`: in `beforeEach` call `vi.useFakeTimers({ toFake: ['Date'] })` and `vi.setSystemTime(new Date('2026-09-24T12:00:00Z'))`; in `afterEach` call `vi.useRealTimers()`. This changes only the spec, not production code. **WHY:** `assertAgeRating` uses `Date.now()`. The existing test "should throw an error when user failed to meet age rating requirements" (DOB 2020-01-01, rating 13) will start failing on 2033-01-01 even though nothing broke. The boundary test below also needs a fixed "today". A production `Clock` abstraction is not needed yet (YAGNI). Add one only if a second caller needs controlled time.
- [x] Tidy: remove `console.log(dob)` at bookings.service.ts line 79. **WHY:** it writes a user's date of birth to stdout on every booking (PII leak) and clutters test output. Do this in its own commit, separate from the tests.

**Tests to create** (add to the existing `describe('create')` / `describe('FindAll')` blocks in `src/bookings/bookings.service.spec.ts`):

- [x] `should throw NotFoundException when the booking userId does not exist` — given userId 999, when create, then 404 and `db.bookings` is empty. WHY: the guard exists but no test protects it. (Unit) — quick win
- [x] `should throw NotFoundException when the movie showing does not exist` — movieShowingId 999 -> 404, nothing persisted. (Unit) — quick win
- [x] `should throw BadRequestException when a seat has neither userId nor userDOB` — 400 with message containing 'Providing DOB is mandatory', nothing persisted. WHY: this is the only guard that makes age checking mandatory. (Unit) — quick win
- [x] `should accept a viewer whose age equals the movie age rating on their birthday` — clock frozen at 2026-09-24, userDOB '2013-09-24', rating 13 -> booking created. **Defect-exposing test (suspected, verify):** dividing by 365.25 days per year makes someone exactly 13 today come out as 12.99, so they are rejected on their birthday. Fix direction: calendar-based age (compare year, then month/day) in a pure `ageOn(dob, now)` helper. (Unit) — quick win
- [x] `should reject a request that lists the same seatId twice` — bookedSeats `[{seatId:2,userId:1},{seatId:2,userId:2}]` -> 400, and `db.bookedSeats` stays empty. **Defect-exposing test (D1):** today it creates 2 booked seats for one physical seat. Fix direction: reject duplicate ids in `create` before the availability check. (Unit) — quick win
- [x] `should reject a seatId that does not exist` — seatId 999 -> 400 or 404 (pick one and assert it), nothing persisted. **Defect-exposing test (D2).** Fix direction: check each seatId exists in `db.seats`. (Unit) — quick win
- [x] `should reject a seat that belongs to a different theater than the showing` — given `db.seats[4] = { id: 4, theaterId: 2, seatNumber: 'A1', row: 'A', col: 1 }`, when booking seat 4 on showing 1 (theater 1), then 400, nothing persisted. **Defect-exposing test (D2).** Fix direction: seat.theaterId must equal showing.theaterId. (Unit) — quick win
- [x] `should reject an unparseable userDOB` — userDOB 'garbage' -> 400. **Defect-exposing test (D6):** NaN age makes `age < ageRating` false, so the booking is accepted today. Fix direction: treat an invalid date as a 400 before comparing ages. (Unit) — quick win
- [x] `should reject a booking with no seats` — bookedSeats `[]` -> 400, `db.bookings` empty. **Defect-exposing test (D10):** today an empty booking is created. (Unit) — quick win
- [x] `should throw NotFoundException when a seat's userId does not exist` — booking userId 1, seat `{seatId:2,userId:999}` -> 404. **Defect-exposing test (D11):** today it throws a misleading 400 'Providing DOB is mandatory'. Fix direction: use `usersService.findOne` (throws 404) instead of `getDob` when a seat has a userId. (Unit) — quick win
- [x] `FindAll > should return an empty array when there are no bookings` — fresh db -> `[]`. (Unit) — quick win

**Done when:** the clock is frozen in the spec, all 11 new tests exist, the 7 defect-exposing tests have gone RED and then GREEN through minimal fixes in `bookings.service.ts` / `booked-seats.service.ts`, the full suite passes, and there are no mocks.

### [ ] 2. src/database/database.service.ts — Hotspot: 6

**Test status:** no tests

**Refactoring needed:**

- None needed to write the tests. `Database` has no constructor logic and no dependencies, so `new Database()` works in tests as is. (The larger fix, moving the availability query next to `BookedSeatsService.areSeatsAvailable` so the rule lives in one place, is the GREEN step for the tests below. It is not a precondition.)

**Tests to create** (new file `src/database/database.service.spec.ts`):

- [x] `getAvailableSeats > should exclude a seat booked for that showing` — given `db.bookedSeats[1] = { id: 1, seatId: 2, bookingId: 1, movieShowingId: 1, ... }`, when `getAvailableSeats(1)`, then seat ids are `[1, 3]`. **Defect-exposing test (D3):** today it returns `[2, 3]` because it looks up `bookedSeats[seat.id]`, which is keyed by booked-seat id, not seat id. Note: the existing double-book test masks this because seat 1 happens to be booked-seat 1. (Unit) — quick win
- [x] `getAvailableSeats > should not treat a seat booked for another showing as taken` — given showing 2 in theater 1 (`db.movieShowings[2] = {...}`) and seat 1 booked for showing 2, when `getAvailableSeats(1)`, then seat ids are `[1, 2, 3]`. **Defect-exposing test (D3):** today it ignores movieShowingId. Fix direction for both tests: filter `Object.values(bookedSeats)` by `movieShowingId` and match on `seatId`. Better still, have `MovieShowingsService` use one availability query owned by the booking side. (Unit) — quick win
- [x] `getAvailableSeats > should only return seats from the showing's theater` — given `db.seats[4]` in theater 2, when `getAvailableSeats(1)`, then seat 4 is not included. WHY: locks down the theater filter while you rewrite the method. (Unit) — quick win
- [x] `removeSeatsByTheaterId > should delete only the seats of that theater` — given seat 4 in theater 2, when `removeSeatsByTheaterId(1)`, then only seat 4 remains. (Unit) — quick win
- [x] `removeMovieShowingsByMovieId > should delete only that movie's showings` — given showing 2 for movie 2, when `removeMovieShowingsByMovieId(1)`, then only showing 2 remains. WHY: item 4's D8 fix depends on this helper, and nothing calls it today. (Unit) — quick win

**Done when:** all 5 tests exist, both D3 tests have gone RED then GREEN, availability is correct per showing and per seat, the suite passes, and there are no mocks.

### [ ] 3. src/users/users.service.ts — Hotspot: 4

**Test status:** no tests

**Refactoring needed:**

- None needed. The only dependency is `Database`, passed through the constructor: `new UsersService(new Database())`.

**Tests to create** (new file `src/users/users.service.spec.ts`):

- [x] `create > should not overwrite an existing seeded user` — when `create({ email: 'new@example.com', dob: ... })`, then `findOne(2).email` is still '[jane@example.com](mailto:jane@example.com)' and `findAll()` has 3 users. **Defect-exposing test (D4):** the `userId` counter starts at 2 (database.service.ts line 56). Fix direction: start the counter at 3, or derive it from the highest seeded id. (Unit) — quick win
- [x] `create > should ignore a client-supplied id` — when `create({ id: 1, email: 'x@example.com', ... } as any)`, then john (id 1) is unchanged and the new user gets a fresh id. **Defect-exposing test (D5):** `{ id: next(), ...dto }` lets the body's `id` win. Fix direction: spread the dto first, then set `id`: `{ ...dto, id: next(), created_at }`. The same one-line fix applies to all 7 create methods. (Unit) — quick win
- [x] `findOne > should throw NotFoundException for an unknown id` — `findOne(999)` -> 404. (Unit) — quick win
- [x] `update > should reject a missing or non-numeric actor id with 400` — `update(1, { email: 'a@b.c' }, NaN)` -> BadRequestException; user unchanged. WHY: this is the only guard against a missing `user-id` header. (Unit) — quick win
- [x] `update > should forbid a user from updating someone else` — `update(1, {...}, 2)` -> ForbiddenException; user 1 unchanged. (Unit) — quick win
- [x] `update > should let a user update their own profile` — `update(1, { email: 'new@x.com' }, 1)` returns it and `findOne(1).email` shows the change. (Unit) — quick win
- [x] `remove > should forbid deleting another user` — `remove(1, 2)` -> 403, user 1 still exists. (Unit) — quick win
- [x] `remove > should delete own account` — `remove(1, 1)` returns a message containing '[john@example.com](mailto:john@example.com)', then `findOne(1)` -> 404. (Unit) — quick win

**Done when:** all 8 tests exist, D4 and D5 have gone RED then GREEN, the authorization rules (400/403/allowed) each have their own test, and the suite passes.

### [ ] 4. src/movies/movies.service.ts — Hotspot: 4

**Test status:** no tests

**Refactoring needed:**

- None needed. Wire `new MoviesService(db)`. For the cascade test also wire `new MovieShowingsService(db, moviesService, new TheatersService(db))`.

**Tests to create** (new file `src/movies/movies.service.spec.ts`):

- [x] `findAll > should return movies as an array` — `Array.isArray(findAll())` is true and it holds Inception. **Defect-exposing test (D12):** today it returns the raw `db.movies` map. Fix direction: `Object.values(this.db.movies)`. (Unit) — quick win
- [x] `remove > should also remove the movie's showings so showing reads keep working` — when `remove(1)`, then `movieShowingsService.findAll()` does not throw and returns `[]`. **Defect-exposing test (D8):** today it throws 'Movie 1 not found' because `removeMovieShowingsByMovieId` is never called. Fix direction: call `this.db.removeMovieShowingsByMovieId(id)` in `remove`. (Unit) — quick win
- [x] `create > should ignore a client-supplied id` — `create({ id: 1, title: 'X', ageRating: 0 } as any)` leaves Inception at id 1. **Defect-exposing test (D5).** Same fix as item 3. (Unit) — quick win
- [x] `findOne > should throw NotFoundException for an unknown id` — 404. (Unit) — quick win
- [x] `update > should merge changes into the stored movie` — `update(1, { ageRating: 16 })`, then `findOne(1).ageRating === 16` and the title is unchanged. WHY: BookingsService reads ageRating from here. (Unit) — quick win

**Done when:** all 5 tests exist, D5/D8/D12 have gone RED then GREEN, and the suite passes.

### [ ] 5. src/theaters/seats.service.ts — Hotspot: 4

**Test status:** no tests

**Refactoring needed:**

- None needed to write the tests. Wire `new SeatsService(db, new TheatersService(db))`. (The D9 fix, splitting "read raw seat for mutation" from "enriched seat view for reads", is the GREEN step, not a precondition.)

**Tests to create** (new file `src/theaters/seats.service.spec.ts`):

- [x] `update > should not persist the enriched theater object into storage` — when `update(1, { seatNumber: 'A1X' })`, then `db.seats[1]` has no `theater` property and `db.seats[1].seatNumber === 'A1X'`. **Defect-exposing test (D9):** `update` reuses the enriching `findOne`, so the nested theater gets stored. Fix direction: read `this.db.seats[id]` (with a 404 guard) for writes; keep `findOne` for reads. (Unit) — quick win
- [x] `update > should reject changing a seat's theater` — `update(1, { theaterId: 2 })` -> BadRequestException 'Seat theater id cannot be changed', seat unchanged. (Unit) — quick win
- [x] `create > should throw NotFoundException when the theater does not exist` — `create({ theaterId: 999, ... })` -> 404 and no seat added. (Unit) — quick win
- [x] `findOne > should include the seat's theater` — `findOne(1).theater.name === 'PVR Phoenix'`. (Unit) — quick win
- [x] `remove > should delete the seat` — `remove(1)`, then `findOne(1)` -> 404. (Unit) — quick win

**Done when:** all 5 tests exist, D9 has gone RED then GREEN, and the suite passes.

### [ ] 6. src/theaters/theaters.service.ts — Hotspot: 4

**Test status:** no tests

**Refactoring needed:**

- None needed. `new TheatersService(new Database())`.

**Tests to create** (new file `src/theaters/theaters.service.spec.ts`):

- [x] `create > should not overwrite an existing seeded theater` — when `create({ name: 'INOX', ... })`, then `findAll()` has 3 theaters and theater 2 is unchanged. **Defect-exposing test (D4):** the `theaterId` counter starts at 2 (database.service.ts line 57). Same fix as item 3. (Unit) — quick win
- [x] `remove > should delete the theater and its seats only` — given seat 4 in theater 2, when `remove(1)`, then `findOne(1)` -> 404, seats 1-3 are gone, seat 4 remains. WHY: this is the only working cascade in the codebase, so protect it before the D8-style cleanup. (Unit) — quick win
- [x] `findOne > should throw NotFoundException for an unknown id` — 404. (Unit) — quick win
- [x] `update > should merge changes into the stored theater` — `update(1, { city: 'Pune' })`, name unchanged. (Unit) — quick win

**Done when:** all 4 tests exist, D4 (theaters) has gone RED then GREEN, and the suite passes. Open question for the developer, not part of this plan: what should happen when a theater that has showings is deleted (reject or cascade)? Once decided, add a D8-style test like the one in item 4.

### [ ] 7. src/movies/movie-showings.service.ts — Hotspot: 4

**Test status:** no tests (it is used indirectly by the bookings spec, but its own guards have no tests)

**Refactoring needed:**

- None needed. `new MovieShowingsService(db, new MoviesService(db), new TheatersService(db))`.

**Tests to create** (new file `src/movies/movie-showings.service.spec.ts`):

- [x] `create > should throw NotFoundException when the movie does not exist` — movieId 999 -> 404 and `db.movieShowings` still has only showing 1. WHY: stops orphan showings from being created. (Unit) — quick win
- [x] `create > should throw NotFoundException when the theater does not exist` — theaterId 999 -> 404, nothing added. (Unit) — quick win
- [x] `create > should persist a showing with a fresh id` — valid dto -> returned id 2, `db.movieShowings[2]` exists. (Unit) — quick win
- [x] `findOne > should throw NotFoundException for an unknown showing` — 404. (Unit) — quick win
- [x] `findOne > should include the movie, theater and available seats` — `findOne(1)` has `movie.title === 'Inception'`, `theater.id === 1`, available seat ids `[1, 2, 3]`. WHY: BookingsService depends on `showing.movie.ageRating`. (Unit) — quick win

**Done when:** all 5 tests exist and pass, and the suite passes. (Availability correctness after bookings is covered in item 2. Do not duplicate it here.)

### [ ] 8. test/bookings.e2e-spec.ts (src/main.ts, src/bookings/bookings.controller.ts) — Hotspot: 2

**Test status:** no tests (only the scaffold `GET /` e2e exists in `test/app.e2e-spec.ts`)

**Refactoring needed:**

- [ ] Put the app's global setup in one exported function, e.g. `configureApp(app)` in `src/app.setup.ts` (at first it may do nothing), and call it from both `src/main.ts` and the e2e `beforeEach`. **WHY:** the test must use the same pipes as production. Otherwise the e2e passes after a ValidationPipe is added to the test app while production stays unprotected.

**Tests to create** (new file `test/bookings.e2e-spec.ts`, same bootstrap style as `test/app.e2e-spec.ts`):

- [ ] `POST /bookings should reject rebooking a seat when seatId is sent as a string` — POST a booking for seat 1 (number), then POST again with `seatId: '1'` -> second request gets 400. **Defect-exposing test (D7):** with no ValidationPipe the string skips the strict `===` in `areSeatsAvailable`, and seat 1 is booked twice. Fix direction: in `configureApp`, add `new ValidationPipe({ transform: true, whitelist: true })` plus `class-validator` decorators (`@IsInt()` etc.) on `CreateBookingDto` / `CreateBookedSeatDto`. `whitelist` also blocks the body-`id` override (D5) at the edge. (Integration) — moderate. WHY integration: the defect lives in HTTP body parsing, so a unit test cannot reproduce it.
- [ ] `POST /bookings then GET /bookings/:id should return the created booking` — one wiring test that proves the module graph and DI resolve end to end. (Integration) — quick win

**Done when:** both e2e tests exist and run with the project's e2e command, D7 has gone RED then GREEN via the shared `configureApp`, and the unit suite still passes.

---

Out of scope for this plan (noted, no tests recommended yet): the spoofable `user-id` header (an auth design question, not a test gap); the dead `seatGroupId` counter (tidy); moving seed data out of `Database` (only needed once implicit seed data starts causing flaky tests); what to do on user/theater deletion when bookings or showings exist (needs a product decision first).

Note: LSP was not available for this analysis. Results use text-based pattern matching. For more accurate dependency analysis, consider configuring a language server (TypeScript / JavaScript: typescript-language-server).