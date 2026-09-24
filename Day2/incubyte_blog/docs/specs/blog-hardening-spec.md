# Spec: Blog App Hardening

## Overview

Fix the critical review bugs in the incubyte_blog NestJS REST API: HTTP-boundary validation, actor-header handling, mass-assignment of server-owned fields, blog create authorization, authorId immutability, and inconsistent permission-denial status. Then fill the test gaps from `docs/specs/qc-plan.md`. Bug-fix slices come first. Test-gap slices follow and assume the fixes are in place.

## Developer Decisions

- Order: bug fixes first, then QC test gaps.
- `authorId` is immutable after create. Nobody, admins included, may change it. It is removed from the blog update payload. This supersedes the ownership-transfer tests in qc-plan item 2.
- Strict 400s at the HTTP boundary: a non-numeric `:id` returns 400, a missing or non-numeric `user-id` header returns 400, and unknown body fields such as `id` return 400. e2e tests use the same validation config as `main.ts`.
- Blog create: `authorId` stays in the body and the `user-id` header is required. A non-admin gets 403 `User <actor> cannot create blog for user <authorId>` unless `authorId` equals the actor. Admins may create blogs for any user.
- Blog create check order: the ownership check comes first. A non-admin whose `authorId` is not their own id gets 403, even if that `authorId` does not exist. An admin with an unknown `authorId` gets 404 `User <id> not found`.
- Permission denial in UsersService returns 403 Forbidden, with the existing message text.
- A missing or non-numeric `user-id` header returns 400 `Valid user-id header is required`, for both users and blogs. A non-numeric `:id` returns Nest's default `Validation failed (numeric string is expected)`.
- The embedded `author` copy stays in `db.blogs`. Storage does not change.
- `POST /users` with a `role` field returns 400, the same as any other unknown field.

---



## Slice 1: HTTP boundary validation and actor header (bug fix)

The request boundary rejects malformed input before any business rule runs, and e2e tests exercise the same boundary as production.

- [ ] `GET /users/abc` returns 400 `Validation failed (numeric string is expected)`
- [ ] `GET /blogs/abc` returns 400 `Validation failed (numeric string is expected)`
- [ ] `PATCH /blogs/:id`, `DELETE /blogs/:id`, `PATCH /users/:id` and `DELETE /users/:id` with a non-numeric `:id` return 400
- [ ] `PATCH /blogs/:id` without a `user-id` header returns 400 `Valid user-id header is required`, and the blog is unchanged
- [ ] `DELETE /blogs/:id` without a `user-id` header returns 400 `Valid user-id header is required`, and the blog still exists
- [ ] `PATCH /users/:id` and `DELETE /users/:id` with `user-id: abc` return 400 `Valid user-id header is required`
- [ ] A numeric `user-id` header such as `"1"` is accepted, and the service receives the number 1
- [ ] A `user-id` header naming an unknown user returns 404 `User <id> not found` (unchanged behavior)
- [ ] A request body with a field that is not part of the DTO (for example `{ "name": "X", "nickname": "Y" }`) returns 400 and changes nothing
- [ ] `POST /users` with valid `name` and `email` still returns 201 with role `free`
- [ ] `PATCH /users/:id` with `role: 'guest'` returns 400 and the role is unchanged. The message comes from DTO validation, not from `Invalid role`.
- [ ] The e2e app is built with the same global validation config as `main.ts`, from one shared source. The bootstrap is not duplicated per e2e file.

**Existing tests this changes:**

- `test/blogs.e2e-spec.ts:121-142` and `:250-271`: 404 becomes 400.
- `test/users.e2e-spec.ts:117-132` and `:317-330`: `Invalid actor id` becomes `Valid user-id header is required`.
- `test/users.e2e-spec.ts:296-313`: the 'guest' message becomes a validation error.
- Controller unit specs: they now pass a numeric `id`.
- Service unit tests that pass `NaN` or `undefined` actors: move them to the boundary, or rewrite them for the new signature.
- Both e2e `beforeEach` bootstraps.



## Slice 2: Server-owned fields cannot be overwritten (bug fix)

A client can never choose or change a record's `id`, cannot inject an `author`, and cannot choose its role on signup.

