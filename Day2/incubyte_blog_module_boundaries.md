

# Module Boundaries

incubyte_blog/src/
  database/
    database.service.ts      # dummy in-memory “DB”
    database.module.ts       # exports Database so others can use it

  users/
    dto/create-user.dto.ts
    dto/update-user.dto.ts
    entities/user.entity.ts
    users.controller.ts
    users.service.ts
    users.module.ts          # exports UsersService and import DatabaseModule

  posts/
    dto/create-post.dto.ts
    dto/update-post.dto.ts
    entities/post.entity.ts
    posts.controller.ts
    posts.service.ts         # injects UsersService
    posts.module.ts          # imports UsersModule and DatabaseModule

  app.module.ts              # imports UsersModule, PostsModule


# Reason

# Reason

Keep related code in one module, and export only the piece other modules actually need.

Users keep their own CRUD. Blogs import `UsersModule` so they can use `UsersService` to require a real author (`authorId`). Database is exported so both modules share the same in-memory data, not two separate copies.


