# NESTJS

NestJs is a Opinionated (Strict modular structure (Controllers, Services, Modules)) web framework build on the top of express ( not just this tho, we can use other node HTTP frameworks as well like fastify).

## Philosophy

Organize your application into modules, keep HTTP handling in *controllers*, put business logic in *providers/services*, and let *dependency injection* connect everything together.

```typescript
// NestJS forces structure:
src/
  users/
    users.controller.ts     (HTTP layer)
    users.service.ts        (business logic)
    users.module.ts         (DI configuration)

@Injectable()      // "This is a service"
@Controller()      // "This is a controller"
@Module()          // "This is a module"
```

### how nest is different from django ?

It strongly encourage dependency injection! 

Django doesn't have built-in DI—you either wire it manually, use a package like dependency-injector, or rely on singletons/globals

```typescript
# Django is loose:
myapp/
  views.py   (could be controllers OR business logic)
  models.py  (ORM, but logic can bleed here too)
  utils.py   (or services.py? up to you)
```


| Layer / Aspect   | Django         | NestJS             |
| ---------------- | -------------- | ------------------ |
| **HTTP**         | View / ViewSet | Controller         |
| **Business**     | Service*       | Provider / Service |
| **Data**         | Django ORM     | Repository / ORM   |
| **Wiring**       | Mostly manual  | DI Container       |
| **Organization** | Django App     | Module             |


### when to use NestJs instead of Django ?

well it's depend on alot of factors such as team expertise, nature of the task and the existing ecosystem fit. 

there is no definate answer but we can always decide based on the situation.

but in a high level view Nestjs have Built-in abstractions for validation, microservices, WebSockets, GraphQL, and OpenAPI/Swagger.

### Controllers, providers and modules

#### controllers

they are similar to classviews in django.

Controllers:

Define routes
Extract data from requests (params, body, headers)
Call services
Return responses

#### providers

similar to services and utils class in django 

Provider = a class marked with @Injectable() that can be injected into other classes. Services are providers, but so are other utilities (database connections, caches, etc.).

#### Modules

A module is a container that groups related things together and tells the framework how to wire them.

then you can export the module to use it at either root module ( like we add app in INSTALL_APP in django) or at some other modules. 

example : 

```typescript
// users.module.ts
import { Module } from '@nestjs/common';
import { UserController } from './users.controller';
import { UserService } from './users.service';
import { Database } from './database.service';

@Module({
  providers: [UserService, Database],      // Services available in this module
  controllers: [UserController],            // Controllers in this module
  exports: [UserService],                   // Services OTHER modules can use
})
export class UsersModule {}

root module : 

// app.module.ts (the root module)
import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { PostsModule } from './posts/posts.module';

@Module({
  imports: [UsersModule, PostsModule],  // Include other modules
})
export class AppModule {}
```

### Dependency Injection( DI )

what ? : Instead of a class creating its own dependencies, they're injected into it from the outside.

##### How does it handle DI ?

// This is what happens BEHIND THE SCENES (you don't write this)

```typescript
// 1. It sees Database is a provider
const database = new Database();
console.log('Connected to database');

// 2. It sees UserService needs Database
const userService = new UserService(database);  // Inject it!

// 3. It sees UserController needs UserService
const userController = new UserController(userService);  // Inject it!

// 4. Now everything is wired and ready to use
```

##### How NestJS Resolves Dependencies

```typescript
1. Constructor Parameter → @Param('id') id: string
                          constructor(private db: Database) { }

2. NestJS reads the type hint → Database

3. Looks in the Module → providers: [Database, UserService]

4. Checks if Database is already created (singleton) → Yes/No

5. If not, creates it → new Database()

6. Injects it → new UserService(database)
```

#### Why This Matters ?

##### Testing, DI make the mocking of dependencies easier.

###### Fragile Mocking

```python

# Python mocking (path-dependent, fragile)
from unittest.mock import patch

def test_user_service():
    with patch('myapp.users.services.Database.query') as mock:
        mock.return_value = {'id': 1}
        service = UserService()
        user = service.getUser('123')

# Problems:
# - If you move Database to another module, this test BREAKS
# - The path is a string—typos aren't caught until runtime
# - You're patching globally (affects other tests if not careful)
```

```typescript

// NestJS mocking (explicit, safe)
const module = await Test.createTestingModule({
  providers: [
    UserService,
    {
      provide: Database,
      useValue: mockDatabase,  // Pass the mock directly
    },
  ],
}).compile();

// Advantages:
// - No path strings to break
// - TypeScript checks the type at COMPILE TIME
// - Mock is scoped to this test, doesn't affect others
// - Refactoring tools can rename Database everywhere
```

