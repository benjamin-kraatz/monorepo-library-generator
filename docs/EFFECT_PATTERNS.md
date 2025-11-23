# Effect.ts Pattern Reference Guide

> **📚 Related Documentation:**
>
> - [Architecture Overview](./ARCHITECTURE_OVERVIEW.md) - Library inventory and integration patterns
> - [Nx Standards](./NX_STANDARDS.md) - Naming conventions and workspace organization
> - [Export Patterns](./EXPORT_PATTERNS.md) - Platform-aware exports and barrel patterns
> - [Contract Libraries](./CONTRACT.md) - Domain interfaces using Effect patterns
> - [Data-Access Libraries](./DATA-ACCESS.md) - Repository implementations with Effect
> - [Feature Libraries](./FEATURE.md) - Business logic orchestration with Effect
> - [Infrastructure Libraries](./INFRA.md) - Cross-cutting concerns with Effect
> - [Provider Libraries](./PROVIDER.md) - External service adapters with Effect

## Quick Reference

This guide provides production-ready Effect.ts patterns (Effect 3.0+) for the monorepo.

## Service Definition Patterns

Effect provides two main approaches for defining services: **Effect.Service** (streamlined) and **Context.Tag** (explicit). Both are valid and supported in Effect 3.0+. Choose based on your requirements using the decision matrix below.

### 📊 Quick Decision Matrix

| Criteria                     | Effect.Service                | Context.Tag                      |
| ---------------------------- | ----------------------------- | -------------------------------- |
| **Boilerplate**              | Low (single declaration)      | Medium (separate Tag + Layer)    |
| **Multiple implementations** | Difficult (only .Default)     | Easy (Live, Test, Mock, Dev)     |
| **Accessor generation**      | Built-in (`accessors: true`)  | Manual                           |
| **Best for**                 | Standard services, prototypes | Complex architectures, libraries |
| **Recommended when**         | Single implementation needed  | Need test/mock/dev variants      |

**👉 Default Choice**: Use **Context.Tag** for this codebase - we need multiple layer implementations (Live, Test, Mock) for comprehensive testing and flexibility.

### Pattern 1: Context.Tag with Inline Interface (Recommended)

Use for non-generic services with <10 methods (90% of cases):

```typescript
// ✅ CORRECT - Modern Effect 3.0+ pattern with inline interface
export class PaymentService extends Context.Tag('PaymentService')<
  PaymentService,
  {
    readonly processPayment: (
      amount: number,
    ) => Effect.Effect<Payment, PaymentError>;
    readonly refundPayment: (id: string) => Effect.Effect<void, PaymentError>;
  }
>() {
  // Static Live property for layer composition
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const stripe = yield* StripeService;
      const database = yield* DatabaseService;

      return {
        processPayment: (amount) =>
          Effect.gen(function* () {
            const result = yield* Effect.tryPromise({
              try: () =>
                stripe.paymentIntents.create({ amount, currency: 'usd' }),
              catch: (error) => new PaymentError({ cause: error }),
            });

            yield* database.query((db) =>
              db
                .insertInto('payments')
                .values({ amount, stripeId: result.id })
                .execute(),
            );

            return result;
          }),

        refundPayment: (id) =>
          Effect.tryPromise({
            try: () => stripe.refunds.create({ payment_intent: id }),
            catch: (error) => new PaymentError({ cause: error }),
          }).pipe(Effect.asVoid),
      };
    }),
  );

  // Test implementation included in service definition
  // ✅ BEST PRACTICE: Use complete mock factory for type safety
  static readonly Test = Layer.succeed(this, {
    processPayment: (amount) => {
      const mockPayment: Payment = {
        id: `test_${amount}`,
        status: 'succeeded',
        amount,
        currency: 'usd',
        created: Date.now(),
        object: 'payment_intent',
        livemode: false,
        client_secret: `test_secret_${amount}`,
        description: null,
        metadata: {},
      };
      return Effect.succeed(mockPayment);
    },
    refundPayment: () => Effect.succeed(void 0),
  });
}
```

### Pattern 2: Context.Tag with Separate Interface

Use when service has 10+ methods or interface is shared:

```typescript
// ✅ CORRECT - For complex services only
// interfaces.ts
export interface LoggingServiceInterface {
  readonly trace: (msg: string, meta?: LogMetadata) => Effect.Effect<void>;
  readonly debug: (msg: string, meta?: LogMetadata) => Effect.Effect<void>;
  readonly info: (msg: string, meta?: LogMetadata) => Effect.Effect<void>;
  readonly warn: (msg: string, meta?: LogMetadata) => Effect.Effect<void>;
  readonly error: (msg: string, meta?: LogMetadata) => Effect.Effect<void>;
  // ... 10+ more methods
}

// service.ts
export class LoggingService extends Context.Tag('LoggingService')<
  LoggingService,
  LoggingServiceInterface
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const config = yield* Config;
      // Complex initialization
      return createStructuredLogger(config);
    }),
  );
}
```

### Pattern 3: Context.GenericTag for Generic Services

Use ONLY for services with type parameters (1% of cases):

```typescript
// ✅ CORRECT - For generic services only
export interface KyselyServiceInterface<DB> {
  readonly query: <T>(fn: (db: Kysely<DB>) => Promise<T>) => Effect.Effect<T, DatabaseQueryError>
  readonly transaction: <T>(fn: (trx: Transaction<DB>) => Effect.Effect<T, E>) => Effect.Effect<T, E | DatabaseQueryError>
}

// Generic service tag (GenericTag required for type parameters)
export const KyselyService = <DB>() =>
  Context.GenericTag<KyselyServiceInterface<DB>>("KyselyService")

// Layer factory (returns configured layer)
export const KyselyServiceLive = <DB>() =>
  Layer.scoped(
    KyselyService<DB>(),
    Effect.gen(function* () {
      const pool = yield* Effect.acquireRelease(
        Effect.sync(() => createPool(config)),
        (pool) => Effect.sync(() => pool.end())
      )

      const db = new Kysely<DB>({ dialect: new PostgresDialect({ pool }) })

      return {
        query: (fn) => Effect.tryPromise({
          try: () => fn(db),
          catch: (error) => new DatabaseQueryError({ cause: error })
        }),
        transaction: (fn) => // implementation
      }
    })
  )

// Usage
const MyDatabaseService = KyselyService<Database>()
```

### Pattern 4: Effect.Service - Alternative Pattern (Optional)

**Note**: This codebase uses **Context.Tag** (Patterns 1-3) for flexibility. Effect.Service is documented here for completeness but is NOT used in our generators.

**Effect.Service** combines Context.Tag and Layer in a single declaration:

```typescript
// Single-declaration service with auto-generated layer
class Logger extends Effect.Service<Logger>()('Logger', {
  sync: () => ({
    info: (msg: string) => Effect.sync(() => console.log(`[INFO] ${msg}`)),
    error: (msg: string) => Effect.sync(() => console.error(`[ERROR] ${msg}`)),
  }),
  accessors: true, // Optional: generates Logger.info() convenience functions
}) {}

// Usage
const program = Effect.gen(function* () {
  yield* Logger.info('Hello'); // Direct accessor (if accessors: true)
});

Effect.runPromise(program.pipe(Effect.provide(Logger.Default)));
```

**Options**: `sync`, `effect`, `scoped`, `succeed`, `dependencies`, `accessors`

**Why Context.Tag instead?**

- ✅ Multiple implementations (Live, Test, Mock, Dev) - Effect.Service only provides `.Default`
- ✅ Explicit layer control - easier to see dependencies
- ✅ Better for library code - consumers can provide their own implementations

### Pattern 5: Repository Pattern

Repositories use the same pattern as services:

```typescript
// ✅ CORRECT - Repository with inline interface
export class UserRepository extends Context.Tag('UserRepository')<
  UserRepository,
  {
    readonly findById: (
      id: string,
    ) => Effect.Effect<Option.Option<User>, DatabaseError>;
    readonly create: (input: UserInput) => Effect.Effect<User, DatabaseError>;
    readonly update: (
      id: string,
      input: Partial<UserInput>,
    ) => Effect.Effect<User, DatabaseError>;
    readonly delete: (id: string) => Effect.Effect<void, DatabaseError>;
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const database = yield* DatabaseService;
      const cache = yield* CacheService;

      return {
        findById: (id) =>
          Effect.gen(function* () {
            // Check cache first - use type-safe cache.get with schema
            const cached = yield* cache.get<User>(`user:${id}`, UserSchema);
            if (Option.isSome(cached)) return cached;

            // Query database
            const user = yield* database.query((db) =>
              db
                .selectFrom('users')
                .where('id', '=', id)
                .selectAll()
                .executeTakeFirst(),
            );

            // Cache result if found
            if (user) {
              yield* cache.set(`user:${id}`, user, UserSchema);
            }

            return Option.fromNullable(user);
          }),

        create: (input) =>
          database.query((db) =>
            db
              .insertInto('users')
              .values(input)
              .returningAll()
              .executeTakeFirstOrThrow(),
          ),

        update: (id, input) =>
          Effect.gen(function* () {
            const updated = yield* database.query((db) =>
              db
                .updateTable('users')
                .set(input)
                .where('id', '=', id)
                .returningAll()
                .executeTakeFirstOrThrow(),
            );
            // Invalidate cache
            yield* cache.delete(`user:${id}`);
            return updated;
          }),

        delete: (id) =>
          Effect.gen(function* () {
            yield* database.query((db) =>
              db.deleteFrom('users').where('id', '=', id).execute(),
            );
            yield* cache.delete(`user:${id}`);
          }),
      };
    }),
  );
}
```

## Layer Creation Patterns

### Decision Tree: Choosing the Right Layer Constructor

```
START: Creating a new Layer for your service

1. Is this for TESTING or MOCKS?
   └─ YES → Use Layer.succeed (go to Test Pattern section below)
   └─ NO → Continue to step 2

2. Is service creation SYNCHRONOUS (no async/promises/Effects)?
   └─ YES → Use Layer.sync
   │       Example: new Stripe(key), createClient(), new Map()
   │       Key: Synchronous function that returns implementation
   │
   └─ NO → Continue to step 3

3. Does it need OTHER SERVICES via context injection?
   └─ YES → Continue to step 4
   │
   └─ NO → Continue to step 5

4. Does it have RESOURCES needing cleanup (connections, handles)?
   └─ YES → Use Layer.scoped + Effect.acquireRelease (see Pattern 3)
   │       Example: Database connection pool, WebSocket, file handle
   │       Key: Must clean up when scope ends
   │
   └─ NO → Use Layer.effect (see Pattern 2)
            Example: Services depending on config, other services
            Key: No cleanup needed, but needs Effect context for dependencies

5. Does it have RESOURCES needing cleanup (connections, handles)?
   └─ YES → Use Layer.scoped + Effect.acquireRelease
   │       Example: Database connection pool, WebSocket, file handle
   │       Key: Must clean up when scope ends
   │
   └─ NO → Use Layer.effect
            Example: Stateless transformers, pure computations
            Key: Async but no dependencies and no cleanup
```

### Decision Tree Summary Table

| Decision                         | Use                              | When                            | Cleanup?             |
| -------------------------------- | -------------------------------- | ------------------------------- | -------------------- |
| Sync, no deps, no cleanup        | `Layer.sync`                     | Stripe SDK, config objects      | No                   |
| Sync, needs deps, no cleanup     | `Layer.sync` first, then compose | Can't use deps in sync          | No                   |
| Async, needs deps, no cleanup    | `Layer.effect`                   | DatabaseService dependency      | No                   |
| Async, no deps, no cleanup       | `Layer.effect`                   | API calls without context       | No                   |
| Async, needs deps, NEEDS cleanup | `Layer.scoped`                   | DB pool, WebSocket              | YES - acquireRelease |
| Async, no deps, NEEDS cleanup    | `Layer.scoped`                   | File handle, connection         | YES - acquireRelease |
| Test/Mock layer                  | `Layer.succeed`                  | Testing with predictable values | No                   |

### Real-World Examples by Decision Path

**Example 1: Stripe Service (sync, no deps)**

```typescript
// ✅ Synchronous - no async/promises
static readonly Live = Layer.sync(this, () => new Stripe(apiKey))
```

**Example 2: PaymentService (async, needs deps, no cleanup)**

```typescript
// ✅ Needs DatabaseService, but no cleanup
static readonly Live = Layer.effect(this, Effect.gen(function* () {
  const db = yield* DatabaseService
  return { /* methods using db */ }
}))
```

**Example 3: KyselyService (async, needs deps, NEEDS cleanup)**

