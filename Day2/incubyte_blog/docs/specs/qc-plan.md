# QC Plan: incubyte_blog

## Execution Instructions

Read this plan. Work through each item in the priority queue in order.
For each item: complete the refactoring steps first (if any), then write the tests.
Mark each checkbox done as you complete it ([ ] -> [x]).

Analysis method: text-based pattern matching

Project conventions to follow in every new test:

- Runner: vitest. Unit tests: `npm test` (`**/*.spec.ts`). E2E: `npm run test:e2e` (`test/**/*.e2e-spec.ts`).
- Test names: `it('should ...')`. Body split into `// given`, `// when`, `// then` comments.
- No mocks. Build the real graph with `new`: `db = new Database(); usersService = new UsersService(db); service = new BlogsService(db, usersService);`. Seed users are `1 John (free)`, `2 Jane (premium)`, `3 Ada (admin)`. The next user id is 4 and the next blog id is 1.
- Assert the exact exception type and the exact message, e.g. `expect(() => ...).toThrow(new ForbiddenException('User 1 cannot update blog 1'))`.
- Fishery factories: `userFactory` (`src/users/factories/user.factory.ts`), `blogFactory` (`src/blogs/factories/blog.factory.ts`). Factory objects include `id` and `author`. **Strip them before you pass a factory object to** `create`: `const { id, author, ...dto } = blogFactory.build({ author: john })`. When you build entities directly (role and database tests), **pass an explicit** `id` so fishery's `sequence` cannot collide with seed ids 1-3.
- Items tagged **(fix + test)** change production behavior. They are bug fixes, so the developer decides before implementation starts. Write the test first (RED), make the smallest fix (GREEN), then run the full suite. If the developer rejects a fix, skip that checkbox and keep the rest of the item.



## Analysis Summary


| Metric                    | Value                                                                                                                                                    |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Files analyzed            | 33 (31 under src/, 2 under test/)                                                                                                                        |
| Hotspots identified       | 9 (6 planned below; 3 skipped: `users.service.spec.ts` is a test file, `create-user.dto.ts` and `user.entity.ts` are type-only with no behavior to test) |
| Already tested            | 0 (every planned hotspot has partial tests; none has full behavior coverage)                                                                             |
| Needing tests             | 6                                                                                                                                                        |
| Needing refactoring first | 2 (items 1 and 6); items 2 and 3 also contain opt-in (fix + test) cases                                                                                  |




## Priority Queue


| #   | File                                                                                                    | Hotspot Score | Complexity | Effort | Reward | Reasoning                                                                                                                                                                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------- | ------------- | ---------- | ------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | src/blogs/blogs.service.ts (actor guard in `update`/`remove`)                                           | 18            | high       | Low    | High   | 6x changes, 1 author, partial tests. The guard `Number.isNaN(actorId)` never fires for a missing or non-numeric header. The e2e suite asserts 404 'User undefined not found', which locks the bug in                                                   |
| 2   | src/blogs/blogs.service.ts (authorization matrix, ownership transfer, create)                           | 18            | high       | Med    | High   | 6x changes, 1 author, partial tests. Three permission combinations are untested. Admin reassignment returns a stale `author`. A client-supplied `id`/`author` overrides server values on create                                                        |
| 3   | src/users/users.service.ts                                                                              | 15            | high       | Med    | High   | 5x changes, 1 author, partial tests. A body `id` overwrites records on create and update (POST can overwrite John). The premium actor is never exercised. The role short-circuit is untested. The cascade never checks that other users' blogs survive |
| 4   | src/database/database.service.ts                                                                        | 15            | high       | Low    | High   | 5x changes, 1 author, no direct tests. Every spec depends on its seed and counters. `removeByAuthorId` is a cascade delete with no direct test                                                                                                         |
| 5   | src/users/roles/user-role.interface.ts, src/users/roles/admin.role.ts, src/users/roles/get-user-role.ts | 9 (6 + 3)     | med        | Low    | Med    | 3x changes each, 1 author, partial tests. 8 of the 10 role permission methods have no direct tests. The `getUserRole` default branch (FreeUser) is untested                                                                                            |
| 6   | src/blogs/blogs.controller.ts, src/users/users.controller.ts (HTTP boundary via e2e)                    | 3             | low        | Med    | Med    | 3x changes, 1 author. Tests exist but are coupled to the wrong setup: the e2e bootstrap skips `ValidationPipe`, so DTO validators run nowhere. Non-numeric `:id` returns 404 'NaN'. Controller unit specs duplicate the service specs                  |




## Detailed Plan