###### Testing Real vs Mock is Hard

```python
# Python - you have to decide BEFORE creating the service
def test_with_mock():
    with patch('myapp.Database') as mock_db:
        service = UserService()
        # NOW it uses the mock

def test_with_real():
    # Oops, the patching from above might still be active
    service = UserService()
    # Does this use real or mock DB? Unclear!
```

```typescript
// NestJS - you CHOOSE what to inject
describe('UserService', () => {
  let service: UserService;

  it('with mock database', async () => {
    const mockDb = { query: jest.fn() };
    service = new UserService(mockDb);  // Obviously using mock
    // ...
  });

  it('with real database', async () => {
    const realDb = new Database();
    service = new UserService(realDb);  // Obviously using real
    // ...
  });
});

// Crystal clear what each test uses
```

##### Hidden Dependencies

to understand what a service will need you will have to check the code

##### Multiple Implementations

you want to support both PostgreSQL and MongoDB. you will have to update the userService to add that but with ID you can do that without changing the code.

##### Large Codebases Get Messy :

In a medium-to-large codebase, tracking dependencies gets hard

```python

# Where does this Database come from?
class UserService:
    def getUser(self):
        db = Database()  # Created here
        
class OrderService:
    def getOrder(self):
        db = Database()  # Created here too
        
class PaymentService:
    def processPayment(self):
        db = Database()  # And here
        
# Now the DB connection string changed. You have to search the entire codebase
# and update Database() in 10 different places. Nightmare.

```

```typescript

// With DI, it's centralized
@Module({
  providers: [
    {
      provide: Database,
      useValue: new Database(process.env.DB_CONNECTION_STRING),
    },
    UserService,
    OrderService,
    PaymentService,
  ],
})
export class AppModule {}

// Change DB config ONE place. All services get the update automatically.

```

##### Summary:


| Aspect                   | Without DI                      | With DI                         |
| ------------------------ | ------------------------------- | ------------------------------- |
| **See dependencies**     | Hidden in code                  | Explicit in constructor         |
| **Mock safely**          | Fragile string-based patching   | Pass objects directly           |
| **Swap implementations** | Hardcoded or messy conditionals | Change one place                |
| **Compiler help**        | None (Python)                   | TypeScript catches errors       |
| **Refactoring safety**   | Renaming breaks string paths    | Tools safely rename everywhere  |
| **Large codebases**      | Nightmare to track              | Clear and organized             |
| **Architecture**         | Easy to ignore SOLID            | Forced to follow best practices |


## Project

Nest aims to be a platform-agnostic framework. -> tries to be independent of framework and web server.

### controllers

*routeConflictPolicy* : show options manage router conflict ( off, warn, error) for duplicate and shadow ( user/:id , uses/me) paths.

use @HttpCode(status_code) to change default status code and for non-static status code use Response object

### Providers

property-based-injection : we can use this if the top class depends on more than one providers, then passing all of them using super() can become cumbersome. 

```text
Warning
If your class doesn't extend another class, it's generally better to use constructor-based injection. The constructor clearly specifies which dependencies are required, offering better visibility and making the code easier to understand compared to class properties annotated with @Inject.`

```

### Modules

For most applications, you'll likely have multiple modules, each encapsulating a closely related set of capabilities.

For most applications, you'll likely have multiple modules, each encapsulating a closely related set of capabilities.

Every module is automatically a shared module

use export to shared a module's provider with other modules. 

This is one of the key benefits of modularity and dependency injection in frameworks like NestJS—allowing services to be efficiently shared throughout the application.

When you want to provide a set of providers which should be available everywhere out-of-the-box (e.g., helpers, database connections, etc.), make the module global with the @Global() decorator.

```text
If we were to directly register the CatsService in every module that requires it, it would indeed work, but it would result in each module getting its *own separate instance* of the CatsService.

This can lead to increased memory usage since multiple instances of the same service are created, and it could also cause unexpected behavior, such as state inconsistency if the service maintains any internal state.
```

### Terminology

DTO : data transfer object : a class that defines the shape of the data moving into or out of the application. ( it seems like dataclass class in django)

Entity : like Django Models

### Commands

```bash
# to create project
nest new project-name 

# to create full CRUD endpionts
nest g resource [name]
# to create controller 
nest g controller [name]

# to create service 
nest g service [name]

# to create module
nest g module [name]

```



##### OTHER: 

``` bash
# 1. Remove the nested repo (this is what actually unblocks git add)
Remove-Item -Recurse -Force .\sample_project\.git
```