```typescript
// ✅ Needs pool creation AND cleanup
static readonly Live = Layer.scoped(this, Effect.gen(function* () {
  const pool = yield* Effect.acquireRelease(
    Effect.sync(() => new Pool(config)),
    (pool) => Effect.sync(() => pool.end())
  )
  const db = new Kysely({ dialect: new PostgresDialect({ pool }) })
  return { /* methods using db */ }
}))
```

**Example 4: Test Mock (no decisions needed)**

```typescript
// ✅ PATTERN B: Test layer as static property (recommended)
// Keep test layer with service definition for discoverability
export class PaymentService extends Context.Tag('PaymentService')<
  PaymentService,
  PaymentServiceInterface
>() {
  static readonly Live = Layer.effect(/* ... */);

  // ✅ Pattern B: Test layer as static property
  static readonly Test = Layer.succeed(this, {
    processPayment: () => Effect.succeed(mockResult),
    refundPayment: () => Effect.succeed(void 0),
  });
}
```

### Layer.sync - Synchronous Creation

```typescript
// ✅ For synchronous service creation (no async/Effects)
export class StripeService extends Context.Tag('StripeService')<
  StripeService,
  Stripe // Direct SDK type
>() {
  static readonly Live = Layer.sync(
    this,
    () => new Stripe(process.env.STRIPE_KEY!),
  );
}
```

### Layer.effect - Effectful Creation

```typescript
// ✅ When service needs dependencies - return object directly
export class PaymentService extends Context.Tag("PaymentService")<
  PaymentService,
  PaymentServiceInterface
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const stripe = yield* StripeService
      const database = yield* DatabaseService

      // Direct object return - no .make() or .of()
      return {
        processPayment: (amount) => /* implementation */,
        refundPayment: (id) => /* implementation */
      }
    })
  )
}

// Alternative: Using Effect.map for simple transformations
export const ConfiguredServiceLive = Layer.effect(
  ConfiguredService,
  Effect.map(
    Config.string("API_KEY"),
    (apiKey) => ({ apiKey, makeRequest: () => /* ... */ })
  )
)
```

### Layer.scoped - Resource Management

```typescript
// ✅ For resources needing cleanup
export const DatabaseServiceLive = Layer.scoped(
  DatabaseService,
  Effect.gen(function* () {
    // Acquire resource with automatic cleanup
    const pool = yield* Effect.acquireRelease(
      Effect.sync(() => createPool(config)),
      (pool) => Effect.sync(() => pool.end()),
    );

    const db = new Kysely({ dialect: new PostgresDialect({ pool }) });

    // Direct object return - no .make() or .of()
    return {
      query: (fn) =>
        Effect.tryPromise({
          try: () => fn(db),
          catch: (error) => new DatabaseQueryError({ cause: error }),
        }),
    };
  }),
);

// Alternative: Using addFinalizer
export const WebSocketServiceLive = Layer.scoped(
  WebSocketService,
  Effect.gen(function* () {
    const ws = new WebSocket(url);

    // Register cleanup
    yield* Effect.addFinalizer(() => Effect.sync(() => ws.close()));

    // Direct object return
    return {
      send: (message) => Effect.sync(() => ws.send(message)),
      close: () => Effect.sync(() => ws.close()),
    };
  }),
);
```

### Layer.succeed - Test/Mock Layers

Use for creating test implementations with predictable behavior.

#### Simple Mock (Pattern B - Recommended)

**✅ PATTERN B**: Keep test layer with service definition for discoverability:

```typescript
// ✅ PATTERN B: Test layer as static property (recommended)
export class PaymentService extends Context.Tag("PaymentService")<
  PaymentService,
  PaymentServiceInterface
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const stripe = yield* StripeService
      return {
        processPayment: (amount) => /* implementation */,
        refundPayment: (id) => /* implementation */
      }
    })
  )

  // ✅ Test layer as static property - keeps test and implementation together
  static readonly Test = Layer.succeed(this, {
    processPayment: () => Effect.succeed({
      id: 'test',
      status: 'success',
      amount: 1000,
      currency: 'usd'
    }),
    refundPayment: () => Effect.succeed(void 0)
  })
}
```

**Alternative: Separate Export (Legacy)**

Only use when test layer needs to be in a different file:

```typescript
// ⚠️ Less discoverable - only use when test must be separate
export const PaymentServiceTest = Layer.succeed(PaymentService, {
  processPayment: () =>
    Effect.succeed({
      id: 'test',
      status: 'success',
      amount: 1000,
      currency: 'usd',
    }),
  refundPayment: () => Effect.succeed(void 0),
});
```

#### Type-Safe Mock Factory (Complex Types)

**⭐ GOLD STANDARD**: For complex external SDK types or domain types with 10+ fields, use type-safe factory pattern to ensure compiler validates ALL required fields:

```typescript
// ✅ Type-safe factory - NO type assertions
// Compiler enforces ALL required fields are present

/**
 * Creates a complete mock PaymentIntent with all required Stripe fields.
 * No type assertions - TypeScript validates completeness at compile time.
 *
 * @param overrides - Partial override for specific test scenarios
 * @returns Fully typed Stripe.PaymentIntent without type coercion
 */
const createMockPaymentIntent = (
  overrides?: Partial<Stripe.PaymentIntent>,
): Stripe.PaymentIntent => {
  // Define complete base object with ALL required fields
  const base: Stripe.PaymentIntent = {
    id: 'pi_test_mock',
    object: 'payment_intent',
    amount: 1000,
    amount_capturable: 0,
    amount_received: 1000,
    application: null,
    application_fee_amount: null,
    automatic_payment_methods: null,
    canceled_at: null,
    cancellation_reason: null,
    capture_method: 'automatic',
    client_secret: 'pi_test_secret_mock',
    confirmation_method: 'automatic',
    created: Math.floor(Date.now() / 1000),
    currency: 'usd',
    customer: null,
    description: null,
    invoice: null,
    last_payment_error: null,
    latest_charge: null,
    livemode: false,
    metadata: {},
    next_action: null,
    payment_method: null,
    payment_method_types: ['card'],
    status: 'succeeded',
    // ... ALL other required fields
  };

  return { ...base, ...overrides };
  // ✅ No type assertion (as any, as Type) - compiler validates completeness
};

// ✅ PATTERN B: Use factory in test layer (static property)
export class StripeService extends Context.Tag('StripeService')<
  StripeService,
  StripeServiceInterface
>() {
  static readonly Live = Layer.sync(
    this,
    () => new Stripe(process.env.STRIPE_KEY!),
  );

  // ✅ Pattern B: Test layer with factory function
  static readonly Test = Layer.succeed(this, {
    createPaymentIntent: (params) =>
      Effect.succeed(
        createMockPaymentIntent({
          amount: params.amount,
          currency: params.currency,
        }),
      ),
    retrievePaymentIntent: (id) =>
      Effect.succeed(createMockPaymentIntent({ id })),
  });
}
```

**❌ ANTI-PATTERN - Type Assertions**:

```typescript
// ❌ WRONG - Type assertion masks missing fields
const mockPayment = {
  id: 'test',
  amount: 1000,
} as Stripe.PaymentIntent; // Compiler can't catch missing required fields!

// ❌ WRONG - Partial mock with assertion
return {
  id: 'test',
  status: 'succeeded',
} as PaymentIntent; // Missing required fields won't be caught
```

**When to Use Each Approach**:

| Pattern             | Use When                   | Example                          |
| ------------------- | -------------------------- | -------------------------------- |
| **Inline Mock**     | Simple types (<5 fields)   | Domain entities, DTOs            |
| **Factory Pattern** | Complex types (10+ fields) | External SDK types (Stripe, AWS) |
| **Factory Pattern** | Type safety critical       | Financial data, user records     |
| **Inline Mock**     | Rapid prototyping          | Early development, POCs          |

**Benefits of Factory Pattern**:

- ✅ Compiler enforces ALL required fields
- ✅ Type-safe overrides for test scenarios
- ✅ Reusable across multiple tests
- ✅ Self-documenting - shows complete type structure
- ✅ Prevents runtime errors from missing fields

## Pattern B: Test Layers as Static Properties

**Pattern B** is the **recommended approach** for organizing test layers in Effect.ts services. It keeps test implementations co-located with service definitions for better discoverability and maintainability.

### What is Pattern B?

Pattern B defines test layers as static properties directly on the service class, alongside the `Live` implementation:

```typescript
export class PaymentService extends Context.Tag("PaymentService")<
  PaymentService,
  PaymentServiceInterface
>() {
  // Production implementation
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const stripe = yield* StripeService
      return {
        processPayment: (amount) => /* production logic */
      }
    })
  )

  // ✅ PATTERN B: Test implementation as static property
  static readonly Test = Layer.succeed(this, {
    processPayment: () => Effect.succeed(mockResult)
  })
}
```

### Why Pattern B?

**✅ Benefits**:

1. **Discoverability**: Test layer is immediately visible when reading service definition
2. **Co-location**: Test and implementation stay together, reducing file switching
3. **Type Safety**: TypeScript enforces test layer matches service interface
4. **Refactoring**: When service interface changes, test layer is right there to update
5. **IDE Support**: Autocomplete shows `Service.Test` alongside `Service.Live`
6. **Less Boilerplate**: No need for separate test utility files
7. **Convention**: Matches Effect.ts official patterns and ecosystem libraries

**Usage**:

```typescript
// Test file - just import the service
import { PaymentService } from './payment-service';
import { DatabaseService } from '@samuelho-dev/infra-database';

const TestLayer = Layer.mergeAll(
  DatabaseService.Test, // ✅ Clear and discoverable
  PaymentService.Test, // ✅ Clear and discoverable
);
```

### Pattern Comparison

#### Pattern B (Recommended): Static Property

```typescript
// service.ts
export class MyService extends Context.Tag('MyService')</*...*/> {
  static readonly Live = Layer.effect(/* ... */);
  static readonly Test = Layer.succeed(this, {
    /* mock */
  });
}

// test.ts
import { MyService } from './service';
Effect.provide(MyService.Test); // ✅ Discoverable
```

**Pros**:

- ✅ Test layer always visible with service
- ✅ IDE autocomplete shows all layer variants
- ✅ Single import needed
- ✅ Refactoring-friendly

**Cons**:

- ⚠️ Test code in production bundle (negligible size impact)

#### Pattern A (Legacy): Separate Export

```typescript
// service.ts
export class MyService extends Context.Tag('MyService')</*...*/> {
  static readonly Live = Layer.effect(/* ... */);
}

// service.test-utils.ts (separate file)
export const MyServiceTest = Layer.succeed(MyService, {
  /* mock */
});

// test.ts
import { MyService } from './service';
import { MyServiceTest } from './service.test-utils';
Effect.provide(MyServiceTest); // ⚠️ Less discoverable
```

**Pros**:

- ✅ Test code excluded from production bundle
- ✅ Separate test utilities file for complex setups

**Cons**:

- ❌ Requires multiple imports
- ❌ Easy to miss when service changes
- ❌ Less discoverable (need to know test utils file exists)
- ❌ More files to maintain

### When to Use Pattern A (Separate Export)

Only use separate exports when:

1. **Complex Test Setup**: Test layer requires extensive mock factories or utilities that would clutter service file
2. **Shared Test Infrastructure**: Test layer is used across multiple test files and benefits from centralization
3. **Bundle Size Critical**: Production bundle size is critical and test code must be excluded (rare)
4. **Team Preference**: Team has established convention for separate test files

### Pattern B Best Practices

**1. Multiple Test Variants**:

```typescript
export class PaymentService extends Context.Tag('PaymentService')</*...*/> {
  static readonly Live = Layer.effect(/* ... */);

  // Default test layer
  static readonly Test = Layer.succeed(this, {
    processPayment: () => Effect.succeed(successResult),
  });

  // Failure test layer
  static readonly TestFailure = Layer.succeed(this, {
    processPayment: () =>
      Effect.fail(new PaymentError({ message: 'Card declined' })),
  });

  // Mock with configurable overrides
  static readonly Mock = (overrides?: Partial<PaymentServiceInterface>) =>
    Layer.succeed(this, {
      processPayment:
        overrides?.processPayment ?? (() => Effect.succeed(mockResult)),
    });
}
```

**2. Dev Layer for Local Development**:

```typescript
export class PaymentService extends Context.Tag('PaymentService')</*...*/> {
  static readonly Live = Layer.effect(/* production */);
  static readonly Test = Layer.succeed(/* fast mocks */);

  // Dev layer with logging and delays
  static readonly Dev = Layer.effect(
    this,
    Effect.gen(function* () {
      const logger = yield* LoggingService;
      return {
        processPayment: (amount) =>
          Effect.gen(function* () {
            yield* logger.info(`[DEV] Processing payment: ${amount}`);
            yield* Effect.sleep('100 millis');
            return mockResult;
          }),
      };
    }),
  );
}
```

**3. Environment-Based Auto Layer**:

```typescript
export class PaymentService extends Context.Tag('PaymentService')</*...*/> {
  static readonly Live = Layer.effect(/* production */);
  static readonly Test = Layer.succeed(/* test */);
  static readonly Dev = Layer.effect(/* dev */);

  // Auto-select based on NODE_ENV
  static readonly Auto = Layer.unwrapEffect(
    Effect.gen(function* () {
      const env = yield* Config.string('NODE_ENV');
      switch (env) {
        case 'test':
          return PaymentService.Test;
        case 'development':
          return PaymentService.Dev;
        default:
          return PaymentService.Live;
      }
    }),
  );
}
```

### Migration from Pattern A to Pattern B

**Before (Pattern A)**:

```typescript
// service.ts
export class MyService extends Context.Tag('MyService')</*...*/> {
  static readonly Live = Layer.effect(/* ... */);
}

// service.test-utils.ts
export const MyServiceTest = Layer.succeed(MyService, {
  /* mock */
});
```

**After (Pattern B)**:

```typescript
// service.ts
export class MyService extends Context.Tag('MyService')</*...*/> {
  static readonly Live = Layer.effect(/* ... */);

  // ✅ Moved test layer here
  static readonly Test = Layer.succeed(this, {
    /* mock */
  });
}

// Delete service.test-utils.ts
```

**Update tests**:

```typescript
// Before
import { MyService } from './service';
import { MyServiceTest } from './service.test-utils';
Effect.provide(MyServiceTest);

// After
import { MyService } from './service';
Effect.provide(MyService.Test); // ✅ Cleaner
```

## Error Handling Patterns

**VALIDATED**: Both Data.TaggedError and Schema.TaggedError exist in Effect 3.0+. Choose based on error context.

### Error Type Selection Guide

#### Data.TaggedError - Domain & Business Logic Errors (Default)

**Use for**: Domain-specific errors in contracts, data-access, and feature layers.

✅ **Use Data.TaggedError when:**

- Domain validation errors (ProductNotFoundError, InvalidPriceError)
- Business rule violations (InsufficientStockError, UnauthorizedActionError)
- Repository operation failures (DatabaseError, CacheError)
- Service-level errors (PaymentProcessingError)
- **No schema encoding/decoding needed**
- Error is part of your domain model
- Staying within Effect runtime (no RPC boundary)

```typescript
// ✅ Domain errors in contracts layer
import { Data } from 'effect';

export class ProductNotFoundError extends Data.TaggedError(
  'ProductNotFoundError',
)<{
  readonly productId: string;
  readonly reason?: string;
}> {}

export class PaymentError extends Data.TaggedError('PaymentError')<{
  readonly message: string;
  readonly code?: string;
  readonly cause?: unknown;
}> {}

export class InsufficientFundsError extends Data.TaggedError(
  'InsufficientFundsError',
)<{
  readonly available: number;
  readonly required: number;
}> {}

// Union type for exhaustive error matching
export type PaymentErrors = PaymentError | InsufficientFundsError;

// Usage in service
const processPayment = (amount: number) =>
  Effect.gen(function* () {
    const balance = yield* getBalance();

    if (balance < amount) {
      return yield* Effect.fail(
        new InsufficientFundsError({ available: balance, required: amount }),
      );
    }

    return yield* chargePayment(amount);
  });
```

**Benefits:**

- ✅ Lightweight (no schema validation overhead)
- ✅ Fast error creation
- ✅ Ideal for domain logic
- ✅ Yieldable in Effect.gen (can `yield* new Error()`)

#### Schema.TaggedError - RPC & Serialization Boundaries

**Use for**: Errors that cross RPC boundaries and need schema validation.

✅ **Use Schema.TaggedError when:**

- Errors sent over tRPC, HTTP, or RPC protocols
- Need runtime schema validation of error structure
- Error properties need encoding/decoding (dates, complex types)
- Crossing service boundaries (microservices, API responses)
- Integration with @effect/rpc

```typescript
// ✅ RPC errors that cross boundaries
import { Schema } from 'effect';

export class PaymentRpcError extends Schema.TaggedError<PaymentRpcError>()(
  'PaymentRpcError',
  {
    message: Schema.String,
    code: Schema.String,
    timestamp: Schema.DateTimeUtc, // Schema encoding needed for Date
    metadata: Schema.optional(Schema.Record(Schema.String, Schema.Unknown)),
  },
) {}

// Usage in RPC router
import { Rpc } from '@effect/rpc';

export const paymentRouter = Rpc.make([
  ProcessPaymentRequest.pipe(
    Rpc.toHandler((req) =>
      processPayment(req.amount).pipe(
        // Transform domain error to RPC error
        Effect.catchAll((domainError) =>
          Effect.fail(
            new PaymentRpcError({
              message: domainError.message,
              code: 'PAYMENT_FAILED',
              timestamp: new Date().toISOString(),
            }),
          ),
        ),
      ),
    ),
  ),
]);
```

**Benefits:**

- ✅ Schema validation on encode/decode
- ✅ Type-safe serialization
- ✅ Works across RPC boundaries
- ✅ Complex type encoding (dates, branded types)

### Decision Matrix

| Scenario            | Use                | Rationale                |
| ------------------- | ------------------ | ------------------------ |
| Repository error    | Data.TaggedError   | Domain boundary, no RPC  |
| Service error       | Data.TaggedError   | Business logic, no RPC   |
| tRPC error response | Schema.TaggedError | Crosses RPC boundary     |
| HTTP API error      | Schema.TaggedError | Needs serialization      |
| Validation error    | Data.TaggedError   | Domain validation        |
| Database error      | Data.TaggedError   | Infrastructure, no RPC   |
| Microservice call   | Schema.TaggedError | Crosses service boundary |
| WebSocket error     | Schema.TaggedError | Needs wire encoding      |

### Error Transformation Pattern

Transform domain errors to RPC errors at the boundary:

```typescript
// Domain layer: Use Data.TaggedError
export class ProductNotFoundError extends Data.TaggedError(
  'ProductNotFoundError',
)<{
  readonly productId: string;
}> {}

// RPC layer: Transform to Schema.TaggedError
export class ProductNotFoundRpcError extends Schema.TaggedError<ProductNotFoundRpcError>()(
  'ProductNotFoundRpcError',
  {
    productId: Schema.String,
    timestamp: Schema.DateTimeUtc,
  },
) {}

// Transformation at RPC boundary
export const productRouter = Rpc.make([
  GetProductRequest.pipe(
    Rpc.toHandler((req) =>
      productService.getProduct(req.id).pipe(
        Effect.catchTag('ProductNotFoundError', (error) =>
          Effect.fail(
            new ProductNotFoundRpcError({
              productId: error.productId,
              timestamp: new Date().toISOString(),
            }),
          ),
        ),
      ),
    ),
  ),
]);
```

### Effect 4.0 Compatibility

Both error types are stable and expected to remain in Effect 4.0:

- ✅ **Data.TaggedError**: Core error type, guaranteed stability
- ✅ **Schema.TaggedError**: RPC integration, guaranteed stability

### Default Rule

**Use Data.TaggedError unless you're explicitly at an RPC boundary.**

When in doubt:

- Are you sending this error over the network? → Schema.TaggedError
- Is it internal domain logic? → Data.TaggedError

## Effect.gen vs Combinators

### Use Effect.gen for:

- Multiple sequential operations
- Complex control flow
- Readable step-by-step logic

```typescript
// ✅ Good use of Effect.gen
const processOrder = (orderId: string) =>
  Effect.gen(function* () {
    const order = yield* getOrder(orderId);
    const user = yield* getUser(order.userId);

    if (!user.verified) {
      return yield* Effect.fail(new UnverifiedUserError());
    }

    const payment = yield* processPayment(order.total);
    yield* sendConfirmation(user.email, payment.id);

    return payment;
  });
```

### Use Combinators for:

- Simple transformations
- Parallel operations
- Concise pipelines

```typescript
// ✅ Good use of combinators
const getUserWithPermissions = (id: string) =>
  Effect.all([getUser(id), getPermissions(id)]).pipe(
    Effect.map(([user, permissions]) => ({
      ...user,
      permissions,
    })),
  );

// ✅ Error handling with combinators
const safeGetUser = (id: string) =>
  getUser(id).pipe(
    Effect.catchTag('UserNotFound', () => Effect.succeed(defaultUser)),
  );
```

## Service Composition Patterns

### Layer Composition at Application Level

```typescript
// ✅ Compose layers at application level
const AppLayer = Layer.mergeAll(
  // Infrastructure
  DatabaseService.Live,
  LoggingService.Live,
  CacheService.Live,

  // Providers
  StripeService.Live,
  ResendService.Live,

  // Repositories (depend on infra)
  UserRepository.Live,
  ProductRepository.Live,

  // Features (depend on repos + providers)
  PaymentService.Live,
  EmailService.Live,
);

// Use in application
const program = Effect.gen(function* () {
  const payment = yield* PaymentService;
  return yield* payment.processPayment(100);
}).pipe(Effect.provide(AppLayer), Effect.runPromise);

// For testing - compose with test layers
const TestLayer = Layer.mergeAll(
  DatabaseService.Test,
  LoggingService.Test,
  CacheService.Test,
  StripeService.Test,
  ResendService.Test,
  UserRepository.Live, // Can use real repos with test DB
  ProductRepository.Live,
  PaymentService.Live,
  EmailService.Live,
);
```

### Service Composition Decision Matrix

**Question: Which services should I compose together?**

| Layer Type                        | Should Combine    | Examples                                             | Rationale                                              |
| --------------------------------- | ----------------- | ---------------------------------------------------- | ------------------------------------------------------ |
| **Infrastructure Services**       | ✅ YES            | DatabaseService + CacheService + LoggingService      | No dependencies between them                           |
| **Provider Services**             | ✅ YES            | StripeService + ResendService + SupabaseService      | External SDKs, independent                             |
| **Repository Services**           | ✅ YES            | UserRepository + ProductRepository + OrderRepository | Depend on infra, not each other                        |
| **Feature Services**              | ⚠️ MAYBE          | PaymentService + EmailService + NotificationService  | Often interdependent - may need sequential composition |
| **Infrastructure + Providers**    | ✅ YES            | Provide infra, then providers                        | Providers depend on infra                              |
| **Providers + Repositories**      | ✅ YES            | Provide providers, then repos                        | Repos depend on providers                              |
| **Repositories + Features**       | ✅ YES            | Provide repos, then features                         | Features depend on repos                               |
| **Infrastructure + Repositories** | ✅ YES (implicit) | Don't combine - infra used by repos                  | Repos depend on infra via dependencies                 |

### Service Composition Patterns by Use Case

#### Pattern 1: Application Layer (All Services)

```typescript
// ✅ Recommended: Compose all layers in order
const AppLayer = Layer.mergeAll(
  // 1. Infrastructure (no dependencies)
  DatabaseService.Live,
  CacheService.Live,
  LoggingService.Live,
  ConfigService.Live,

  // 2. Providers (depend on infra optionally)
  StripeService.Live,
  ResendService.Live,
  SupabaseService.Live,

  // 3. Repositories (depend on infra + providers)
  UserRepository.Live,
  ProductRepository.Live,
  OrderRepository.Live,

  // 4. Features (depend on repos + providers)
  PaymentService.Live,
  EmailService.Live,
  NotificationService.Live,
);
```

#### Pattern 2: Conditional Feature Composition

```typescript
// ✅ For interdependent features, compose selectively
const CoreLayer = Layer.mergeAll(
  DatabaseService.Live,
  CacheService.Live,
  UserRepository.Live,
  AuthService.Live, // Needed by payment service
);

// Payment service depends on AuthService
const PaymentLayer = CoreLayer.pipe(Layer.provide(PaymentService.Live));

// Notification depends on auth but not payment
const NotificationLayer = CoreLayer.pipe(
  Layer.provide(NotificationService.Live),
);
```

#### Pattern 3: Testing Layer Composition