### [ ] 1. src/blogs/blogs.service.ts (actor guard in `update` and `remove`) — Hotspot: 18

**Test status:** partial tests. The existing unit tests pass `NaN` as the actor. HTTP never produces `NaN`: a missing header arrives as `undefined` and a bad header arrives as a string. `test/blogs.e2e-spec.ts:121-142` and `:250-271` assert `404 'User undefined not found'`, which documents the bug as if it were intended behavior.

**Risk:** An unauthenticated request (no `user-id` header) or a malformed one gets past the input guard. It is rejected only by accident, because of how the lookup fails. Users and blogs also disagree on how they handle the same bad input.

**Refactoring needed:**

- [x] (fix + test) In `update` (line 40) and `remove` (line 58), replace `Number.isNaN(actorId)` with a guard that rejects `undefined` and non-numeric strings. Example: `const actor = Number(actorId); if (actorId === undefined || Number.isNaN(actor)) throw new BadRequestException('Actor ID is required');`. Pass the numeric `actor` downstream. WHY: this makes the guard reject the inputs HTTP actually sends. Behavior change: a missing or bad header now returns 400 instead of 404. Optional: extract a small `parseActorId(actorId): number` helper and use it in both methods. Do not touch UsersService here.

**Tests to create:**

- [x] Rewrite the existing unit test `should throw error if actor id is missing` (update) to pass `undefined as unknown as number` instead of `NaN`. Given a blog created by John through `service.create(dto)`. When `service.update(blog.id, { title: 'Updated' }, undefined as unknown as number)`. Then it throws `new BadRequestException('Actor ID is required')` and `service.findOne(blog.id).title` is unchanged. This rewrites the existing test; do not add a second one. (Unit)
- [x] `should throw BadRequestException when actor id is a non-numeric string` (update). Given John's blog. When the actor is `'abc' as unknown as number`. Then it throws `new BadRequestException('Actor ID is required')` and the title is unchanged. (Unit)
- [x] `should allow update when actor id arrives as a numeric string` (update). Given John's blog. When the actor is `'1' as unknown as number`. Then the returned title is updated. This is a characterization test: it keeps the fix from breaking real header input. (Unit)
- [x] Repeat the same three cases for `remove`: rewrite the NaN test to use `undefined`, add a test for `'abc'`, and add `should allow remove when actor id arrives as a numeric string` (then `db.blogs[blog.id]` is undefined). (Unit)
- [x] Rewrite `test/blogs.e2e-spec.ts:121-142` (update) and `:250-271` (remove) to expect `400` and `'Actor ID is required'`. Keep the "blog unchanged" / "blog still exists" assertions. These are rewrites of existing tests, not new ones. (Integration)

**Done when:** a missing or non-numeric actor is rejected with 400 at both the unit and the e2e level, a numeric-string actor still works, no test asserts 'User undefined not found', and `npm test` and `npm run test:e2e` pass.

### [ ] 2. src/blogs/blogs.service.ts (authorization matrix, ownership transfer, create) — Hotspot: 18

**Test status:** partial tests. Already covered, do not duplicate: author updates/removes own blog, admin updates/removes any blog, premium non-author gets 403 on update and remove, and `authorId: 999` in an update gets 404.

**Risk:** Permission regressions on the most-changed file. `update` checks the new author exists (line 50) but never stores it, so the response carries the old `author`. `create` spreads the DTO after `id` (line 18), so a client-supplied `id` or `author` overrides the server's values.

**Refactoring needed:**

- [x] Test-only tidy: add a local helper in `blogs.service.spec.ts`: `const createBlogBy = (user: User) => { const { id, author, ...dto } = blogFactory.build({ author: user }); return service.create(dto); };`. WHY: the new tests create many blogs, and this removes a repeated destructure. Production code is unchanged.
- [x] (fix + test) In `create`, build the blog as `{ ...createBlogDto, id: this.db.nextBlogId(), author }` so server values win. WHY: a client must not choose the storage key or fake the author.
- [x] (fix + test) In `update`, when `authorId` changes, assign the resolved author to the blog (`blog.author = author`) instead of discarding it (lines 49-51). WHY: the response currently shows the previous owner. Alternatively, drop the stored `author` snapshot entirely; the developer decides.

**Tests to create:**

