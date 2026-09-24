# Bee Context — Blog app hardening (FEATURE, MODERATE)

## Developer Decisions (binding)
- Order: fix critical review bugs first, then fill QC test gaps from docs/specs/qc-plan.md.
- authorId is IMMUTABLE after create — nobody (incl. admins) may change it; remove from UpdateBlogDto (e.g. PartialType(OmitType(CreateBlogDto, ['authorId']))).
- Strict 400s at HTTP boundary: non-numeric :id or user-id header → 400; unknown body fields (e.g. id) → 400 via forbidNonWhitelisted; missing user-id header → 400.
- Blog create: keep authorId in body, REQUIRE user-id header, 403 unless authorId === actor; admins may post for anyone.
- qc-plan item 2's ownership-transfer tests are superseded by the immutability decision.

## Context Summary (context-gatherer, text-based pattern matching)

### Project Structure
- Root M:/Incubyte/Learning_Module/Day2/incubyte_blog. TypeScript 6, NestJS 12 (@nestjs/common ^12.0.1), Express. ESM ("type":"module", module nodenext) — `.js` import specifiers. emitDecoratorMetadata + experimentalDecorators, strict: true.
- nest build; vitest 4 + vite-tsconfig-paths.
- src/ by feature: users/ (controller, service, dto, entities, factories, roles), blogs/ (controller, service, dto, entities, factories), database/ (in-memory Database). e2e in test/.
- Deps: class-validator 0.15, class-transformer, @nestjs/mapped-types, fishery, @faker-js/faker, supertest.
- No CLAUDE.md, no ADRs. README is Nest boilerplate.

### Architecture
- Simple Nest MVC: thin Controller → Service (all rules: authz, validation, 404s) → in-memory Database. Controllers do `+id` and pass raw `actorId` header.
- Authz strategy: users/roles/ — UserRole interface + NonAdminRole base (both in user-role.interface.ts); FreeUser/PremiumUser extend NonAdminRole (identical); Admin returns true for all; getUserRole(user) switch, default FreeUser. NonAdminRole.canUpdateBlog/canDeleteBlog compare this.user.id === blog.authorId.
- BlogsService → UsersService + Database. UsersService → Database only, but has unused BlogsService import (users.service.ts:8, import cycle). BlogsModule imports UsersModule + DatabaseModule. DatabaseModule not @Global (unused Global import).