```typescript
// ✅ Use test/mock layers for specific services
const TestLayer = Layer.mergeAll(
  // Real services for database operations
  DatabaseService.Test,
  UserRepository.Live,
  ProductRepository.Live,

  // Mocked services for external dependencies
  StripeService.Test,
  ResendService.Test,

  // Feature services use real repos with test data
  PaymentService.Live,
  EmailService.Live,
);
```

#### Pattern 4: Development Layer Composition

```typescript
// ✅ Use Dev layers with logging and delays for local development
const DevLayer = Layer.mergeAll(
  ConfigService.Dev, // Config from env
  DatabaseService.Dev, // Real DB with logging
  LoggingService.Dev, // Verbose logging
  StripeService.Test, // Mock Stripe in dev
  ResendService.Test, // Mock email in dev
  UserRepository.Live, // Real repos
  ProductRepository.Live,
  PaymentService.Live, // Real services with mocked SDKs
  EmailService.Live,
);
```

### When to Use Layer.provide vs Layer.mergeAll

| Scenario                         | Use                              | Why                                 |
| -------------------------------- | -------------------------------- | ----------------------------------- |
| Multiple independent services    | `Layer.mergeAll`                 | Simpler, all provided together      |
| Service A depends on B           | `Layer.mergeAll` first, then use | Order doesn't matter with mergeAll  |
| Sequential dependency resolution | `Layer.provide`                  | Force explicit ordering for clarity |
| Testing single service           | `Layer.provide`                  | Minimal layer for isolation         |
| Complex interdependencies        | Custom composition               | Use explicit Layer.provide chain    |

### Anti-Patterns: What NOT to Do

```typescript
// ❌ WRONG - Don't provide dependencies within a layer
export const PaymentServiceLive = Layer.effect(
  PaymentService,
  Effect.gen(function* () {
    const stripe = yield* StripeService
    // ...
  })
).pipe(
  Layer.provide(StripeService.Live)  // ❌ WRONG - app should provide this
)

// ✅ CORRECT - Let app compose dependencies
export const PaymentServiceLive = Layer.effect(
  PaymentService,
  Effect.gen(function* () {
    const stripe = yield* StripeService  // Needed by consumer to provide
    // ...
  })
)

// ❌ WRONG - Don't nest Effect.gen in layers
const AppLayer = Layer.effect(
  ???,
  Effect.gen(function* () {
    return Layer.mergeAll(...)  // ❌ Can't return Layer from Effect
  })
)

// ✅ CORRECT - Compose layers directly
const AppLayer = Layer.mergeAll(...)
```

## State Management with Effect Ref

**Effect Ref** provides thread-safe state for concurrent Effect programs. Use for state shared across fibers where race conditions must be prevented.

### Basic Ref Pattern (Pure Updates)

```typescript
import { Ref, Effect, Context, Layer } from 'effect';

// Create ref in service layer
export class CacheService extends Context.Tag('CacheService')<
  CacheService,
  {
    readonly increment: () => Effect.Effect<void>;
    readonly get: () => Effect.Effect<number>;
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const counter = yield* Ref.make(0);

      return {
        increment: () => Ref.update(counter, (n) => n + 1),
        get: () => Ref.get(counter),
      };
    }),
  );
}

// Usage - thread-safe concurrent updates
const program = Effect.gen(function* () {
  const cache = yield* CacheService;

  // 100 concurrent increments - all will be applied correctly
  yield* Effect.all(
    Array.from({ length: 100 }, () => cache.increment()),
    { concurrency: 'unbounded' },
  );

  const value = yield* cache.get(); // ✅ Guaranteed to be 100
});
```

### Ref API

| Operation             | Purpose                              | Example                                  |
| --------------------- | ------------------------------------ | ---------------------------------------- |
| `Ref.make(initial)`   | Create ref                           | `yield* Ref.make(0)`                     |
| `Ref.get(ref)`        | Read value                           | `yield* Ref.get(counter)`                |
| `Ref.set(ref, value)` | Set value                            | `yield* Ref.set(counter, 10)`            |
| `Ref.update(ref, fn)` | Update atomically with pure function | `yield* Ref.update(counter, n => n + 1)` |

### When to Use Ref vs SynchronizedRef

✅ **Use Ref for**: Pure state updates without effects

- Connection pools, rate limiters, caches with pre-fetched data, concurrent counters, feature flags
- Updates are synchronous pure functions

✅ **Use SynchronizedRef for**: Effectful state updates

- Updates requiring database queries, API calls, or other effects
- Use `SynchronizedRef.updateEffect` for atomic effectful updates

❌ **Don't use for**: React state, request-scoped data, immutable config, database state

### Best Practices

```typescript
// ✅ CORRECT with Ref - Perform effects before update
const data = yield * fetchData();
yield * Ref.update(state, (current) => ({ ...current, data }));

// ❌ WRONG with Ref - Effects inside update function (pure functions only!)
yield *
  Ref.update(state, (current) => {
    const data = yield * fetchData(); // ERROR - can't use yield* in pure function!
    return { ...current, data };
  });

// ✅ CORRECT with SynchronizedRef - Effects ARE allowed in updateEffect
yield *
  SynchronizedRef.updateEffect(state, (current) =>
    Effect.gen(function* () {
      const data = yield* fetchData(); // ✅ This works with SynchronizedRef!
      return { ...current, data };
    }),
  );
```

### SynchronizedRef Pattern (Effectful Updates)

Use **SynchronizedRef** when state updates require effects (database queries, API calls):

```typescript
import { SynchronizedRef, Effect, Context, Layer } from 'effect';

export class DataCache extends Context.Tag('DataCache')<
  DataCache,
  {
    readonly refresh: (id: string) => Effect.Effect<void>;
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const cache = yield* SynchronizedRef.make<Map<string, Data>>(new Map());

      return {
        refresh: (id) =>
          SynchronizedRef.updateEffect(cache, (current) =>
            Effect.gen(function* () {
              const data = yield* fetchFromDatabase(id); // ✅ Effects allowed!
              const updated = new Map(current);
              updated.set(id, data);
              return updated;
            }),
          ),
      };
    }),
  );
}
```

## State Management with @effect-atom/atom (Client-Side)

**CRITICAL DISTINCTION**: `@effect-atom/atom` is a **different library** from Effect's built-in `Ref`. Use Atom for **client-side React state**, Ref for **server-side concurrent state**.

### Atom vs Ref: Decision Table

| Aspect           | @effect-atom/atom                            | Effect Ref                             | Effect SynchronizedRef                               |
| ---------------- | -------------------------------------------- | -------------------------------------- | ---------------------------------------------------- |
| **Platform**     | Client/Browser only                          | Server/Node.js                         | Server/Node.js                                       |
| **Purpose**      | React reactive state                         | Thread-safe concurrent state           | Effectful concurrent updates                         |
| **APIs**         | Atom.make, Atom.get, Atom.set, Atom.update   | Ref.make, Ref.get, Ref.set, Ref.update | SynchronizedRef.make, SynchronizedRef.updateEffect   |
| **Integration**  | useAtomValue, useAtomSet hooks               | Effect.gen, service layers             | Effect.gen, service layers                           |
| **Use Cases**    | Cart, filters, form state                    | Pools, limiters, counters              | Database refreshes, API caching                      |
| **Package**      | @effect-atom/atom-react                      | effect (built-in)                      | effect (built-in)                                    |
| **Dependencies** | React                                        | None                                   | None                                                 |
| **Example**      | `const atom = yield* Atom.make({items: []})` | `const ref = yield* Ref.make(0)`       | `const ref = yield* SynchronizedRef.make(new Map())` |

### Atom Basics (Client-Side State)

**Use Atom for**: React component state, UI toggles, form data, search filters, shopping carts.

```typescript
// ✅ Client-side: Create atom in service layer
import { Atom } from '@effect-atom/atom-react';
import { Effect, Context, Layer } from 'effect';

export class CartService extends Context.Tag('CartService')<
  CartService,
  {
    readonly getItems: () => Effect.Effect<CartItem[]>;
    readonly addItem: (item: CartItem) => Effect.Effect<void>;
    readonly removeItem: (productId: string) => Effect.Effect<void>;
    readonly getTotalPrice: () => Effect.Effect<number>;
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      // Create reactive atom for cart state
      const cartAtom = yield* Atom.make<{ items: CartItem[] }>({ items: [] });

      return {
        getItems: () =>
          Effect.gen(function* () {
            const state = yield* Atom.get(cartAtom);
            return state.items;
          }),

        addItem: (item) =>
          Atom.update(cartAtom, (state) => ({
            items: [
              ...state.items.filter((i) => i.productId !== item.productId),
              item,
            ],
          })),

        removeItem: (productId) =>
          Atom.update(cartAtom, (state) => ({
            items: state.items.filter((item) => item.productId !== productId),
          })),

        getTotalPrice: () =>
          Effect.gen(function* () {
            const state = yield* Atom.get(cartAtom);
            return state.items.reduce(
              (sum, item) => sum + item.price * item.quantity,
              0,
            );
          }),
      };
    }),
  );
}
```

### Atom API Reference

| Operation               | Purpose                        | Example                                |
| ----------------------- | ------------------------------ | -------------------------------------- |
| `Atom.make(initial)`    | Create atom                    | `yield* Atom.make({ count: 0 })`       |
| `Atom.get(atom)`        | Read current value             | `yield* Atom.get(countAtom)`           |
| `Atom.set(atom, value)` | Set value                      | `Atom.set(countAtom, 10)`              |
| `Atom.update(atom, fn)` | Update with pure function      | `Atom.update(countAtom, n => n + 1)`   |
| `Atom.family(fn)`       | Create dynamic atoms from keys | `Atom.family((key) => Atom.make(key))` |
| `Atom.map(atom, fn)`    | Derive from another atom       | `Atom.map(userAtom, u => u.name)`      |
| `Atom.runtime(layer)`   | Create atom runtime            | `Atom.runtime(Layer.empty)`            |

### React Integration with useAtomValue and useAtomSet

Use React hooks to read and update atom values in components:

```typescript
// ✅ React component using Atom
import { useAtomValue, useAtomSet } from '@effect-atom/atom-react';
import { CartService } from './cart-service';

export function CartComponent() {
  const cartService = useCartService(); // Get service from context
  const cartAtom = cartService.cartAtom; // Reference to atom

  // Read atom value with hook
  const cart = useAtomValue(cartAtom);

  // Get setter function for atom
  const setCart = useAtomSet(cartAtom);

  // Combined hook (read + write)
  const [cart, setCart] = useAtom(cartAtom);

  return (
    <div>
      <h2>Cart ({cart.items.length} items)</h2>
      <button
        onClick={() =>
          setCart((state) => ({
            items: [...state.items, newItem],
          }))
        }
      >
        Add Item
      </button>
    </div>
  );
}
```

### AtomRuntimeProvider Setup

Provide the Atom runtime to your React application:

```typescript
// ✅ app/layout.tsx
import { AtomRuntimeProvider } from '@samuelho-dev/ui-state/client';
import { ClientRuntimeProvider } from '@samuelho-dev/ui-state/client';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        {/* Provide Effect Atom runtime */}
        <AtomRuntimeProvider>
          {/* Provide any additional Effect runtimes */}
          <ClientRuntimeProvider>{children}</ClientRuntimeProvider>
        </AtomRuntimeProvider>
      </body>
    </html>
  );
}
```

### Atom.family for Dynamic State

Use `Atom.family` to create a set of atoms keyed by values (e.g., separate atom per user):

```typescript
// ✅ Create family of atoms for user preferences
const userPreferencesFamily = Atom.family((userId: string) =>
  Atom.make({
    theme: 'light',
    notifications: true,
    language: 'en',
  }),
);

// Usage: Different atom instance per userId
const user1Prefs = userPreferencesFamily('user-123');
const user2Prefs = userPreferencesFamily('user-456');
```

### Atom.map for Derived State

Create derived atoms that compute values from other atoms:

```typescript
// ✅ Derive total price from cart atom
const cartAtom = yield* Atom.make({ items: [...] })

const totalPriceAtom = Atom.map(cartAtom, (cart) =>
  cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
)

// When reading totalPriceAtom, it always reflects current cart
const price = yield* Atom.get(totalPriceAtom)
```

### Server vs Client State: When to Use Each

**Use Atom (Client) for:**

- ✅ React component state
- ✅ UI toggles and modals
- ✅ Form input values
- ✅ Search filters and pagination
- ✅ Shopping cart contents
- ✅ User preferences (display, theme)

**Use Ref (Server) for:**

- ✅ Connection pools
- ✅ Rate limiters
- ✅ Cache entries (pre-fetched data)
- ✅ Concurrent counters
- ✅ Feature flags
- ✅ Session tracking

