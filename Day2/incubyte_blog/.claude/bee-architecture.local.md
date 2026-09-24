# Architecture — Blog App Hardening

## Decision
Keep the existing NestJS MVC with feature folders (thin controller → service with rules → in-memory Database). Add three small pieces, no new layers/interfaces/ports:
1. `src/configure-app.ts` — shared app config.
2. `src/common/actor-id.decorator.ts` — `@ActorId()` param decorator.
3. `canCreateBlogFor(authorId)` on `UserRole`.

## Developer decisions on architecture (binding)
- `@ActorId()` is built with `createParamDecorator` (NOT `@Headers('user-id', pipe)` — orchestrator verified in node_modules that Nest's `@Headers()` accepts no pipes and HEADERS params are not pipeable, so a pipe there would silently do nothing).
- Remove the now-unreachable `Invalid role` check in UsersService and its unit test.

## 1. Shared validation config
- `src/configure-app.ts`: `export function configureApp(app: INestApplication): INestApplication` → `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))`; return app.
- `src/main.ts`: create app → `configureApp(app)` → listen.
- `test/create-test-app.ts`: `export async function createTestApp(): Promise<INestApplication>` — `Test.createTestingModule({ imports: [AppModule] }).compile()` → `createNestApplication()` → `configureApp(app)` → `await app.init()` → return. (vitest e2e include is `**/*.e2e-spec.ts`, so the helper is not collected as a test.)
- Both e2e `beforeEach` become `app = await createTestApp()`.
- Do NOT set `transform: true` (keeps `authorId: "1"` → 400; services receive plain objects).

## 2. Actor header and :id
- `src/common/actor-id.decorator.ts`:
  ```ts
  export const ACTOR_HEADER = 'user-id';
  export const ActorId = createParamDecorator((_data: unknown, ctx: ExecutionContext): number => {
    const raw = ctx.switchToHttp().getRequest().headers[ACTOR_HEADER];
    if (typeof raw !== 'string' || !/^\d+$/.test(raw)) {
      throw new BadRequestException('Valid user-id header is required');
    }
    return Number(raw);
  });
  ```
  Missing, array, 'abc', '1.5', '' → 400 'Valid user-id header is required'. '1' → 1.
  Controllers: `@ActorId() actorId: number`.
- `:id`: `@Param('id', ParseIntPipe) id: number` on every route (Nest default message 'Validation failed (numeric string is expected)'); remove `+id`.
- Remove the service NaN guards (users.service update/remove, blogs.service update/remove) and their unit tests (NaN / Number(undefined) cases in service and controller specs). Boundary behavior is covered by e2e using the production config. Service signatures keep `actorId: number`.
- Controller unit specs pass numbers for id (ParseIntPipe only runs over HTTP).

## 3. Blog-create permission
- `UserRole` (src/users/roles/user-role.interface.ts): add `canCreateBlogFor(authorId: number): boolean`. `NonAdminRole` → `this.user.id === authorId`; `Admin` (admin.role.ts) → `true`. FreeUser/PremiumUser inherit.
- `BlogsService.create(createBlogDto, actorId)` order:
  1. `actor = usersService.findOne(actorId)` → 404 if actor unknown.
  2. `if (!getUserRole(actor).canCreateBlogFor(dto.authorId))` → `ForbiddenException(\`User ${actorId} cannot create blog for user ${dto.authorId}\`)`.
  3. `author = usersService.findOne(dto.authorId)` → 404 (reachable only by admin).
  4. `{ ...createBlogDto, id: this.db.nextBlogId(), author }`; store; return.
- Controller: `create(@Body() dto: CreateBlogDto, @ActorId() actorId: number)`.

## 4. authorId immutability and server-owned fields
- `src/blogs/dto/update-blog.dto.ts`: `export class UpdateBlogDto extends PartialType(OmitType(CreateBlogDto, ['authorId'] as const)) {}` (from `@nestjs/mapped-types`).
- Delete the dead author lookup in blogs.service update.
- Rule: server-owned fields go LAST in spread/assign:
  - `UsersService.create`: `{ ...createUserDto, id: this.db.nextUserId(), role: DEFAULT_ROLE }`
  - `UsersService.update`: `Object.assign(user, updateUserDto, { id })`
  - `BlogsService.create`: `{ ...createBlogDto, id: this.db.nextBlogId(), author }`
  - `BlogsService.update`: `Object.assign(blog, updateBlogDto, { id, authorId: blog.authorId })` (keeps immutability for direct service calls)
- Embedded `author` copy in db.blogs stays (developer decision).

## 5. User DTOs
- `create-user.dto.ts`: `@IsString() @IsNotEmpty() name: string;` `@IsEmail() email: string;` — no `role` (so POST /users with role → 400).
- `update-user.dto.ts`: `PartialType(CreateUserDto)` + `@IsOptional() @IsIn(USER_ROLES) role?: UserRoleName;`

## Files per slice
- Slice 1: new `src/configure-app.ts`, `test/create-test-app.ts`, `src/common/actor-id.decorator.ts`; edit `src/main.ts`, both controllers (ParseIntPipe on :id, @ActorId on PATCH/DELETE), both user DTOs, both services (remove NaN guards; remove Invalid role check); update e2e bootstraps + affected specs.
- Slice 2: users.service.ts, blogs.service.ts (server fields last); service-guard unit tests; fix users.service.spec.ts cascade test.
- Slice 3: user-role.interface.ts, admin.role.ts (canCreateBlogFor); blogs.service.ts (create order; update assign); blogs.controller.ts (@ActorId on POST); update-blog.dto.ts (OmitType); tests + every POST /blogs in e2e sets user-id.
- Slice 4: users.service.ts UnauthorizedException → ForbiddenException (2 places) + assertions.
- Slices 5-8: tests only (new src/database/database.service.spec.ts; rest in existing spec files).

## Slice order
Spec order unchanged.

## Evolution triggers
- Real auth (JWT/session) → replace the internals of `ActorId()` with a guard that puts the user on the request; controllers/services unchanged.
- A third boundary concern → grow `src/common/`.
- A third "can actor X do Y to Z" rule, or rules beyond role+ownership → extract an `authorization/` service or Nest guard; role classes remain the policy source.
- Stale embedded author causes bugs / real persistence → store authorId only, resolve on read behind a repository.
- Services re-validating what DTOs cover → move the check to the DTO.