- [ ] `POST /users` with `id: 1` in the body returns 400, and `GET /users/1` still returns John
- [ ] `PATCH /users/1` with `id: 5` in the body returns 400, `GET /users/1` still returns id 1, and `GET /users/5` returns 404
- [ ] `POST /blogs` with `id` or `author` in the body returns 400 and creates no blog
- [ ] `POST /users` with `role: 'admin'` returns 400 and creates no user
- [ ] `UsersService.create` assigns the next server id even if the input object carries an `id`, so existing users stay intact (service-level guard)
- [ ] `UsersService.update` never changes the stored user's `id`, even if the input object carries one (service-level guard)
- [ ] `BlogsService.create` assigns the next server blog id and the looked-up author even if the input object carries `id` or `author` (service-level guard)

**Existing tests this changes:**

- `test/users.e2e-spec.ts:40-60`: POST with `role` goes from 201 free to 400.
- The unit test "create ignores role in payload" stays as a service-level guard.
- `users.service.spec.ts:373-396`: this cascade test relies on the id-override bug and must strip `id`/`author` from factory blogs.



## Slice 3: Blog create authorization and authorId immutability (bug fix)

Only the author, or an admin, can create a blog in that author's name. Nobody can change who wrote a blog afterwards.

- [ ] A user can create a blog under their own id (`user-id` equals `authorId`) and gets 201 with the blog and its author
- [ ] An admin can create a blog under another user's id
- [ ] A non-admin creating a blog under another user's id gets 403 `User <actor> cannot create blog for user <authorId>`, and no blog is stored
- [ ] A non-admin creating a blog under an unknown `authorId` gets 403 `User <actor> cannot create blog for user <authorId>`
- [ ] An admin creating a blog under an unknown `authorId` gets 404 `User <authorId> not found`
- [ ] `POST /blogs` without a `user-id` header returns 400 `Valid user-id header is required`
- [ ] `PATCH /blogs/:id` with `authorId` in the body returns 400, even from an admin, and the blog's author is unchanged
- [ ] `GET /blogs/:id` shows the author's current profile after that author's name changes (for example after `PATCH /users/1 { name: 'Johnny' }`, John's blog shows `Johnny`). This describes current read behavior and needs no storage change.

**Existing tests this changes:**

- Every `service.create` / `controller.create` call in `blogs.service.spec.ts`, `blogs.controller.spec.ts` and `users.service.spec.ts:373-396`: now passes an actor.
- Every `POST /blogs` in `test/blogs.e2e-spec.ts` and `test/users.e2e-spec.ts:427-436`: now sets `user-id`.
- `test/blogs.e2e-spec.ts:50-67` (authorId 999 without a header): rewrite it for the 403-first / admin-404 rule.
- Ownership-transfer tests are removed: `blogs.service.spec.ts:192-207` and `blogs.controller.spec.ts:192-207`. `test/blogs.e2e-spec.ts:224-246` becomes a 400 test.
- Fix the stale constructor at `blogs.service.spec.ts:23`.



## Slice 4: Consistent permission-denial status (bug fix)

Users and blogs answer the same kind of refusal the same way.

- [ ] A non-admin updating another user gets 403 `User <actor> cannot update user <id>`, and the target is unchanged
- [ ] A non-admin deleting another user gets 403 `User <actor> cannot delete user <id>`, and the target still exists
- [ ] A non-admin changing their own role still gets 400 `Cannot update role of the user` (unchanged)

**Existing tests this changes:** every `UnauthorizedException` / 401 assertion in `users.service.spec.ts`, `users.controller.spec.ts` and `test/users.e2e-spec.ts`.

---



## Slice 5: Database service test coverage (QC item 4, test-only)

New file `src/database/database.service.spec.ts`.

- [ ] User ids start at 4 and increase by one on each call
- [ ] Blog ids start at 1 and increase by one on each call
- [ ] Removing by author deletes every blog written by that author
- [ ] Removing by author leaves blogs by other authors untouched
- [ ] Removing by author does nothing when the author has no blogs
- [ ] Two Database instances do not share users, blogs or id counters

**Existing tests this changes:** none.

## Slice 6: Role permission matrix (QC item 5, test-only)

New tests go in the existing `src/users/roles/get-user-role.spec.ts`. Build entities with explicit ids.

- [ ] An unknown role falls back to free-user permissions (cannot change roles, cannot update other users)
- [ ] A non-admin can update their own blog, and is denied on another author's blog
- [ ] A non-admin can update themselves, and is denied on another user
- [ ] A non-admin can delete themselves, and is denied on another user
- [ ] Neither a free nor a premium user can change roles
- [ ] An admin can update any blog, update any user, delete any user and change roles (one test each, with a target owned by a different id)

**Existing tests this changes:** none. The existing tests in `get-user-role.spec.ts` are kept.

## Slice 7: Remaining service behavior gaps (QC items 2 and 3, test-only)

- [ ] A premium user can update their own blog
- [ ] A premium user can remove their own blog, and gets the deletion message
- [ ] A free user updating another user's blog gets 403, and the blog is unchanged
- [ ] A free user removing another user's blog gets 403, and the blog still exists
- [ ] A non-admin updating an admin's blog gets 403
- [ ] Listing blogs with no blogs stored returns an empty list
- [ ] Listing blogs with several authors attaches each blog's own author, in order
- [ ] A non-admin can update their own fields when the role sent equals their current role
- [ ] A premium user upgrading their own role to admin gets 400 `Cannot update role of the user`, and the role stays premium
- [ ] Deleting a user removes that user's blogs and keeps other users' blogs

**Existing tests this changes:** optional test-only tidies in `users.service.spec.ts`: remove the `.call` wrapper at `:278-285` and the duplicate role test at `:243-258`. Premium-actor 403 cases are covered in Slice 4. Ownership-transfer cases from qc-plan item 2 are dropped (superseded).

## Slice 8: e2e payload validation coverage (QC item 6, test-only)

- [ ] `POST /blogs` without `title` returns 400, and `GET /blogs` returns `[]`
- [ ] `POST /blogs` with an empty `content` returns 400
- [ ] `POST /blogs` with `authorId: "1"` (a string) returns 400
- [ ] `POST /users` without `email` returns 400
- [ ] `POST /users` with a malformed email returns 400
- [ ] `PATCH /blogs/:id` with only `title` updates the title and leaves `content` unchanged

**Existing tests this changes:** none. No new tests go into the controller unit specs.

---



## API Shape (after hardening)

```
Headers: user-id: <numeric string>   required on POST /blogs, PATCH/DELETE /blogs/:id, PATCH/DELETE /users/:id
:id                                  numeric string, otherwise 400

POST   /users        { name: string, email: string(email) }                  -> 201 { id, name, email, role: 'free' }
PATCH  /users/:id    { name?, email?, role?: 'admin'|'premium'|'free' }      -> 200 user | 400 | 403 | 404
DELETE /users/:id                                                            -> 200 { message } | 400 | 403 | 404
POST   /blogs        { title: string, content: string, authorId: number }    -> 201 { id, title, content, authorId, author } | 400 | 403 | 404
PATCH  /blogs/:id    { title?, content? }                                    -> 200 blog | 400 | 403 | 404
DELETE /blogs/:id                                                            -> 200 { message } | 400 | 403 | 404
Unknown body fields (id, author, authorId on PATCH /blogs, role on POST /users) -> 400
```



## Out of Scope

- Real authentication (JWT, sessions). The `user-id` header stays the trusted identity.
- Transferring blog ownership in any form.
- Changing how blogs are stored (the embedded `author` copy stays), and any fix for a stale stored author copy.
- Persistence beyond the in-memory Database, and a configurable seed.
- Changes to the Free/Premium permission rules (they stay identical).
- Pagination, filtering, or new endpoints.
- Unrelated tidies (Prettier pass, removing the unused `BlogsService` import and `Global` import) unless they are done as separate behavior-neutral commits in the change area.
- Trimming the duplicated controller unit specs, beyond updates forced by signature changes.



## Technical Context

- Patterns to follow:
  - Controllers stay thin, and all business rules live in services.
  - Services throw Nest `HttpException` subclasses with template messages.
  - Tests use no mocks. Build the graph with `new Database()`, `new UsersService(db)` and `new BlogsService(db, usersService)`.
  - Test names use `it('should ...')` with `// given // when // then`. Assert both the exception type and the exact message.
  - Strip `id`/`author` from factory objects before calling `create`. Give entities built directly an explicit id.
  - ESM imports use `.js` specifiers.
  - Test filenames must not contain slice numbers.
- Key dependencies:
  - `src/main.ts`: the global ValidationPipe. Its shared config will be reused by e2e.
  - `src/users/roles/*`: authorization.
  - `src/database/database.service.ts`: seed is 1 John free, 2 Jane premium, 3 Ada admin. Next user id is 4, next blog id is 1.
  - class-validator DTOs: every user DTO field needs decorators once whitelisting is on.
- Risk level: MODERATE (authorization and data integrity).

[ x] Reviewed