# Interfaces

TypeScript types/interfaces are erased during compilation, so Nest can't reference them at runtime. This means an interface can describe the shape of a dependency, but it can't be used as a DI token by itself.

Since Nest resolves providers by runtime tokens, use a string or Symbol token when registering a provider for an interface:

``` typescript


export interface LoggerService {
  log(message: string): void;
}

export const LOGGER_SERVICE = Symbol('LOGGER_SERVICE');

@Injectable()
export class PinoLoggerService implements LoggerService {
  log(message: string) {
    // implementation details
  }
}

@Module({
  providers: [
    {
      provide: LOGGER_SERVICE,
      useClass: PinoLoggerService,
    },
  ],
})
export class AppModule {}

```

# Abstract
Abstract classes, unlike interfaces, exist at runtime. You can use an abstract class as both the TypeScript contract and the DI token:


``` typescript

export abstract class LoggerService {
  abstract log(message: string): void;
}

@Injectable()
export class PinoLoggerService implements LoggerService {
  log(message: string) {
    // implementation details
  }
}

@Module({
  providers: [
    {
      provide: LoggerService,
      useClass: PinoLoggerService,
    },
  ],
})
export class AppModule {}

```


### useClass
The useClass syntax allows you to dynamically determine a class that a token should resolve to. For example, suppose we have an abstract (or default) ConfigService class. Depending on the current environment, we want Nest to provide a different implementation of the configuration service. The following code implements such a strategy.

``` typescript 

const configServiceProvider = {
  provide: ConfigService,
  useClass:
    process.env.NODE_ENV === 'development'
      ? DevelopmentConfigService
      : ProductionConfigService,
};

@Module({
  providers: [configServiceProvider],
})
export class AppModule {}
```


### Factory providers


we can use this to give providers dynamically based on passed agruments. 

Example : 

need a little bit more context on how to use this. 


### Alias providers: useExisting

you can create custum providers with existing providers ( basically create an alias for the existing provider).

### export custom provider : 

we can export it using it token or full provider object. 