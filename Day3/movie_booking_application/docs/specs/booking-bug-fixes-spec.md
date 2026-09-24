# Spec: Booking Bug Fixes (D1-D12 + birthday age bug)

## Overview

Fix every confirmed defect from `docs/specs/qc-plan.md` (D1-D12 plus the 365.25-day birthday age bug). Each fix is test-first: a test that fails on today's code, then the smallest fix that makes it pass. When this is done, bookings can't double-book or cross-book seats, age checks use calendar dates, ids can't collide or be overridden, reads return the right shape, deletes leave no orphaned records behind, and HTTP input is type-checked.

> Status: CONFIRMED by the developer on 2026-09-25. Seat delete is rejected with 409 (Slice 7). D7 uses a global ValidationPipe({ whitelist: true }) without transform, with decorated Create DTOs (Slice 8). The proposed error messages are accepted.



## Conventions that apply to every slice

- Every guard runs before any write. When a request is rejected, `db.bookings`, `db.bookedSeats` and every other store stay exactly as they were before the call.
- "400" means `BadRequestException`, "404" means `NotFoundException`, "409" means `ConflictException`, and so on. Tests assert both the exception type and the message.
- Unit tests use a fresh `new Database()` and real services wired by hand. No mocks. Test bodies follow given / when / then.
- Test file names and `describe`/`it` names describe behaviour, for example `bookings.service.spec.ts > create > should reject a request that lists the same seat twice`. Never name them after slice numbers or defect ids.

---



### Slice 1: Booking rejects invalid seat selections

Area: `BookingsService.create` (D10, D1, D2, plus regression guards that have no tests yet).

- [x] Booking with an empty `bookedSeats` list is rejected with 400 'At least one seat must be selected'
- [x] Booking with no `bookedSeats` property is rejected with 400 'At least one seat must be selected' (not a 500)
- [x] Booking that lists the same seatId twice is rejected with 400 'Each seat can only be selected once'
- [x] Booking with a seatId that does not exist is rejected with 400 'Seat 999 does not exist'
- [x] Booking with a seat from a different theater than the showing's is rejected with 400 'Seat 4 is not in the theater of this showing'
- [x] Booking for an unknown booking userId is rejected with 404 'User 999 not found'
- [x] Booking for an unknown movieShowingId is rejected with 404 'Movie showing 999 not found'
- [x] After each rejection above, no booking and no booked seat has been saved
- [x] A valid multi-seat booking still succeeds and returns its booked seats, user and movie showing



### Slice 2: Booking age eligibility uses calendar age

Area: `BookingsService` age check (D6, D11, birthday bug). The clock is not frozen. Age tests work out each userDOB from the real current date with a small test helper (e.g. `dobYearsAgo(years, dayOffset = 0)`), which returns a `YYYY-MM-DD` string that is `years` years before today, shifted by `dayOffset` days. The helper uses the same timezone as the production calendar-age function, so the test's "today" and the service's "today" are the same calendar day.
<!-- -------- bee-comment -------- -->
> **@developer**: instead of freezing the clock set the DOB to (now() - timediff).
> **@bee**: Dropped the frozen clock. The age ACs now use DOBs relative to today (exactly 13 years ago; 13 years ago plus one day; 5 years ago for the underage case) built by a test helper, and the Out of Scope line about `vi.useFakeTimers` now says the same. The birthday tests still hit the exact boundary every day they run. Two caveats: (1) a run that crosses midnight between the helper's `now` and the service's `now` could flake. That is very unlikely, so the spec accepts it. (2) On Feb 29, "13 years ago" rolls to Mar 1 in JavaScript, so the helper builds the date from year/month/day parts and clamps to Feb 28 instead of using `setFullYear` directly.
> - [ ] mark as resolved
<!-- -------- /bee-comment -------- -->