### Test Infrastructure
- vitest 4, globals: true. Unit `src/**/*.spec.ts` (vitest.config.ts) via `npm test`; e2e `test/*.e2e-spec.ts` (vitest.config.e2e.ts) via `npm run test:e2e`; `npm run test:cov`; lint `npm run lint` (oxlint); format `npm run format`.
- No mocks (project convention). Unit tests: `db = new Database(); usersService = new UsersService(db); service = new BlogsService(db, usersService)`. Seed: 1 John free, 2 Jane premium, 3 Ada admin; next user id 4, next blog id 1.
- Style: `it('should ...')`, `// given // when // then`, assert exception type AND message. Factory destructure: `const { id, author, ...dto } = blogFactory.build({ author: john })`.
- Factories: user.factory.ts (id from sequence — can collide with seeds 1-3); blog.factory.ts includes id, authorId, author.
- e2e bootstrap: Test.createTestingModule({imports:[AppModule]}) → createNestApplication() → init() per test; NO useGlobalPipes (differs from main.ts); duplicated in both e2e files.
- Suites inferred to pass today (vitest doesn't type-check; e2e asserts buggy 404). Decorator metadata is emitted, so ValidationPipe in e2e will validate.

### Conventions
- Services throw Nest HttpException subclasses with template messages (`User ${id} not found`, `User ${a} cannot update blog ${id}`).
- Inconsistent: users → UnauthorizedException(401) for permission denial + 'Invalid actor id'(400); blogs → ForbiddenException(403) + 'Actor ID is required'.
- Constructor DI. DTO classes; Update DTOs = PartialType(Create...).
- Prettier configured but source not consistently formatted.

### Change Area (current shape)
- src/main.ts:7 `app.useGlobalPipes(new ValidationPipe())` no options.
- Controllers: `@Param('id') id: string` → `+id`; `@Headers('user-id') actorId: number` (runtime string|undefined). POST /blogs takes no header.
- users.service.ts: create `{ id: nextUserId(), ...dto, role: USER_ROLES[2] }` (15-19, id override bug; role safe). update: global isNaN guard (400 for undefined/'abc'), authz (401), role checks (400 'Cannot update role of the user'/'Invalid role'), Object.assign(user, dto) (61). remove: same guard, cascade db.removeByAuthorId.
- blogs.service.ts: create(dto) no actor; `{ id, ...dto, author }` (18) stores author snapshot. findAll/findOne return copies with fresh author. update: Number.isNaN guard (misses undefined/'abc' → 404 'User abc not found'), findOne copy, unused author lookup (49-51), Object.assign, persists snapshot. remove: same guard.
- DTOs: create-blog.dto (@IsNotEmpty @IsString title/content; @IsNotEmpty @IsNumber authorId); update-blog.dto PartialType(CreateBlogDto); create-user.dto name/email NO validators + unused UserRoleName import; update-user.dto role?: UserRoleName no validator. With whitelist, undecorated props are stripped/rejected → every user DTO field needs decorators (@IsString/@IsNotEmpty, @IsEmail, @IsOptional @IsIn(USER_ROLES)).
- Entities: User {id,name,email,role}, USER_ROLES = ['admin','premium','free'] as const; Blog {id,title,content,authorId,author?}.
- Only auth is trusted user-id header. Need one shared actor-id parsing (ParseIntPipe or custom pipe/helper) for consistent 400.

### Open decisions flagged by context-gatherer
1. Error message shape: ParseIntPipe → 'Validation failed (numeric string is expected)', breaks existing 'Invalid actor id'/'Actor ID is required' assertions; custom pipe/exceptionFactory can unify.
2. Users 401 → 403 for permission denial? Not in binding decisions.
3. Blog create check order when authorId unknown AND actor ≠ authorId: 403 vs 404.
4. Stop persisting author snapshot in db.blogs (recommended: store authorId only, resolve on read).

### Existing tests that will need updating
- Blog create requires header/actor: all service.create/controller.create calls in blogs.service.spec.ts, blogs.controller.spec.ts, users.service.spec.ts:373-396 cascade (also relies on id-override bug); every POST /blogs in test/blogs.e2e-spec.ts and users.e2e-spec.ts:427-436 needs .set('user-id'); blogs.e2e-spec.ts:50-67 (authorId 999, no header) changes.
- authorId immutable: blogs.service.spec.ts:192-207, blogs.controller.spec.ts:192-207 obsolete; blogs.e2e-spec.ts:224-246 → 400.
- Missing header → 400: blogs.e2e-spec.ts:121-142, 250-271 (currently 404). Unit NaN tests in both blog and user specs use Number(undefined). users.e2e-spec.ts:117-132, 317-330 assert 'Invalid actor id'.
- forbidNonWhitelisted/@IsIn: users.e2e-spec.ts:40-60 (POST with role → currently 201 free) becomes 400 unless role allowed in CreateUserDto; users.e2e-spec.ts:296-313 'guest' role message changes to class-validator array.
- ParseIntPipe on :id: controller specs pass String(id); signature change requires updates.
- Stale ctor blogs.service.spec.ts:23.

### Tidy Opportunities
- Unused BlogsService import users.service.ts:8; split BadRequestException import line 6.
- USER_ROLES[2] magic index (users.service.ts:18).
- Dead author var blogs.service.ts:49-51 (whole block goes with immutability).
- Unused UserRoleName import create-user.dto.ts:1; unused Global import database.module.ts:2.
- Stale ctor blogs.service.spec.ts:23 + misleading NOTE 26-27.
- users.service.spec.ts:278-285 .call wrapper; duplicate role test 243-258 vs 156-168.
- create-user-role.spec.ts misnamed; users built without explicit ids.
- Admin.canUpdate/canDelete unused params.
- Duplicated e2e bootstrap → shared configureApp(app) used by main.ts and a createTestApp() helper.
- Controller unit specs duplicate service specs (consider trimming).
- Prettier formatting (separate commit).

### Design System
- UI-involved: no. No design system.