- [x] `should allow a premium user to update their own blog`. Given `createBlogBy(jane)`. When `service.update(blog.id, { title: 'Updated' }, jane.id)`. Then the returned `title` is 'Updated'. (Unit)
- [x] `should throw ForbiddenException when a free user updates another user's blog`. Given `createBlogBy(jane)`. When John updates it. Then it throws `new ForbiddenException(\`User 1 cannot update blog ${blog.id})` and the title is unchanged. (Unit)
- [x] `should throw ForbiddenException when a non-admin updates an admin's blog`. Given `createBlogBy(ada)`. When Jane updates it. Then it throws `ForbiddenException` with `User 2 cannot update blog ${blog.id}`. (Unit)
- [x] `should throw ForbiddenException when a free user removes another user's blog`. Given `createBlogBy(jane)`. When John removes it. Then it throws `new ForbiddenException(\`User 1 cannot delete blog ${blog.id})`and`db.blogs[blog.id]` still exists. (Unit)
- [x] `should allow a premium user to remove their own blog`. Given `createBlogBy(jane)`. When Jane removes it. Then the result message is `Blog ${blog.title} (${blog.id}) deleted successfully` and `db.blogs[blog.id]` is undefined. (Unit)
- [x] `should transfer ownership when an admin changes authorId`. Given `createBlogBy(john)`. When `service.update(blog.id, { authorId: jane.id }, ada.id)`. Then `service.findOne(blog.id).authorId` is 2 and `.author` equals `jane`. This passes today. (Unit)
- [x] (fix + test) `should return the new author after ownership transfer`. Same setup. Then the returned blog's `author` equals `jane` (today it returns `john`). (Unit)
- [x] DECISION FIRST, then test: may a non-admin author give their blog away (`authorId` change by the author)? The current code allows it. If yes, write `should allow the author to transfer ownership`. If no, add a guard and write `should throw ForbiddenException when a non-admin changes authorId`. Do not write either test until the developer decides. (Unit)
- [x] (fix + test) `should ignore a client-supplied id on create`. Given `{ ...dto, id: 99 } as CreateBlogDto` for John. When `service.create(...)`. Then `blog.id` is 1 and `db.blogs[99]` is undefined. (Unit)
- [x] (fix + test) `should attach the stored author even if the payload contains an author`. Given a DTO with `author: userFactory.build({ id: 50 })` cast in. When created. Then `blog.author` equals `john`. (Unit)
- [x] `should return an empty list when there are no blogs`. Given a fresh service. When `findAll()`. Then the result is `[]`. (Unit)
- [x] `should attach each blog's own author when blogs have different authors`. Given `createBlogBy(john)` and `createBlogBy(jane)`. When `findAll()`. Then the authors are `[john, jane]` in order. (Unit)

**Done when:** every combination of role (free, premium, admin) × owner/non-owner × update/remove has one behavior test, ownership transfer is specified and tested, create cannot be overridden by the client (if the fixes are accepted), and all tests pass without mocks.

### [ ] 3. src/users/users.service.ts — Hotspot: 15

**Test status:** partial tests. Already covered, do not duplicate: create default role and ignore role in the payload, findOne 404, update with NaN, missing actor, or missing target, a free user changing own role (400), admin role change, non-admin updating another user (401), admin/self field updates, invalid role 'guest', and delete NaN/404/401/admin/self/cascade.

**Risk:** Data corruption and privilege paths. `create` spreads the DTO after `id` (lines 15-19), so `POST /users { id: 1 }` overwrites John. `Object.assign(user, dto)` (line 61) lets `PATCH /users/1 { id: 5 }` rewrite the stored id. The premium role is never used as an actor. The same-role short-circuit (line 50) is unspecified.

**Refactoring needed:**

- [x] (fix + test) In `create`, put the spread first: `{ ...createUserDto, id: this.db.nextUserId(), role: USER_ROLES[2] }`. WHY: a client-supplied id currently overwrites an existing user.
- [x] (fix + test) In `update`, drop `id` before assigning, e.g. `const { id: _ignored, ...changes } = updateUserDto as UpdateUserDto & { id?: number }; Object.assign(user, changes);`. WHY: the stored record's id must not diverge from its key.
- [x] Test-only tidy (optional, separate commit): remove the leftover `.call` wrapper at `users.service.spec.ts:278-285`. Remove the duplicate role test at `:243-258`, which repeats `:156-168`. Rewrite the cascade test at `:373-396` to strip `id`/`author` from the factory blog before `blogsService.create`. It currently relies on the id-override bug. After fix 2 in item 2 it would silently test the wrong blog.

**Tests to create:**