- [x] A viewer whose age equals the movie's age rating on their birthday (userDOB = exactly 13 years before today, rating 13) is accepted
- [x] A viewer whose 13th birthday is tomorrow (userDOB = 13 years before today plus one day, rating 13) is rejected with 400 'User must be at least 13 to book this movie'
- [x] Age is calculated as calendar years (year difference, minus one if the birthday has not arrived yet this year) by a pure helper that takes the date of birth and "today"
- [x] A seat with an unparseable userDOB ('garbage') is rejected with 400 'Invalid date of birth'
- [x] A seat whose userId does not exist is rejected with 404 'User 999 not found' (today it is a misleading 400 'Providing DOB is mandatory')
- [x] A seat with neither userId nor userDOB is still rejected with 400 'Providing DOB is mandatory for booking'
- [x] The existing underage test (DOB 2020-01-01, rating 13) uses a DOB relative to today (e.g. 5 years ago) instead, so it gives the same result whatever the real date is
- [x] After each age rejection, no booking and no booked seat has been saved



### Slice 3: Seat availability is per showing and per seat

Area: `Database.getAvailableSeats` and `BookedSeatsService.areSeatsAvailable` (D3). Both use one shared availability rule.

- [x] A showing's available seats leave out a seat booked for that showing (seat 2 booked for showing 1 gives available ids [1, 3])
- [x] A seat booked for another showing still counts as available (seat 1 booked for showing 2 gives available ids [1, 2, 3] for showing 1)
- [x] A showing's available seats only include seats from the showing's theater
- [x] After seat 2 is booked on showing 1, a second booking for seat 2 on showing 1 is rejected with 400 'Selected seats are not available'
- [x] After seat 2 is booked on showing 1, a booking for seat 1 on showing 1 succeeds (today the booked-seat-id/seat-id mix-up blocks it)
- [x] A seat booked on showing 1 can still be booked on another showing in the same theater



### Slice 4: Created records always get a fresh, unique id

Area: `Database` counters (D4) and all 7 create methods (D5).

- [x] Creating a user does not overwrite seeded user 2 (jane keeps her email; `findAll` returns 3 users; the new user has id 3)
- [x] Creating a theater does not overwrite seeded theater 2 (`findAll` returns 3 theaters; the new theater has id 3)
- [x] A client-supplied `id` is ignored when creating a user; the existing user keeps that id and the new user gets a fresh one
- [x] A client-supplied `id` is ignored when creating a movie, a movie showing, a theater, a seat, a booking and a booked seat (one test per create)
- [x] A client-supplied `created_at` is ignored on creates that set `created_at`
- [x] The stored booking record does not contain the request's raw `bookedSeats` array; the booking's seats are only the booked-seat records



### Slice 5: Reads and updates return clean data

Area: `MoviesService.findAll` (D12) and `SeatsService.update` (D9).

- [x] Listing movies returns an array that includes Inception
- [x] Updating a seat's seatNumber saves the new value, and the stored seat has no nested `theater` property
- [x] Updating a seat still returns the updated seat
- [x] Updating a seat to a different theaterId is rejected with 400 'Seat theater id cannot be changed', and the seat is unchanged
- [x] Updating an unknown seat is rejected with 404 'Seat 999 not found'



### Slice 6: Deleting a movie, theater or user removes its dependent records

Area: `MoviesService.remove`, `TheatersService.remove` and `UsersService.remove` (D8, cascade policy). Cascade helpers live in `Database`, so there is no module cycle.

- [x] Deleting a movie removes its showings
- [x] Deleting a movie removes the bookings for its showings, and the booked seats of those bookings
- [x] After a movie is deleted, listing showings and listing bookings both work and return nothing for that movie
- [x] Deleting a theater removes its seats and its showings (seats and showings of other theaters stay)
- [x] Deleting a theater removes the bookings for its showings, and the booked seats of those bookings
- [x] After a theater is deleted, listing seats, showings and bookings all work
- [x] A user deleting their own account also removes their bookings and those bookings' booked seats
- [x] After a user is deleted, listing bookings works, and other users' bookings stay
- [x] Deleting another user's account is still rejected with 403, and nothing is removed



