# TypeScript

## Why was it created?

It's basically a static type system on top of JavaScript.

It was created to prevent unexpected errors during runtime. When you compile TypeScript code, it generates JavaScript code and reports type-related and some value-related errors.

But TypeScript follows a "you know better than me" mindset, meaning even if there are errors, it will still generate the output JavaScript (unless you explicitly use `--noEmitOnError`).

## tsconfig

There are many options for compiling TS files to JS. We can define them in a `tsconfig.json` file or pass them as options when compiling using the `tsc` compiler.

- `--target`: tells what JavaScript version should be used for the output.
- `--noImplicitAny`: enables/disables implicit `any`.
- `--strictNullChecks`: enables/disables separate checks for `null` and `undefined`.

## Types in TypeScript

Primitive types:

- `string`
- `number`
- `boolean`

`number` contains both integer and floating-point values.

Other types: you can have arrays, user-defined types, and other things too.

### Array

```typescript
number[]
Array<number>
```

### Custom types

You can directly define the type of an object:

```typescript
let user: { name: string; id: number } = {
    name: "user id",
    id: 123
};
```

But it's not efficient to use `{ name: string; id: number }` each time you define a variable. Thus, we have `interface`.

### Interface

```typescript
interface User {
    name: string;
    id: number;
}

let user: User = {
    name: "user id",
    id: 123
};
```

Similar to an interface, we can use `type` to define the structure of an object.

```typescript
type User = {
    name: string;
    id: number;
};
```

## Decorators

It's similar to how we have decorators in Python. For a method decorator, TypeScript provides context about the function being decorated, which is of type `ClassMethodDecoratorContext`.

We can call the original method using `.call(this, ...args)`.

```typescript
function logged(originalMethod: any, context: ClassMethodDecoratorContext) {
    return function (this: any, ...args: any[]) {
        console.log("calling:", context.name);

        const result = originalMethod.call(this, ...args);

        console.log("execution completed for:", context.name);

        return result;
    };
}
```

## Module system

We cannot use a class or function from another module directly. We need to export it using the `export` keyword and then import it in the other module.

We can use a named export:

```typescript
export class UserService {}
```

And import it using:

```typescript
import { UserService } from "./user";
```

We can also use a default export:

```typescript
export default UserService;
```

And import it using:

```typescript
import UserService from "./user";
```

Classes and other concepts are mostly similar to other languages.