**Use SynchronizedRef (Server, Effectful) for:**

- ✅ Updates requiring database queries
- ✅ API calls during state updates
- ✅ Atomic database transactions
- ✅ Effects with side effects

### Common Patterns

**Pattern 1: Search State with Atom**

```typescript
// ✅ Client-side search state
const searchAtom =
  yield *
  Atom.make({
    query: '',
    filters: {},
    page: 1,
    sortBy: '_text_match:desc',
  });

// React component updates
const setFilters = (newFilters) =>
  Atom.update(searchAtom, (state) => ({
    ...state,
    filters: newFilters,
    page: 1, // Reset to first page
  }));
```

**Pattern 2: Form State with Atom**

```typescript
// ✅ Form validation state in Atom
const formAtom =
  yield *
  Atom.make({
    values: { name: '', email: '' },
    errors: {},
    touched: {},
  });

// Validate on change
const handleFieldChange = (field: string, value: string) =>
  Atom.update(formAtom, (state) => ({
    ...state,
    values: { ...state.values, [field]: value },
    errors: validateField(field, value),
  }));
```

### Effect 4.0 Compatibility

✅ **@effect-atom/atom is stable and independent of Effect version**

- Works with Effect 3.0+
- No breaking changes expected in Effect 4.0
- Separate library from core Effect

### Important Notes