- [x] (fix + test) `should ignore a client-supplied id and keep existing users intact`. Given `{ ...dto, id: 1 }` built from `userFactory.build()` without `id`/`role`. When `service.create(...)`. Then the returned `id` is 4, `service.findOne(1).name` is 'John', and `findAll()` has length 4. (Unit)
- [x] (fix + test) `should not change the user id when the update payload contains id`. Given Ada as actor. When `service.update(1, { name: 'Johnny', id: 5 } as UpdateUserDto, 3)`. Then the returned `id` is 1, `db.users[1].id` is 1, and `db.users[5]` is undefined. (Unit)
- [x] `should allow a non-admin to update own fields when the role sent equals the current role`. Given John. When `service.update(1, { name: 'Johnny', role: 'free' }, 1)`. Then `name` is 'Johnny' and `role` is 'free'. This characterizes the line 50 short-circuit. (Unit)
- [x] `should throw BadRequestException when a premium user upgrades own role to admin`. Given Jane. When `service.update(2, { role: 'admin' }, 2)`. Then it throws `new BadRequestException('Cannot update role of the user')` and `findOne(2).role` is still 'premium'. (Unit)
- [x] `should throw UnauthorizedException when a premium user updates another user`. Given Jane. When `service.update(1, { name: 'X' }, 2)`. Then it throws `new UnauthorizedException('User 2 cannot update user 1')`. (Unit)
- [x] `should throw UnauthorizedException when a premium user deletes another user`. Given Jane. When `service.remove(1, 2)`. Then it throws `new UnauthorizedException('User 2 cannot delete user 1')` and John still exists. (Unit)
- [x] `should throw BadRequestException when actor id is a non-numeric string`. When `service.update(1, { name: 'X' }, 'abc' as unknown as number)`. Then it throws `new BadRequestException('Invalid actor id')`. This covers the real header input. (Unit)
- [x] `should keep other users' blogs when deleting a user`. Given one blog for John and one for Jane via `blogsService.create` (with `id`/`author` stripped). When `service.remove(1, 3)`. Then `db.blogs` contains only Jane's blog. (Unit)

**Done when:** no payload can change a stored user's id, every actor role (free, premium, admin) is used at least once in both update and remove, the cascade test proves other users' data survives, and all tests pass.

### [ ] 4. src/database/database.service.ts — Hotspot: 15

**Test status:** no tests. There is no `database.service.spec.ts`. It is exercised only indirectly, through about 40 service tests that rely on its seed.

**Risk:** Largest blast radius in the codebase. Every service and spec reads and writes its public records. `removeByAuthorId` is a cascade delete, and a wrong comparison (e.g. `==` against a string id) would wipe the wrong data. The e2e isolation depends on each instance getting its own state.

**Refactoring needed:**

- None needed. The class is testable as-is with `new Database()`. (A constructor seed parameter would decouple tests from seed ids 1-3. That is a worthwhile follow-up, but no test here needs it, so skip it for now.)

**Tests to create** (new file `src/database/database.service.spec.ts`):

- [x] `should start user ids at 4 and increment on each call`. Given `new Database()`. When `nextUserId()` is called twice. Then the results are 4 and 5. (Unit)
- [x] `should start blog ids at 1 and increment on each call`. Given `new Database()`. When `nextBlogId()` is called twice. Then the results are 1 and 2. (Unit)
- [x] `should remove every blog written by the given author`. Given `db.blogs[1] = blogFactory.build({ id: 1, authorId: 1 })` and `db.blogs[2] = blogFactory.build({ id: 2, authorId: 1 })`. When `removeByAuthorId(1)`. Then `db.blogs[1]` and `db.blogs[2]` are undefined. (Unit)
- [x] `should leave blogs of other authors untouched`. Given blog 1 by author 1 and blog 2 by author 2. When `removeByAuthorId(1)`. Then `db.blogs` equals `{ 2: <blog 2> }`. (Unit)
- [x] `should do nothing when the author has no blogs`. Given blog 1 by author 2. When `removeByAuthorId(1)`. Then `db.blogs` is unchanged. (Unit)
- [x] `should not share state between instances`. Given `a = new Database()`, then `a.users[4] = userFactory.build({ id: 4 })`, `a.nextUserId()`, and a blog added. When `b = new Database()`. Then `b.users` has 3 entries, `b.blogs` is `{}`, and `b.nextUserId()` is 4. This protects test and e2e isolation against a future static/module-level refactor. (Unit)

**Done when:** counters, cascade scope, and instance isolation each have one behavior test, and the tests pass without touching any service.

### [ ] 5. src/users/roles/user-role.interface.ts, admin.role.ts, get-user-role.ts — Hotspot: 9

**Test status:** partial tests. Already covered in `src/users/roles/create-user-role.spec.ts`, do not duplicate: `getUserRole` returns Admin, PremiumUser, or FreeUser; `Admin.canDeleteBlog`; `NonAdminRole.canDeleteBlog` for own and other blogs (free and premium).

