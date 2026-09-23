# Testing in Nestjs


Note : Newly generated projects use Vitest by default. The testing APIs exposed by Nest do not depend on a specific runner, so the same patterns work with other tools as well.


## example 
``` typescript 
describe('CatsController', () => {
  let catsController: CatsController;
  let catsService: CatsService;

  beforeEach(() => {
    catsService = new CatsService();
    catsController = new CatsController(catsService);
  });

  describe('findAll', () => {
    it('should return an array of cats', async () => {
      const result = ['test'];

      vi.spyOn(catsService, 'findAll')
        .mockImplementation(() => result);

      expect(await catsController.findAll()).toBe(result);
    });
  });
});

```

here 

Describe -> is like TestClass in python

nested Describe -> it is present to group a function's testcases together 

it          -> Def test__ -> it's similar to test function in python. 

beforeEach   -> like setUp() in pytest


we also have 

afterEach()        -> tearDown()
beforeAll()       -> SetupClass
afterAll()       -> tearDownClass

vi.spyOn        -> Mock in python. 


above testcase in python will look something like : 


``` python
import unittest
from unittest.mock import patch

from cats.controller import CatsController
from cats.service import CatsService


class TestCatsController(unittest.TestCase):

    def setUp(self):
        self.cats_service = CatsService()
        self.cats_controller = CatsController(self.cats_service)

    def test__find_all__should_return_an_array_of_cats(self):
        result = ["test"]

        with patch.object(
            self.cats_service,
            "find_all",
            return_value=result
        ):
            self.assertIs(
                self.cats_controller.find_all(),
                result
            )

```



## factory boy equivalent in Nest

~~there is no exact equivalent of factory boy in Nestjs~~ *By default* but we can create factory function like 


``` typescript 
function createUser(overrides = {}) {
  return {
    id: Math.random(),
    name: 'John Doe',
    email: `user-${Math.random()}@example.com`,
    ...overrides,
  };
}

```
and then use them in the code.



but we can use *Fishery or Factory-js* or similar library, some depends on which ORM we are using. 

``` typescript
import { Factory } from 'fishery';
import { faker } from '@faker-js/faker';

export const userFactory = Factory.define<User>(({ sequence, onCreate }) => {
  onCreate((user) => dataSource.getRepository(User).save(user)); // persist on .create()

  return {
    id: sequence,
    email: faker.internet.email(),
    name: faker.person.fullName(),
    isAdmin: false,
  };
});

// In tests
const user = userFactory.build();                     // like factory_boy's .build()
const admin = await userFactory.create({ isAdmin: true }); // persisted
const users = userFactory.buildList(5);
```

## auto mocking 



NestJS does have a mocking mechanism, and .useMocker() is one of the built-in ways to provide mocks when creating a TestingModule.

This help a lot when we have a large test suite and we wanna avoid mocking same service again and again.

``` typescript

import { vi } from 'vitest';

describe('CatsController', () => {
  let controller: CatsController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [CatsController],
    })
      .useMocker((token) => {
        const results = ['test1', 'test2'];
        if (token === CatsService) {
          return { findAll: vi.fn().mockResolvedValue(results) };
        }
      })
      .compile();

    controller = moduleRef.get(CatsController);
  });
});


note : Keep your e2e test files inside the test directory. The testing files should have a .e2e-spec suffix.


```

## Scope provider importance in Testing

by default Nestjs create one instance of a serivce and shared it with all. 

so if you do 

```typescript
catService1 = TestModule.get(CatService)
catService2 = TestModule.get(CatService)
```
both catService1 and catService2 will get the same instance of the CatService. 


#### Transient : each time to request it will create new instance. 
#### Request    : for same request it will use same instance otherwise it will also create new instances. 

we can control this using *.resolve()*


### end to end testing 

we can use request from supertest to stimulate end to end testing 


``` typescript 

import request from 'supertest';
import { Test } from '@nestjs/testing';
import { CatsModule } from '../../src/cats/cats.module.js';
import { CatsService } from '../../src/cats/cats.service.js';
import { INestApplication } from '@nestjs/common';

describe('Cats', () => {
  let app: INestApplication;
  let catsService = { findAll: () => ['test'] };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CatsModule],
    })
      .overrideProvider(CatsService)
      .useValue(catsService)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  it(`/GET cats`, () => {
    return request(app.getHttpServer())
      .get('/cats')
      .expect(200)
      .expect({
        data: catsService.findAll(),
      });
  });

  afterAll(async () => {
    await app.close();
  });
});
```



## Commands : 

``` bash
npm test
npm test -- src/users/users.service.spec.ts
npm test -- src/blogs
npm test -- -t "should throw NotFoundException"

npm run test:e2e
npm run test:e2e -- test/blogs.e2e-spec.ts

```

##  dependency injection as a testability tool

The core idea is that a class that creates its own dependencies can't be tested in isolation, but a class that receives them can.

and Nestjs promote the second style by default


```

NOTE : One caveat to consider is that when your application is compiled using the compile() method, the HttpAdapterHost#httpAdapter will be undefined at that time. This is because there isn't an HTTP adapter or server created yet during this compilation phase. If your test requires the httpAdapter, you should use the createNestApplication() method to create the application instance, or refactor your project to avoid this dependency when initializing the dependencies graph.

## NOTES  : 

 isolated testing : where we manually instantiate the classes being tested