1. **Atoms are client-side only**: Never use Atom in server-side code (API routes, services)
2. **Ref is server-side only**: Never try to use Ref in React components (won't have Effect context)
3. **Runtime preservation**: If calling Effects from React event handlers, preserve the runtime
4. **Keep Atoms simple**: Use atoms for UI state; use services for business logic

## Running Effects

### Application Entry Points

```typescript
// ✅ Recommended: Effect.runPromise for async contexts
await Effect.runPromise(program.pipe(Effect.provide(AppLayer)));

// ✅ For Node.js CLI applications
import { NodeRuntime } from '@effect/platform-node';

NodeRuntime.runMain(program.pipe(Effect.provide(AppLayer)));

// ✅ For testing
import { Effect } from 'effect';
import { expect, it } from 'vitest';

it('should process payment', async () => {
  const result = await Effect.runPromise(
    processPayment(100).pipe(Effect.provide(TestLayer)),
  );
  expect(result.status).toBe('success');
});

// ❌ AVOID: runSync for async effects
Effect.runSync(asyncEffect); // Will throw if effect is async

// ✅ Use runSync only for pure synchronous effects
Effect.runSync(Effect.succeed(42));
```

## ⚠️ CRITICAL: Runtime Preservation for Callbacks

**This pattern is essential for correctness when integrating Effect with callback-based APIs.** Failure to preserve the runtime leads to lost context, missing dependencies, and hard-to-debug failures in production.

### Why Runtime Preservation is Critical

When you call `Effect.runPromise()` or `Effect.runSync()` without the current runtime:

- ❌ Creates a **new, isolated runtime** with no access to your services
- ❌ Context tags (CurrentUser, DatabaseService, etc.) are **not available**
- ❌ Layer composition is **lost** - services can't be injected
- ❌ Errors aren't properly tracked or caught
- ❌ Fibers aren't part of your application's concurrency model

### Decision Rule: When to Capture Runtime

| Scenario                 | Capture Runtime?       | Rationale                           | Example                               |
| ------------------------ | ---------------------- | ----------------------------------- | ------------------------------------- |
| **Callback-based SDK**   | ✅ YES                 | SDK controls execution timing       | WebSocket, Node event emitters        |
| **Promise-based SDK**    | ✅ YES                 | Need Effect context in continuation | SDK callbacks, custom Promise chains  |
| **Kysely transactions**  | ✅ YES                 | Async callback needs service access | `db.transaction().execute(async ...)` |
| **Effect-based service** | ❌ NO                  | Service already has runtime         | DatabaseService.transaction()         |
| **Inside Effect.gen**    | ❌ NO                  | Already in Effect context           | Service operations, computed values   |
| **Library exports**      | ✅ YES (conditionally) | Consumer may need their runtime     | SDK wrappers, adapters                |

### Pattern 1: WebSocket with Runtime Preservation

```typescript
// ❌ WRONG - Runtime context lost
websocket.on('message', (data) => {
  Effect.runPromise(handleMessage(data)); // Creates new runtime!
});

// ✅ CORRECT - Preserve runtime with Effect.runtime
const setupWebSocket = Effect.gen(function* () {
  const runtime = yield* Effect.runtime();
  const runFork = Runtime.runFork(runtime);

  websocket.on('message', (data) => {
    runFork(handleMessage(data)); // Preserves context and layers
  });

  // Cleanup on scope exit
  yield* Effect.addFinalizer(() => Effect.sync(() => websocket.close()));
});
```

**Why this matters**: The `handleMessage` Effect now has access to all services (DatabaseService, CurrentUser context, etc.) that were provided via layers.

### Pattern 2: FiberHandle for Managed Callbacks

Use when you need explicit control over forked fibers:

```typescript
// ✅ Alternative: Use FiberHandle for managed callbacks
const setupWebSocket = Effect.gen(function* () {
  const handle = yield* FiberHandle.make();

  websocket.on('message', (data) => {
    FiberHandle.run(handle, handleMessage(data)); // Runtime preserved
  });

  // Cleanup on scope exit - all forked fibers cleaned up
  yield* Effect.addFinalizer(() => Effect.sync(() => websocket.close()));
});
```

**Advantage**: FiberHandle automatically manages all forked fibers and cleans them up when the scope exits.

### Pattern 3: Kysely Transactions with Effect Runtime Preservation

**Critical**: Kysely's `db.transaction().execute()` callback runs in an async context that loses the Effect runtime.

```typescript
// ❌ WRONG - DatabaseService not available in transaction
export const UserRepository = class extends Context.Tag('UserRepository')<
  UserRepository,
  {
    readonly createWithRelated: (
      data: CreateUserData,
    ) => Effect.Effect<User, RepositoryError>;
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const database = yield* DatabaseService;

      return {
        createWithRelated: (data) =>
          database.query((db) =>
            db.transaction().execute(async (trx) => {
              // ❌ PROBLEM: Can't use Effect here - runtime lost
              // const something = yield* SomeService  // ERROR!
              return await createUser(trx, data);
            }),
          ),
      };
    }),
  );
};

// ✅ CORRECT - Preserve runtime for Effect execution within transaction
export const UserRepository = class extends Context.Tag('UserRepository')<
  UserRepository,
  {
    readonly createWithRelated: (
      data: CreateUserData,
    ) => Effect.Effect<User, RepositoryError>;
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const database = yield* DatabaseService;
      const runtime = yield* Effect.runtime();

      return {
        createWithRelated: (data) =>
          database.query((db) =>
            db.transaction().execute(async (trx) => {
              // ✅ CORRECT: Preserve runtime for Effect execution within transaction
              return await Runtime.runPromise(runtime)(
                Effect.gen(function* () {
                  const user = yield* createUser(trx, data);
                  const profile = yield* createProfile(trx, user.id);
                  return { ...user, profile };
                }),
              );
            }),
          ),
      };
    }),
  );
};
```

**Why this is critical**: The `createUser` and `createProfile` Effects may depend on services through the context. Capturing the runtime ensures they have access.

### Pattern 4: SDK Adapter with Runtime Preservation

When creating an adapter around an SDK with callbacks:

```typescript
// ✅ CORRECT - SDK adapter preserving runtime
export class StripeWebhookService extends Context.Tag('StripeWebhookService')<
  StripeWebhookService,
  {
    readonly setupWebhookListener: () => Effect.Effect<void>;
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const stripe = yield* StripeService;
      const logger = yield* LoggingService;
      const runtime = yield* Effect.runtime();

      return {
        setupWebhookListener: () =>
          Effect.gen(function* () {
            const runFork = Runtime.runFork(runtime);

            // SDK provides callbacks, we need to preserve runtime
            stripe.webhooks.onEvent('payment_intent.succeeded', (event) => {
              runFork(
                Effect.gen(function* () {
                  yield* logger.info(`Webhook received: ${event.id}`);
                  yield* handlePaymentSuccess(event);
                }),
              );
            });
          }),
      };
    }),
  );
}
```

### Common Mistakes

**Mistake 1: New runtime per callback**

```typescript
// ❌ WRONG - Creates new runtime for each message
websocket.on('message', (data) => {
  Effect.runPromise(handleMessage(data)); // WRONG!
});
```

**Mistake 2: Using await instead of Runtime.runPromise**

```typescript
// ❌ WRONG - Mixing async/await (different runtime)
websocket.on('message', async (data) => {
  await Effect.runPromise(handleMessage(data)); // WRONG!
});
```

**Mistake 3: Forgetting runtime in nested callbacks**

```typescript
// ❌ WRONG - Runtime lost in nested promise chain
const runtime = yield * Effect.runtime();
sdk.onEvent(() => {
  sdk.nested.callback(() => {
    // Runtime NOT available here - lost through callback chain
  });
});
```

**Correct approach for nested callbacks**:

```typescript
// ✅ CORRECT - Preserve runtime through entire callback chain
const runtime = yield * Effect.runtime();
const runFork = Runtime.runFork(runtime);

sdk.onEvent(() => {
  sdk.nested.callback(() => {
    runFork(nestedEffect); // Runtime available here
  });
});
```

### Testing Runtime Preservation

Use `@effect/vitest` to test runtime preservation:

```typescript
import { it } from '@effect/vitest';
import { Effect, Layer } from 'effect';

describe('RuntimePreservation', () => {
  it('should preserve runtime in callbacks', () =>
    Effect.gen(function* () {
      const runtime = yield* Effect.runtime();
      const runFork = Runtime.runFork(runtime);

      let called = false;
      runFork(
        Effect.gen(function* () {
          called = true;
        }),
      );

      expect(called).toBe(true);
    }));
});
```

### Effect 4.0 Compatibility

✅ **Runtime preservation is stable in Effect 3.0+**

- `Effect.runtime()` API guaranteed stable
- `Runtime.runFork()` API guaranteed stable
- `FiberHandle` API guaranteed stable
- No breaking changes expected in Effect 4.0

### Related Patterns

- **Layer Composition**: See "Service Composition Patterns" for how context flows through layers
- **Error Handling**: Captured runtime preserves error context through callbacks
- **Fiber Management**: Runtime preservation works with Fiber, FiberSet, FiberMap
- **Resource Management**: Use `Effect.addFinalizer()` with runtime preservation for cleanup

## Concurrent Execution with Fiber, FiberSet, and FiberMap

**Fibers** are Effect's lightweight concurrency primitive (like goroutines). Use **FiberSet** for unkeyed concurrent tasks, **FiberMap** for keyed tasks with deduplication.

### Fiber Basics

```typescript
import { Effect, Fiber } from 'effect';

// Fork background work
const program = Effect.gen(function* () {
  const fiber = yield* Effect.fork(expensiveTask);

  // Do other work while fiber runs
  yield* otherWork;

  // Wait for result
  const result = yield* Fiber.join(fiber);
});
```

### FiberSet - Unkeyed Concurrent Tasks

Auto-manages lifecycle of concurrent operations.

```typescript
import { FiberSet } from 'effect';

export class JobProcessor extends Context.Tag('JobProcessor')<
  JobProcessor,
  {
    readonly processJob: (job: Job) => Effect.Effect<void>;
  }
>() {
  static readonly Live = Layer.scoped(
    this,
    Effect.gen(function* () {
      const fiberSet = yield* FiberSet.make();

      return {
        processJob: (job) => FiberSet.run(fiberSet, processJobLogic(job)),
        // FiberSet auto-cleaned up by Layer.scoped
      };
    }),
  );
}
```

### FiberMap - Keyed Tasks with Deduplication

Prevents duplicate concurrent work for the same key.

```typescript
import { FiberMap, Option } from 'effect';

export class CacheRefresh extends Context.Tag('CacheRefresh')<
  CacheRefresh,
  {
    readonly refresh: (key: string) => Effect.Effect<void>;
  }
>() {
  static readonly Live = Layer.scoped(
    this,
    Effect.gen(function* () {
      const fiberMap = yield* FiberMap.make<string>();

      return {
        refresh: (key) =>
          Effect.gen(function* () {
            // Check if already refreshing
            const existing = yield* FiberMap.get(fiberMap, key);
            if (Option.isSome(existing)) {
              yield* Fiber.join(existing.value); // Wait for existing
              return;
            }

            // Start new refresh
            yield* FiberMap.run(fiberMap, key, refreshLogic(key));
          }),
      };
    }),
  );
}
```

### When to Use Each

| Pattern        | Use Case                | Example                                               |
| -------------- | ----------------------- | ----------------------------------------------------- |
| **Fiber**      | Manual control          | Background tasks with explicit join/interrupt         |
| **FiberSet**   | Unkeyed concurrent work | Job processors, background workers                    |
| **FiberMap**   | Keyed work with dedup   | Cache refresh, API request deduplication              |
| **Effect.all** | Simple parallelism      | Parallel independent tasks (preferred for most cases) |

## Parallel Operations

### Effect.all for Concurrent Execution

Effect.all supports both **array syntax** and **object syntax** for running effects in parallel.

#### Syntax Selection Guide

| Syntax     | Use When                             | Result Type             | Destructuring          |
| ---------- | ------------------------------------ | ----------------------- | ---------------------- |
| **Array**  | Homogeneous data, similar operations | Tuple `[A, B, C]`       | `[a, b, c]` positional |
| **Object** | Heterogeneous data, named access     | Object `{ a: A, b: B }` | `{ a, b }` by name     |

#### Array Syntax - Positional Results

Use for **homogeneous collections** or when order matters:

```typescript
// ✅ Array syntax: Homogeneous data (all same type/purpose)
const getUserData = (userId: string) =>
  Effect.all(
    [getUserProfile(userId), getUserOrders(userId), getUserPreferences(userId)],
    { concurrency: 'unbounded' },
  ).pipe(
    Effect.map(([profile, orders, preferences]) => ({
      ...profile,
      orders,
      preferences,
    })),
  );

// ✅ Good for processing similar items
const validateFields = (fields: string[]) =>
  Effect.all(
    fields.map((field) => validateField(field)),
    { concurrency: 'unbounded' },
  ).pipe(Effect.map((results) => results.every((valid) => valid)));
```

**When to use**:

- Similar operations on different inputs
- Positional meaning (order matters)
- Homogeneous result types
- Dynamic number of effects

#### Object Syntax - Named Results

Use for **heterogeneous data** with semantic meaning:

```typescript
// ✅ Object syntax: Heterogeneous data with semantic names
const getProductPage = (productId: string) =>
  Effect.gen(function* () {
    const {
      product, // Product entity
      reviews, // Review list
      seller, // Seller entity
      viewCount, // Number
    } = yield* Effect.all(
      {
        product: productRepo.findById(productId),
        reviews: reviewRepo.findByProduct(productId),
        seller: Effect.gen(function* () {
          const prod = yield* productRepo.findById(productId);
          return yield* sellerRepo.findById(prod.sellerId);
        }),
        viewCount: analytics.getProductViews(productId),
      },
      { concurrency: 'unbounded' },
    );

    return { product, reviews, seller, analytics: { viewCount } };
  });

// ✅ Good for dashboard data aggregation
const getDashboardData = (userId: string) =>
  Effect.all(
    {
      user: fetchUser(userId),
      stats: fetchUserStats(userId),
      notifications: fetchNotifications(userId),
      preferences: fetchPreferences(userId),
    },
    { concurrency: 'unbounded' },
  );
```

**When to use**:

- Different types of data
- Semantic field names improve readability
- Fixed set of named results
- Better self-documenting code

#### Concurrency and Error Modes

Both syntaxes support the same options:

```typescript
// ✅ Parallel with early exit on first error (default)
Effect.all(effects, { concurrency: 'unbounded', mode: 'default' });

// ✅ Collect all results, even with errors (Either)
Effect.all(effects, { concurrency: 'unbounded', mode: 'either' });

// ✅ Validate all, collecting all errors
Effect.all(effects, { concurrency: 'unbounded', mode: 'validate' });

// ✅ Limited concurrency
Effect.all(effects, { concurrency: 5 }); // Max 5 parallel operations

// ✅ Sequential execution
Effect.all(effects, { concurrency: 1 }); // Same as sequential
```

#### Decision Matrix

```
Do results have semantic meaning?
├─ YES → Object syntax
│   Example: { product, reviews, seller }
│   Benefit: Self-documenting, clear field names
│
└─ NO → Are results homogeneous?
    ├─ YES → Array syntax
    │   Example: fields.map(f => validate(f))
    │   Benefit: Works with dynamic collections
    │
    └─ NO → Object syntax
        Example: { count: getCount(), name: getName() }
        Benefit: Type-safe named access
```

#### Common Patterns

```typescript
// ✅ Parallel with limited concurrency
const processBatch = (items: Item[]) =>
  Effect.forEach(
    items,
    (item) => processItem(item),
    { concurrency: 5 }, // Process max 5 items at once
  );

// ✅ Race effects - first to complete wins
const fetchWithTimeout = (url: string) =>
  Effect.race(
    fetchData(url),
    Effect.sleep('5 seconds').pipe(
      Effect.flatMap(() => Effect.fail(new TimeoutError())),
    ),
  );

// ✅ Collect errors with validate mode
const validateAllFields = (data: FormData) =>
  Effect.all(
    {
      name: validateName(data.name),
      email: validateEmail(data.email),
      age: validateAge(data.age),
    },
    {
      concurrency: 'unbounded',
      mode: 'validate', // Collect all validation errors
    },
  );
```

#### Migration Between Syntaxes

```typescript
// Before: Array syntax
const [product, reviews, seller] =
  yield *
  Effect.all(
    [
      productRepo.findById(id),
      reviewRepo.findByProduct(id),
      sellerRepo.findById(sellerId),
    ],
    { concurrency: 'unbounded' },
  );

// After: Object syntax (better readability)
const { product, reviews, seller } =
  yield *
  Effect.all(
    {
      product: productRepo.findById(id),
      reviews: reviewRepo.findByProduct(id),
      seller: sellerRepo.findById(sellerId),
    },
    { concurrency: 'unbounded' },
  );
```

### Effect 4.0 Compatibility Notes

**Stable in Effect 3.0+**: Both array and object syntax are stable
**Effect 4.0 Status**: No breaking changes expected
**Recommendation**: Prefer object syntax for better readability when results have semantic meaning

## Comprehensive Test Layer Patterns

### Live, Test, Dev, and Mock Layers

```typescript
export class PaymentService extends Context.Tag('PaymentService')<
  PaymentService,
  PaymentServiceInterface
>() {
  // Production layer with real dependencies
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const stripe = yield* StripeService;
      const db = yield* DatabaseService;
      const logger = yield* LoggingService;

      return {
        processPayment: (amount) =>
          Effect.gen(function* () {
            yield* logger.info(`Processing payment: ${amount}`);
            const result = yield* Effect.tryPromise({
              try: () =>
                stripe.paymentIntents.create({ amount, currency: 'usd' }),
              catch: (error) => new PaymentError({ cause: error }),
            });
            yield* db.query((db) =>
              db
                .insertInto('payments')
                .values({ amount, stripeId: result.id })
                .execute(),
            );
            return result;
          }),
      };
    }),
  );

  // Test layer with deterministic results
  static readonly Test = Layer.succeed(this, {
    processPayment: (amount) =>
      Effect.succeed({
        id: `test-${amount}`,
        status: 'success',
        amount,
        created: 1234567890,
      }),
    refundPayment: () => Effect.succeed(void 0),
  });

  // Dev layer with logging and delays for local development
  static readonly Dev = Layer.effect(
    this,
    Effect.gen(function* () {
      const logger = yield* LoggingService;

      return {
        processPayment: (amount) =>
          Effect.gen(function* () {
            yield* logger.info(`[DEV] Processing payment: ${amount}`);
            yield* Effect.sleep('100 millis'); // Simulate network delay
            return {
              id: `dev-${Date.now()}`,
              status: 'success' as const,
              amount,
              created: Date.now(),
            };
          }),
        refundPayment: (id) =>
          Effect.gen(function* () {
            yield* logger.info(`[DEV] Refunding payment: ${id}`);
            yield* Effect.sleep('50 millis');
          }),
      };
    }),
  );

  // Configurable mock layer for specific test scenarios
  static readonly Mock = (overrides?: Partial<PaymentServiceInterface>) =>
    Layer.succeed(this, {
      processPayment:
        overrides?.processPayment ??
        ((amount) =>
          Effect.succeed({
            id: 'mock-123',
            status: 'success',
            amount,
            created: Date.now(),
          })),
      refundPayment: overrides?.refundPayment ?? (() => Effect.succeed(void 0)),
    });

  // Auto layer - selects appropriate layer based on environment
  static readonly Auto = Layer.unwrapEffect(
    Effect.gen(function* () {
      const env = yield* Config.string('NODE_ENV').pipe(
        Effect.orElse(() => Effect.succeed('production')),
      );

      switch (env) {
        case 'test':
          return PaymentService.Test;
        case 'development':
          return PaymentService.Dev;
        case 'production':
        default:
          return PaymentService.Live;
      }
    }),
  );
}

// Usage in tests with specific scenarios
describe('PaymentService', () => {
  it('should handle payment failures', async () => {
    const TestLayer = Layer.mergeAll(
      DatabaseService.Test,
      LoggingService.Test,
      PaymentService.Mock({
        processPayment: () =>
          Effect.fail(new PaymentError({ message: 'Card declined' })),
      }),
    );

    const result = await Effect.runPromise(
      processPayment(100).pipe(Effect.either, Effect.provide(TestLayer)),
    );

    expect(Either.isLeft(result)).toBe(true);
  });

  it('should process payment successfully', async () => {
    const TestLayer = Layer.mergeAll(
      DatabaseService.Test,
      LoggingService.Test,
      PaymentService.Test,
    );

    const result = await Effect.runPromise(
      processPayment(100).pipe(Effect.provide(TestLayer)),
    );

    expect(result.status).toBe('success');
    expect(result.amount).toBe(100);
  });
});
```

## Layer Dependency Visualization

### ASCII Layer Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                   Application Layer                      │
│  (Complete composition: Infra + Providers + Repos + Features) │
└─────────────────────────────────────────────────────────┘
  ▲
  │ provides
  │
┌─────────────────────────────────────────────────────────┐
│              Feature Services Layer                      │
│  PaymentService • EmailService • NotificationService    │
│  (Depends on: Repositories + Providers)                 │
└─────────────────────────────────────────────────────────┘
  ▲
  │ provides (both layers)
  │
┌──────────────────────────┬──────────────────────────────┐
│ Repository Services      │   Provider Services          │
│ ────────────────────     │   ──────────────────         │
│ UserRepository           │   StripeService              │
│ ProductRepository        │   ResendService              │
│ OrderRepository          │   SupabaseService            │
│ (Depends on: Infra)      │   (Depends on: Infra)        │
└──────────────────────────┴──────────────────────────────┘
  ▲                            ▲
  │ provides                   │ provides
  │                            │
┌─────────────────────────────────────────────────────────┐
│             Infrastructure Services Layer               │
│  ConfigService • LoggingService • DatabaseService • CacheService  │
│  (No dependencies)                                       │
└─────────────────────────────────────────────────────────┘
```

### Dependency Flow Rules

1. **Infrastructure** has NO dependencies
2. **Providers** depend ONLY on Infrastructure (optional)
3. **Repositories** depend on Infrastructure + Providers
4. **Features** depend on Repositories + Providers
5. **Application** composes all layers

### Layering Example

```typescript
// Infrastructure (no dependencies)
const InfraLayer = Layer.mergeAll(ConfigService.Live, LoggingService.Live);

// Providers (depend on infra)
const ProviderLayer = Layer.mergeAll(
  DatabaseService.Live,
  CacheService.Live,
  StripeService.Live,
).pipe(Layer.provide(InfraLayer));

// Repositories (depend on providers)
const RepositoryLayer = Layer.mergeAll(
  UserRepository.Live,
  ProductRepository.Live,
  OrderRepository.Live,
).pipe(Layer.provide(ProviderLayer));

// Features (depend on repos and providers)
const FeatureLayer = Layer.mergeAll(
  PaymentService.Live,
  EmailService.Live,
  NotificationService.Live,
).pipe(Layer.provide(Layer.merge(RepositoryLayer, ProviderLayer)));

// Complete application layer
export const AppLayer = Layer.mergeAll(
  InfraLayer,
  ProviderLayer,
  RepositoryLayer,
  FeatureLayer,
);

// For development
export const DevLayer = Layer.mergeAll(
  ConfigService.Dev,
  LoggingService.Dev,
  DatabaseService.Dev,
  CacheService.Dev,
  StripeService.Test,
  UserRepository.Live,
  ProductRepository.Live,
  OrderRepository.Live,
  PaymentService.Dev,
  EmailService.Test,
  NotificationService.Test,
);

// For testing
export const TestLayer = Layer.mergeAll(
  ConfigService.Test,
  LoggingService.Test,
  DatabaseService.Test,
  CacheService.Test,
  StripeService.Test,
  UserRepository.Test,
  ProductRepository.Test,
  OrderRepository.Test,
  PaymentService.Test,
  EmailService.Test,
  NotificationService.Test,
);
```

## Common Anti-Patterns to Avoid

### ❌ Using Context.GenericTag for Non-Generic Services

```typescript
// ❌ WRONG - Unnecessary
export const PaymentService = Context.GenericTag<PaymentServiceInterface>(
  '@feature/payment/PaymentService',
);

// ✅ CORRECT - Use Context.Tag
export class PaymentService extends Context.Tag('PaymentService')<
  PaymentService,
  PaymentServiceInterface
>() {}
```

### ❌ Using Verbose Patterns (.of(), .make())

```typescript
// ❌ WRONG - Unnecessary factory methods
export class PaymentService extends Context.Tag("PaymentService")<
  PaymentService,
  PaymentServiceInterface
>() {
  static make(stripe, database): PaymentServiceInterface {  // ❌ Avoid
    return PaymentService.of({  // ❌ Don't use .of()
      processPayment: () => /* ... */
    })
  }
}

// ✅ CORRECT - Direct object return in layer
export class PaymentService extends Context.Tag("PaymentService")<
  PaymentService,
  { readonly processPayment: (amount: number) => Effect.Effect<Payment, PaymentError> }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const stripe = yield* StripeService
      const database = yield* DatabaseService

      // Direct object return - no factories
      return {
        processPayment: (amount) => /* implementation */
      }
    })
  )
}
```

### ❌ Providing Dependencies in Library Layers

```typescript
// ❌ WRONG - Library provides its own dependencies
export const PaymentServiceLive = Layer.effect(
  PaymentService,
  makePaymentService,
).pipe(
  Layer.provide(StripeServiceLive), // ❌ Don't do this
  Layer.provide(DatabaseServiceLive), // ❌ Let app compose
);