**Risk:** These pure functions decide every authorization outcome in both services. They are cheap to test and currently rely only on service-level tests.

**Refactoring needed:**

- None needed. The classes are pure, and you can construct them with `new FreeUser(user)` / `new Admin(user)` or through `getUserRole(user)`.

- [x] Test-only tidy (optional): rename `create-user-role.spec.ts` to `get-user-role.spec.ts` and fix its `describe` name to match. WHY: the file tests `getUserRole`, and no `create-user-role.ts` exists, so the current name misleads readers.

**Tests to create** (add to the existing roles spec; use `userFactory.build({ id: 10 })` / `blogFactory.build({ id: 1, authorId: ... })` with explicit ids):

- [x] `should fall back to FreeUser for an unknown role`. Given `userFactory.build({ id: 10, role: 'guest' as UserRoleName })`. When `getUserRole(user)`. Then `role.canUpdateRole()` is false and `role.canUpdate(otherUser)` is false. This asserts behavior rather than `toBeInstanceOf`. (Unit)
- [x] `should allow a non-admin to update their own blog` and `should deny a non-admin updating another author's blog` (`canUpdateBlog`). (Unit)
- [x] `should allow a non-admin to update themselves` and `should deny a non-admin updating another user` (`canUpdate`). (Unit)
- [x] `should allow a non-admin to delete themselves` and `should deny a non-admin deleting another user` (`canDelete`). (Unit)
- [x] `should never allow a non-admin to change roles` (`canUpdateRole` is false for both FreeUser and PremiumUser). (Unit)
- [x] `should allow an admin to update any blog`, `should allow an admin to update any user`, `should allow an admin to delete any user`, and `should allow an admin to change roles`: one test each, with a target owned by a different id. (Unit)

**Done when:** all 5 methods on `NonAdminRole` and `Admin` have allow/deny behavior tests, the default branch of `getUserRole` is tested, and the file name and describe name match the unit under test.

### [ ] 6. src/blogs/blogs.controller.ts, src/users/users.controller.ts (HTTP boundary) — Hotspot: 3

**Test status:** tests exist but are implementation-coupled. The controller unit specs (36 tests) repeat the service specs almost verbatim, so do not add more there. The e2e suites build the app without the `ValidationPipe` that `main.ts:7` applies, so the `class-validator` rules on `CreateBlogDto` are never exercised. `@Headers('user-id') actorId: number` (blogs.controller.ts:26,31) is typed as a number but receives a string or `undefined` at runtime.

**Risk:** Tests pass against an app configuration that differs from production. Invalid blog payloads, non-numeric ids, and bad headers behave differently in production than under test.

**Refactoring needed:**

- [x] In both `test/blogs.e2e-spec.ts` and `test/users.e2e-spec.ts` `beforeEach`, add `app.useGlobalPipes(new ValidationPipe());` before `app.init()`. WHY: the e2e app then matches production bootstrap. This is test-only, but it may turn existing e2e tests red if they send invalid bodies. Treat that as a real finding, not noise.
- [x] (fix + test, decision) Use `@Param('id', ParseIntPipe) id: number` in both controllers. WHY: `GET /users/abc` currently returns 404 'User NaN not found' instead of 400. This changes the response code.

**Tests to create:**

- [x] `POST /blogs should return 400 when title is missing`. Given `{ content: 'x', authorId: 1 }`. When POSTed. Then the status is 400 and `GET /blogs` returns `[]`. (Integration)
- [x] `POST /blogs should return 400 when authorId is not a number`. Given `{ title: 't', content: 'c', authorId: '1' }`. Then the status is 400. (Integration)
- [x] `PATCH /blogs/:id should return 400 when the user-id header is non-numeric`. Given a blog by author 1. When PATCHed with `user-id: abc`. Then the status is 400 with message 'Actor ID is required'. Requires item 1. (Integration)
- [x] (fix + test) `GET /users/abc should return 400`. Only after the ParseIntPipe decision. Then the status is 400, not 404 'User NaN not found'. (Integration)
- [x] `PATCH /users/1 should not change the user id when the body contains id`. Given the admin header `user-id: 3`. When the body is `{ name: 'Johnny', id: 5 }`. Then `GET /users/1` returns id 1 and `GET /users/5` is 404. Requires the item 3 fix. (Integration)

**Done when:** the e2e bootstrap mirrors `main.ts`, DTO validation has at least two e2e tests, and header and id parsing behave the same in e2e as in production. No new tests are added to the controller unit specs.