### Slice 7: Deleting a seat that has bookings is rejected

Area: `SeatsService.remove`. Decision: reject the delete, because cascading could leave a booking with zero seats, which breaks the rule from Slice 1 that a booking has at least one seat.

- [x] Deleting a seat that has a booked seat on any showing is rejected with 409 'Seat 1 has bookings and cannot be deleted'
- [x] After that rejection, the seat, its booked seats and their booking all still exist
- [x] Deleting a seat with no booked seats removes it (`findOne` then gives 404)



### Slice 8: HTTP booking requests are type-checked

Area: `src/main.ts`, a new shared `src/app.setup.ts` (`configureApp(app)`), all Create DTOs, and a new `test/bookings.e2e-spec.ts` (D7). Decision: one global `ValidationPipe({ whitelist: true })` (no `transform`), with `class-validator` and `class-transformer` decorators on every Create DTO. Production and e2e both apply it through `configureApp`.

- [ ] Rebooking seat 1 with `seatId: "1"` (a string) after it was booked as the number 1 is rejected with 400, and only one booked seat exists for seat 1
- [ ] A booking request with a non-integer `userId` or `movieShowingId` is rejected with 400
- [ ] A booking request whose `bookedSeats` is missing, not an array, or empty is rejected with 400
- [ ] A booked seat with a non-date `userDOB` is rejected with 400
- [ ] `POST /bookings` followed by `GET /bookings/:id` returns the created booking with its booked seats
- [ ] A valid create request for users, movies, movie showings, theaters and seats still saves every field it sends (whitelisting does not strip decorated fields)
- [ ] Unknown body properties (for example `id`) are stripped at the HTTP edge
- [ ] `PATCH /users/:id` and `DELETE /users/:id` still accept the `user-id` header, and still reject a missing header with 400 and another user's id with 403
- [ ] The e2e app and `main.ts` apply the same global setup through `configureApp`

---



## Out of Scope

- Authentication or authorization redesign. The spoofable `user-id` header stays as it is.
- Moving seed data out of `Database`.
- A production `Clock` abstraction or Repository layer. Tests do not freeze time. Age tests use DOBs relative to today instead.
- Cascade on seat delete (rejected instead, confirmed).
- Validation of Update DTOs beyond what `PartialType` inherits from the decorated Create DTOs.
- Prettier/formatting churn, and tidy items not required by a fix. Exception: `UsersService.getDob` may be removed once D11 makes it dead.
- Concurrency and persistence. The store stays in memory and single-process.
- The remaining qc-plan "coverage only" tests not tied to a defect or AC above (for example theater update merge, movie update merge).



## Technical Context

- Patterns to follow: thin controllers that call services; services throw Nest HTTP exceptions with template messages (`User ${id} not found`); storage is `Record<number, Entity>`; ESM relative imports end in `.js`; the given/when/then no-mock tests follow `src/bookings/bookings.service.spec.ts`.
- Key dependencies: `Database` (counters, `removeSeatsByTheaterId`, `removeMovieShowingsByMovieId`, `getAvailableSeats`), `BookedSeatsService.areSeatsAvailable`, `UsersService.findOne`, `MovieShowingsService.findOne`.
- Cascade helpers belong in `Database` (for example, remove bookings and their booked seats by showing ids, or by user id). Compute the showing ids before deleting the showings. Movies, Theaters and Users services must not inject bookings-side services.
- `BookingsService.create` will grow. Extract the seat-selection guard and the pure calendar-age helper so the function stays short.
- Slice 8 adds new dependencies (`class-validator`, `class-transformer`) and changes `package-lock.json`. Check that they work with NestJS 12. Nested validation needs `@ValidateNested({ each: true })` with `@Type`.
- Preserve the developer's committed edits: `User.dob` is a string, `console.log(dob)` is removed, the `seatGroupId` counter is removed.
- Risk level: MODERATE.

[x] Reviewed