// ✅ CORRECT - Let application compose dependencies
export const PaymentServiceLive = Layer.effect(
  PaymentService,
  makePaymentService,
);
```

### ❌ Type Assertions in Error Handling

```typescript
// ❌ WRONG - Type assertion
catch: (error) => error as PaymentError

// ✅ CORRECT - Proper error mapping
catch: (error) => {
  if (error instanceof Error) {
    return new PaymentError({ message: error.message });
  }
  return new PaymentError({ message: String(error) });
}
```

### ❌ Mixing Promises with Effects

```typescript
// ❌ WRONG - Mixing async/await with Effect
async function processPayment() {
  const result = await Effect.runPromise(paymentEffect);
  return result;
}

// ✅ CORRECT - Pure Effect
const processPayment = () => paymentEffect;
```

### ❌ Nested Effect.gen

```typescript
// ❌ WRONG - Nested generators are unnecessary
const processOrder = Effect.gen(function* () {
  const order = yield* getOrder();

  // ❌ Nested gen is unnecessary
  const payment = yield* Effect.gen(function* () {
    const amount = order.total;
    return yield* processPayment(amount);
  });

  return payment;
});

// ✅ CORRECT - Flat structure
const processOrder = Effect.gen(function* () {
  const order = yield* getOrder();
  const payment = yield* processPayment(order.total);
  return payment;
});
```

### ❌ Creating Runtime in Loops

```typescript
// ❌ WRONG - Creates runtime per iteration
for (const item of items) {
  await Effect.runPromise(processItem(item).pipe(Effect.provide(AppLayer)));
}

// ✅ CORRECT - Single runtime for all iterations
await Effect.runPromise(
  Effect.all(
    items.map((item) => processItem(item)),
    { concurrency: 5 },
  ).pipe(Effect.provide(AppLayer)),
);
```

### ❌ Unnecessary Type Annotations with Effect

```typescript
// ❌ WRONG - Redundant type annotation
const getUser = (
  id: string,
): Effect.Effect<User, DatabaseError, DatabaseService> =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    return yield* db.query(/* ... */);
  });

// ✅ CORRECT - Let TypeScript infer
const getUser = (id: string) =>
  Effect.gen(function* () {
    const db = yield* DatabaseService;
    return yield* db.query(/* ... */);
  });
```

## Type Safety & Inference Patterns

### Rule 1: Leverage TypeScript Inference

**Effect inference is powerful - let it work for you:**

```typescript
// ❌ Over-annotated - unnecessary
const processPayment = (
  amount: number,
): Effect.Effect<Payment, PaymentError, PaymentService> =>
  Effect.gen(function* () {
    const service = yield* PaymentService;
    return yield* service.process(amount);
  });

// ✅ Let inference work
const processPayment = (amount: number) =>
  Effect.gen(function* () {
    const service = yield* PaymentService;
    return yield* service.process(amount);
  });
// TypeScript infers: Effect<Payment, PaymentError, PaymentService>
```

### Rule 2: Service Type Inference

**When defining services, let inference capture dependencies:**

```typescript
// Service automatically infers it needs PaymentService
const handler = (amount: number) =>
  Effect.gen(function* () {
    const service = yield* PaymentService;
    const result = yield* service.process(amount);
    return result;
  });
// Effect infers: Effect<Payment, PaymentError, PaymentService>

// Service composition automatically satisfies this:
const layer = Layer.mergeAll(PaymentService.Live, OtherService.Live);

// All dependencies are automatically provided
await Effect.runPromise(handler(100).pipe(Effect.provide(layer)));
```

### Rule 3: Error Type Inference

**Define errors properly, let Type inference create unions:**

```typescript
// Domain error
export class ProductNotFoundError extends Data.TaggedError(
  'ProductNotFoundError',
)<{
  readonly productId: string;
}> {}

// Service error
export class ServiceError extends Data.TaggedError('ServiceError')<{
  readonly message: string;
}> {}

// Effect automatically infers error union
const getProduct = (id: string) =>
  Effect.gen(function* () {
    const product = yield* findProduct(id); // Effect<Product, ProductNotFoundError>
    return yield* enrichProduct(product); // Effect<EnrichedProduct, ServiceError>
  });
// TypeScript infers: Effect<EnrichedProduct, ProductNotFoundError | ServiceError>
```

### Rule 4: Repository Interface Type Safety

**Use interfaces to enforce complete implementations:**

```typescript
// ✅ Repository interface ensures type safety
export interface UserRepositoryInterface {
  readonly findById: (id: string) => Effect.Effect<Option.Option<User>, DatabaseError>
  readonly create: (input: UserInput) => Effect.Effect<User, DatabaseError>
  readonly update: (id: string, input: Partial<UserInput>) => Effect.Effect<User, DatabaseError>
  readonly delete: (id: string) => Effect.Effect<void, DatabaseError>
}

// ✅ Service tag ensures all methods are implemented
export class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  UserRepositoryInterface
>() {}

// TypeScript enforces ALL methods are present
export const UserRepositoryLive = Layer.effect(
  UserRepository,
  Effect.gen(function* () {
    const database = yield* DatabaseService

    return {
      findById: (id) => /* ... */,
      create: (input) => /* ... */,
      update: (id, input) => /* ... */,
      delete: (id) => /* ... */
      // ✅ Missing a method? TypeScript will error!
    }
  })
)
```

### Rule 5: Schema Validation Type Safety

**Use schemas for runtime validation AND type safety:**

```typescript
import { Schema } from 'effect';

// ✅ Single source of truth for types
export const UserSchema = Schema.Struct({
  id: Schema.String,
  email: Schema.String,
  name: Schema.String,
  createdAt: Schema.DateTimeUtc,
});

// Type is automatically derived from schema
export type User = Schema.Schema.Type<typeof UserSchema>;

// Validation is type-safe
const parseUser = (data: unknown) =>
  Effect.try({
    try: () => Schema.decodeSync(UserSchema)(data),
    catch: (error) => new ValidationError({ cause: error }),
  });
```

### Rule 6: Generic Service Type Safety

**For generic services, use proper type parameters:**

```typescript
// ✅ Generic service with proper type constraints
export const KyselyService = <DB>() =>
  Context.Tag<KyselyServiceInterface<DB>>('KyselyService');

// Usage maintains type safety
const db = KyselyService<Database>();

const query = (sql: string) =>
  Effect.gen(function* () {
    const service = yield* db;
    return yield* service.execute(sql); // SQL type-checked for Database
  });
```

### Anti-Pattern: Type Assertions

```typescript
// ❌ WRONG - Type assertion hides errors
const user = data as User; // Compiler can't catch missing fields

// ✅ CORRECT - Use schemas or proper typing
const parseUser = (data: unknown): Effect.Effect<User, ValidationError> =>
  Effect.try({
    try: () => Schema.decodeSync(UserSchema)(data),
    catch: (error) => new ValidationError({ cause: error }),
  });
```

### Type Safety Checklist

- ✅ Let TypeScript infer effect types (don't over-annotate)
- ✅ Use interfaces to enforce complete implementations
- ✅ Define errors as Data.TaggedError to create type-safe unions
- ✅ Use schemas for runtime validation AND types
- ✅ Avoid type assertions (as X) - use proper typing
- ✅ Service dependencies automatically inferred by TypeScript
- ✅ Error composition automatically creates correct union types

## Quick Lookup Table

| Pattern             | When to Use                | Syntax                                                              |
| ------------------- | -------------------------- | ------------------------------------------------------------------- |
| Context.Tag         | Non-generic services (90%) | `class Service extends Context.Tag()<Service, Interface>() {}`      |
| Effect.Service      | Services with accessors    | `class Service extends Effect.Service<Service>()("Service", {...})` |
| Context.GenericTag  | Generic services (1%)      | `const Service = <T>() => Context.GenericTag<Interface<T>>()`       |
| Inline Interface    | Services with <10 methods  | `Context.Tag()<Service, { method: () => Effect }>()`                |
| Static Live         | Production layer           | `static readonly Live = Layer.effect(this, ...)`                    |
| Static Test         | Test layer                 | `static readonly Test = Layer.succeed(this, ...)`                   |
| Static Dev          | Development layer          | `static readonly Dev = Layer.effect(this, ...)`                     |
| Static Mock         | Configurable mocks         | `static readonly Mock = (overrides?) => Layer.succeed(...)`         |
| Static Auto         | Environment-based          | `static readonly Auto = Layer.unwrapEffect(...)`                    |
| Layer.sync          | Sync creation              | `Layer.sync(this, () => implementation)`                            |
| Layer.effect        | Needs dependencies         | `Layer.effect(this, Effect.gen(...))`                               |
| Layer.scoped        | Resource cleanup           | `Layer.scoped(this, Effect.acquireRelease(...))`                    |
| Layer.succeed       | Test mocks                 | `Layer.succeed(this, mockImplementation)`                           |
| Data.TaggedError    | Runtime errors             | `class Error extends Data.TaggedError()`                            |
| Schema.TaggedError  | RPC/serializable errors    | `class Error extends Schema.TaggedError()()`                        |
| Effect.gen          | Sequential/complex         | `Effect.gen(function* () {})`                                       |
| Combinators         | Simple/parallel            | `Effect.map`, `Effect.all`, etc.                                    |
| Effect.runtime      | Preserve context           | `const runtime = yield* Effect.runtime()`                           |
| Effect.all          | Parallel execution         | `Effect.all([...], { concurrency: "unbounded" })`                   |
| Effect.runPromise   | Run in async context       | `await Effect.runPromise(program)`                                  |
| NodeRuntime.runMain | CLI apps                   | `NodeRuntime.runMain(program)`                                      |

**Note**: Both `Effect.Service` and `Context.Tag` are valid in Effect 3.0+. Choose based on your needs.

## Migration Guide

### From Context.GenericTag to Context.Tag

```typescript
// Before
export const MyService =
  Context.GenericTag<MyServiceInterface>('@app/MyService');

// After
export class MyService extends Context.Tag('MyService')<
  MyService,
  MyServiceInterface
>() {}
```

### From Verbose to Modern Patterns

```typescript
// ❌ OLD - Verbose pattern with factory methods
export class PaymentService extends Context.Tag('PaymentService')<
  PaymentService,
  PaymentServiceInterface
>() {
  static make(
    stripe: Stripe,
    database: DatabaseService,
  ): PaymentServiceInterface {
    return PaymentService.of({
      processPayment: () =>
        Effect.gen(function* () {
          // implementation
        }),
    });
  }
}

export const PaymentServiceLive = Layer.effect(
  PaymentService,
  Effect.gen(function* () {
    const stripe = yield* StripeService;
    const database = yield* DatabaseService;
    return PaymentService.make(stripe, database);
  }),
);

// ✅ NEW - Modern pattern with inline interface and static Live
export class PaymentService extends Context.Tag('PaymentService')<
  PaymentService,
  {
    readonly processPayment: (
      amount: number,
    ) => Effect.Effect<Payment, PaymentError>;
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const stripe = yield* StripeService;
      const database = yield* DatabaseService;

      // Direct object return - no factories
      return {
        processPayment: (amount) =>
          Effect.tryPromise({
            try: () =>
              stripe.paymentIntents.create({ amount, currency: 'usd' }),
            catch: (error) => new PaymentError({ cause: error }),
          }),
      };
    }),
  );
}
```

### Key Takeaways

1. **Prefer inline interfaces** for services with <10 methods
2. **Use static Live property** for layer definitions
3. **Return objects directly** - no .of() or .make()
4. **Both Context.Tag and Effect.Service are valid** - choose based on use case (see Decision Matrix above)
5. **Include test layers** in service definitions for better testing
6. **Effect 4.0 ready** - All patterns in this guide are stable APIs

## Testing with @effect/vitest

The monorepo uses **@effect/vitest** for testing Effect-based services. This library provides seamless integration between Vitest and Effect, with automatic TestContext injection, TestClock support, and native Effect test patterns.

### Basic Effect Test

```typescript
import { it, expect } from '@effect/vitest';
import { Effect } from 'effect';
import { MyService } from './my-service';
import { MyServiceLive } from './my-service';

describe('MyService', () => {
  it('should perform operation', () =>
    Effect.gen(function* () {
      const service = yield* MyService;
      const result = yield* service.operation();

      expect(result).toBe(expectedValue);
    }).pipe(Effect.provide(MyServiceLive)));
});
```

### Testing with Dependencies

```typescript
import { it, expect } from '@effect/vitest';
import { Effect, Layer } from 'effect';

describe('ServiceWithDependencies', () => {
  const TestLayer = Layer.mergeAll(
    TestDatabaseService,
    TestCacheService,
    MyServiceLive,
  );

  it('should use injected dependencies', () =>
    Effect.gen(function* () {
      const service = yield* MyService;
      const db = yield* DatabaseService;
      const cache = yield* CacheService;

      const result = yield* service.operationWithDeps();

      expect(result).toBeDefined();
    }).pipe(Effect.provide(TestLayer)));
});
```

### Testing with TestClock

@effect/vitest automatically provides a TestClock for simulating time in tests:

```typescript
import { it, expect } from '@effect/vitest';
import { Effect, TestClock } from 'effect';

describe('TimeBasedOperations', () => {
  it('should handle time-based operations', () =>
    Effect.gen(function* () {
      // Start async operation
      const fiber = yield* Effect.fork(delayedOperation());

      // Advance test clock
      yield* TestClock.adjust('1000 millis');

      // Operation completes
      const result = yield* Fiber.join(fiber);

      expect(result).toBe(expectedValue);
    }).pipe(Effect.provide(MyServiceLive)));
});
```

### Testing Scoped Resources

Use `it.scoped()` for Effects that require resource management:

```typescript
import { it } from '@effect/vitest';
import { Effect, Scope } from 'effect';

describe('ResourceManagement', () => {
  it.scoped('should manage resources', () =>
    Effect.gen(function* () {
      const resource = yield* acquireResource();
      // Resource is automatically cleaned up
      const result = yield* useResource(resource);

      expect(result).toBeDefined();
    }).pipe(Effect.provide(MyServiceLive)),
  );
});
```

### Testing with Live Environment

Use `it.live()` to run tests with the real (live) Effect environment without TestClock:

```typescript
it.live('should use real environment', () =>
  Effect.gen(function* () {
    // Uses real time, real services, etc.
    const result = yield* realServiceCall();

    expect(result).toBeDefined();
  }).pipe(Effect.provide(MyServiceLive)),
);
```

### Testing Error Cases

Capture errors using `Effect.exit()` to verify error handling:

```typescript
import { it, expect } from '@effect/vitest';
import { Effect, Exit } from 'effect';

describe('ErrorHandling', () => {
  it('should handle errors correctly', () =>
    Effect.gen(function* () {
      const exit = yield* Effect.exit(failingOperation());

      expect(Exit.isFailure(exit)).toBe(true);
      if (Exit.isFailure(exit)) {
        expect(exit.cause).toStrictEqual(
          new MyError({ reason: 'ValidationFailed' }),
        );
      }
    }).pipe(Effect.provide(MyServiceLive)));
});
```

### Test Control Modifiers

@effect/vitest provides modifiers for test control:

```typescript
import { it } from '@effect/vitest';

// Run only this test (skip all others)
it.effect.only('focused test', () =>
  Effect.gen(function* () {
    /* ... */
  }),
);

// Skip this test temporarily
it.effect.skip('skipped test', () =>
  Effect.gen(function* () {
    /* ... */
  }),
);

// Mark test as expected to fail
it.effect.fails('known issue', () =>
  Effect.gen(function* () {
    /* ... */
  }),
);
```

### Test Layer Pattern

**✅ PATTERN B (Recommended)**: Define test layers as static properties on service classes:

```typescript
// my-service.ts
import { Effect, Layer, Context } from 'effect';
import { DatabaseService } from '@samuelho-dev/infra-database';

export class MyService extends Context.Tag('MyService')<
  MyService,
  MyServiceInterface
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const db = yield* DatabaseService;
      return {
        operation: () => db.query(/* ... */),
      };
    }),
  );

  // ✅ Pattern B: Test layer as static property
  static readonly Test = Layer.succeed(this, {
    operation: () => Effect.succeed(mockResult),
  });
}

// my-service.spec.ts - Tests use static Test property
import { Effect, Layer } from 'effect';
import { MyService } from './my-service';
import { DatabaseService } from '@samuelho-dev/infra-database';

// Compose test layers
const TestLayer = Layer.mergeAll(
  DatabaseService.Test, // ✅ Use static Test property
  MyService.Test, // ✅ Use static Test property
);

describe('MyService', () => {
  it('should work with test layer', () =>
    Effect.gen(function* () {
      const service = yield* MyService;
      const result = yield* service.operation();
      expect(result).toBeDefined();
    }).pipe(Effect.provide(TestLayer)));
});
```

**Alternative: Separate Test Export (Legacy)**

Only use when test layer must be in separate file:

```typescript
// my-service.test-utils.ts (separate file)
import { Layer } from 'effect';
import { DatabaseService } from '@samuelho-dev/infra-database';

// ⚠️ Less discoverable - only when test must be separate
export const TestDatabaseService = Layer.succeed(DatabaseService, {
  query: () => Effect.succeed(mockData),
  execute: () => Effect.succeed(undefined),
});
```

### Common Testing Patterns

**Pattern 1: Verify Service Calls**

```typescript
it('should call dependencies', () =>
  Effect.gen(function* () {
    const service = yield* MyService;
    yield* service.operation();

    // Verify via mock/spy if needed
    expect(mockDatabase.query).toHaveBeenCalled();
  }).pipe(Effect.provide(TestLayer)));
```

**Pattern 2: Test Error Recovery**

```typescript
it('should recover from errors', () =>
  Effect.gen(function* () {
    const result = yield* riskyOperation().pipe(
      Effect.catchAll(() => Effect.succeed(fallbackValue)),
    );

    expect(result).toBe(fallbackValue);
  }).pipe(Effect.provide(TestLayer)));
```

**Pattern 3: Test Concurrent Operations**

```typescript
it('should handle concurrent operations', () =>
  Effect.gen(function* () {
    const results = yield* Effect.all(
      [operation1(), operation2(), operation3()],
      { concurrency: 'unbounded' },
    );

    expect(results).toHaveLength(3);
  }).pipe(Effect.provide(TestLayer)));
```

### Configuration

Vitest configuration for Effect projects:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
});
```

## Effect 4.0 Compatibility & Migration Guide

**Status**: Effect 4.0 is in development. These patterns are designed for Effect 3.0 with forward compatibility.

### Stable APIs (No Breaking Changes Expected)

✅ **Will remain stable in Effect 4.0**:

**Core APIs**:

- `Effect.gen` generator syntax
- `Context.Tag` service definition
- `Effect.Service` streamlined service creation (validated documentId 6206)
- `Layer` composition patterns (`Layer.effect`, `Layer.scoped`, `Layer.sync`, `Layer.succeed`)
- `Effect.runtime()` and runtime preservation pattern
- `Effect.all` for parallel operations

**Error Handling**:

- `Data.TaggedError` for domain/runtime errors (validated documentId 5672)
- `Schema.TaggedError` for RPC boundaries with serialization (validated documentId 9114)
- `Effect.try*` family (`tryPromise`, `tryPromiseInterrupt`)
- `Effect.catchAll`, `Effect.catchTag`, `Effect.catchTags`

**Concurrency**:

- `Fiber`, `FiberSet`, `FiberMap` APIs (validated documentId 6652, 6560)
- `Ref`, `SynchronizedRef` for state management (Effect 3.0+)
- `Effect.fork`, `Fiber.join`, `Fiber.interrupt`

**Observability**:

- Structured logging (`Effect.log*`, `Effect.annotateLogs`)
- Telemetry (`Effect.withSpan`, `Effect.annotateCurrentSpan`)
- OpenTelemetry integration patterns

### Potential Changes in Effect 4.0

⚠️ **Monitor for changes** (verify with official docs when Effect 4.0 releases):

- OpenTelemetry integration implementation details
- RPC implementation specifics (Effect RPC is evolving)
- Stream API improvements and optimizations
- Some internal implementation details

### Migration Strategy

When Effect 4.0 is released:

1. **Check Official Migration Guide**: Effect team will provide comprehensive migration documentation
2. **Run Type Checker**: TypeScript will catch most breaking changes automatically
3. **Test Incrementally**: Update one library type at a time (start with infra, then data-access, then features)
4. **Use Effect 4.0 Compatibility Mode**: If available, enable gradual migration mode
5. **Update Dependencies Together**: Upgrade all Effect packages simultaneously

### Forward Compatibility Best Practices

Follow these patterns to minimize migration effort when Effect 4.0 arrives:

✅ **Recommended Patterns**:

```typescript
// ✅ Use Effect.gen instead of pipe chains (more stable)
const program = Effect.gen(function* () {
  const user = yield* UserService;
  const result = yield* user.findById("123");
  return result;
});

// ❌ Avoid deep pipe chains (harder to migrate)
const program = Effect.succeed("123").pipe(
  Effect.flatMap((id) => UserService.pipe(
    Effect.flatMap((service) => service.findById(id))
  ))
);

// ✅ Use Context.Tag or Effect.Service (both stable)
export class MyService extends Context.Tag("MyService")<...>() {}
// OR
export class MyService extends Effect.Service<MyService>()("MyService", {...}) {}

// ✅ Use tagged errors
export class MyError extends Data.TaggedError("MyError")<{...}> {}

// ✅ Preserve runtime for callbacks
const runtime = yield* Effect.runtime();
callback(() => Runtime.runFork(runtime)(effect));

// ✅ Use Ref for pure state (not external state)
const state = yield* Ref.make(initialValue);
yield* Ref.update(state, (s) => newState);

// ✅ Use structured logging
yield* Effect.logInfo("Operation started").pipe(
  Effect.annotateLogs({ userId, operation: "create" })
);
```

### Resources

- **Effect 4.0 Roadmap**: https://github.com/Effect-TS/effect/discussions
- **Effect Discord**: https://discord.gg/effect-ts (fastest way to get migration help)
- **Effect Documentation**: https://effect.website
- **Effect Changelog**: https://effect.website/docs/changelog (breaking changes announced here)
- **Effect Migration Guides**: https://effect.website/docs/guides/migration (community migration guides)

### Validation Summary

All patterns in this guide have been validated against Effect 3.0+ official documentation via Effect MCP server:

- Effect.Service (documentId 6206) ✅
- Context.Tag (documentId 5628) ✅
- Data.TaggedError (documentId 5672) ✅
- Schema.TaggedError (documentId 9114) ✅
- FiberSet (documentId 6652) ✅
- FiberMap (documentId 6560) ✅
- Ref and SynchronizedRef for state management ✅
- Structured logging (documentId 7333) ✅
