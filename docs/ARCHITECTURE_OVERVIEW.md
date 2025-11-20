# Architecture Overview - Creative Toolkits Monorepo

> **📚 Related Documentation:**
> - [Effect Patterns Guide](./EFFECT_PATTERNS.md) - Effect.ts patterns and best practices
> - [Nx Standards](./NX_STANDARDS.md) - Naming conventions and workspace organization
> - [Contract Libraries](./contract.md) - Domain interfaces and ports
> - [Data-Access Libraries](./dataaccess.md) - Repository implementations
> - [Feature Libraries](./feature.md) - Business logic and services
> - [Infrastructure Libraries](./infra.md) - Cross-cutting concerns
> - [Provider Libraries](./provider.md) - External service adapters

## Quick Reference

This document provides a high-level overview of the library architecture, dependency relationships, and common integration patterns for the Creative Toolkits Nx monorepo.

## Library Type Reference

### Contract Libraries (`libs/contract/{domain}`)

**Purpose**: Define domain boundaries through interfaces, entities, and errors

**Naming**: `@creativetoolkits/contract-{domain}`

**Contains**:
- Domain entities (Product, User, Order)
- Repository interfaces (ports)
- Domain events
- Domain errors (Data.TaggedError)

**Dependencies**: `types-database`, `util-*`

**Used By**: data-access, feature

**Key Files**:
- `src/lib/entities.ts` - Domain entities
- `src/lib/ports.ts` - Repository interfaces
- `src/lib/errors.ts` - Domain errors
- `src/lib/events.ts` - Domain events

---

### Data-Access Libraries (`libs/data-access/{domain}`)

**Purpose**: Implement repository pattern with database operations

**Naming**: `@creativetoolkits/data-access-{domain}`

**Contains**:
- Repository implementations (fulfill contract ports)
- Database queries (Kysely)
- Data transformations
- Query builders

**Dependencies**:
- `contract-{domain}` (implements interfaces)
- `infra-database` (database service)
- `infra-cache` (optional caching)
- `provider-kysely` (query builder)
- `types-database` (database types)

**Used By**: feature

**Key Files**:
- `src/lib/server/repository.ts` - Repository implementation
- `src/lib/server/layers.ts` - Layer composition
- `src/lib/server/repository.spec.ts` - Tests with @effect/vitest

---

### Feature Libraries (`libs/feature/{name}`)

**Purpose**: Implement business logic and application features

**Naming**: `@creativetoolkits/feature-{name}`

**Contains**:
- Business logic services
- Use case orchestration
- Feature-specific RPC endpoints
- Business rules and validation

**Dependencies**:
- `data-access-{domain}` (repositories)
- `contract-{domain}` (domain interfaces)
- `infra-*` (logging, caching, etc.)
- `provider-*` (external services)

**Used By**: apps (web, api)

**Key Files**:
- `src/lib/server/service.ts` - Business logic service
- `src/lib/server/layers.ts` - Layer composition
- `src/lib/rpc/*.ts` - RPC endpoint definitions
- `src/lib/server/service.spec.ts` - Tests

---

### Infrastructure Libraries (`libs/infra/{concern}`)

**Purpose**: Provide cross-cutting concerns and resource management

**Naming**: `@creativetoolkits/infra-{concern}`

**Contains**:
- Resource management (database, cache, storage)
- Cross-cutting services (logging, telemetry)
- Platform-specific implementations (client/server/edge)

**Common Libraries**:
- `infra-database` - Database service with Kysely
- `infra-cache` - Caching with Redis
- `infra-storage` - File storage with Supabase
- `infra-logging` - Structured logging
- `infra-error-tracking` - Error tracking with Sentry
- `infra-webhooks` - Webhook handling

**Dependencies**:
- `provider-*` (external service adapters)
- `util-*` (utility functions)
- Other `infra-*` (cross-infra dependencies allowed)

**Used By**: data-access, feature, apps

**Key Files**:
- `src/lib/service/service.ts` - Service implementation
- `src/lib/service/interface.ts` - Service interface
- `src/lib/layers/server-layers.ts` - Server-side layers
- `src/lib/layers/client-layers.ts` - Client-side layers (if applicable)
- `src/lib/layers/edge-layers.ts` - Edge runtime layers (if applicable)

---

### Provider Libraries (`libs/provider/{service}`)

**Purpose**: Wrap external SDKs with consistent Effect interfaces

**Naming**: `@creativetoolkits/provider-{service}`

**Contains**:
- SDK adapters (Stripe, Supabase, Redis, etc.)
- Error transformation from SDK errors to Effect errors
- Type-safe API wrappers
- Mock factories for testing

**Common Libraries**:
- `provider-stripe` - Stripe payments
- `provider-supabase` - Supabase client
- `provider-kysely` - Kysely query builder
- `provider-redis` - Redis client
- `provider-sentry` - Sentry error tracking
- `provider-posthog` - PostHog analytics
- `provider-resend` - Resend email

**Dependencies**:
- `infra-logging` (for adapter logging)
- External SDKs (stripe, @supabase/supabase-js, etc.)
- `util-*` (utility functions)

**Used By**: infra, feature, data-access

**Key Files**:
- `src/lib/service.ts` - SDK adapter service
- `src/lib/interface.ts` - Service interface
- `src/lib/layers.ts` - Layer composition
- `src/lib/errors.ts` - Error transformations
- `src/__tests__/service.spec.ts` - Tests with mocks

---

## Library Dependency Flow

```
Apps (web, api)
    ↓
Feature Libraries (business logic)
    ↓
├─→ Data-Access Libraries (repositories)
│       ↓
│   Contract Libraries (interfaces)
│
├─→ Infrastructure Libraries (cross-cutting)
│       ↓
│   Provider Libraries (external SDKs)
│
└─→ Provider Libraries (external services)
```

## Module Boundary Rules (Enforced by Nx)

### Apps
- ✅ Can depend on: feature, ui, data-access, util, types, infra, provider
- ❌ Cannot depend on: contracts (use through data-access)

### Feature Libraries
- ✅ Can depend on: data-access, contract, ui, util, types, infra, provider
- ❌ Cannot depend on: apps, other features

### Data-Access Libraries
- ✅ Can depend on: contract, util, types, infra, provider
- ❌ Cannot depend on: apps, feature, ui, other data-access

### Infrastructure Libraries
- ✅ Can depend on: provider, util, types, other infra
- ❌ Cannot depend on: apps, feature, data-access, contract, ui

### Provider Libraries
- ✅ Can depend on: util, types, infra (for logging only)
- ❌ Cannot depend on: apps, feature, data-access, contract, ui, other providers

### Contract Libraries
- ✅ Can depend on: types, util, other contracts
- ❌ Cannot depend on: apps, feature, data-access, ui, infra, provider

### Types Libraries
- ✅ No dependencies (leaf nodes)
- ❌ Cannot depend on anything

---

## Common Integration Patterns

### Pattern 1: Feature Using Repository

```typescript
// Feature: Purchase Order Service
export class PurchaseOrderService extends Context.Tag("PurchaseOrderService")<
  PurchaseOrderService,
  {
    readonly createOrder: (params: CreateOrderParams) => Effect.Effect<Order, OrderError>
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      // Depend on repositories from data-access
      const productRepo = yield* ProductRepository;
      const orderRepo = yield* OrderRepository;

      // Depend on external services from providers
      const stripe = yield* StripeService;

      // Depend on infrastructure services
      const logger = yield* LoggingService;

      return {
        createOrder: (params) =>
          Effect.gen(function* () {
            // Business logic orchestration
            const product = yield* productRepo.findById(params.productId);
            const payment = yield* stripe.paymentIntents.create({...});
            const order = yield* orderRepo.create({...});
            yield* logger.info("Order created", { orderId: order.id });
            return order;
          }),
      };
    })
  );
}
```

### Pattern 2: Repository Implementation

```typescript
// Data-Access: Product Repository
export const ProductRepositoryLive = Layer.effect(
  ProductRepository, // Interface from contract-product
  Effect.gen(function* () {
    // Depend on infrastructure
    const database = yield* DatabaseService;
    const cache = yield* CacheService;

    return {
      findById: (id) =>
        Effect.gen(function* () {
          // Check cache first
          const cached = yield* cache.get<Product>(`product:${id}`);
          if (Option.isSome(cached)) return cached;

          // Query database
          const result = yield* database.query((db) =>
            db
              .selectFrom("products")
              .where("id", "=", id)
              .selectAll()
              .executeTakeFirst()
          );

          // Cache and return
          if (result) {
            yield* cache.set(`product:${id}`, result, "1 hour");
            return Option.some(result);
          }
          return Option.none();
        }),
    };
  })
);
```

### Pattern 3: Infrastructure Service

```typescript
// Infrastructure: Cache Service
export class CacheService extends Context.Tag("CacheService")<
  CacheService,
  {
    readonly get: <A>(key: string) => Effect.Effect<Option.Option<A>, CacheError>;
    readonly set: <A>(key: string, value: A, ttl?: string) => Effect.Effect<void, CacheError>;
  }
>() {
  static readonly Live = Layer.scoped(
    this,
    Effect.gen(function* () {
      // Depend on provider
      const redis = yield* RedisService;
      const logger = yield* LoggingService;

      // Register cleanup
      yield* Effect.addFinalizer(() =>
        Effect.gen(function* () {
          yield* logger.info("Closing cache connections");
          yield* redis.quit();
        })
      );

      return {
        get: (key) =>
          Effect.gen(function* () {
            const value = yield* redis.get(key);
            return value ? Option.some(JSON.parse(value)) : Option.none();
          }),
        set: (key, value, ttl) =>
          Effect.gen(function* () {
            const serialized = JSON.stringify(value);
            yield* redis.set(key, serialized, ttl);
          }),
      };
    })
  );
}
```

### Pattern 4: Provider Adapter

```typescript
// Provider: Stripe Service
export class StripeService extends Context.Tag("StripeService")<
  StripeService,
  {
    readonly paymentIntents: {
      readonly create: (params: CreatePaymentIntentParams) => Effect.Effect<PaymentIntent, StripeError>;
    };
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const config = yield* StripeConfig;
      const logger = yield* LoggingService;

      // Initialize SDK
      const stripe = new Stripe(config.apiKey, { apiVersion: "2024-11-20.acacia" });

      return {
        paymentIntents: {
          create: (params) =>
            Effect.gen(function* () {
              yield* logger.debug("Creating payment intent", { params });

              // Transform SDK errors to Effect errors
              const result = yield* Effect.tryPromise({
                try: () => stripe.paymentIntents.create(params),
                catch: (error) => new StripeError({ cause: error }),
              });

              return result;
            }),
        },
      };
    })
  );
}
```

---

## Layer Composition Strategies

### Strategy 1: Application-Level Composition (Recommended)

Compose all layers at the application entry point:

```typescript
// apps/api/src/main.ts
import { Layer } from "effect";
import { ProductRepositoryLive } from "@creativetoolkits/data-access-product";
import { ProductServiceLive } from "@creativetoolkits/feature-product";
import { DatabaseServiceLive } from "@creativetoolkits/infra-database";
import { CacheServiceLive } from "@creativetoolkits/infra-cache";
import { StripeServiceLive } from "@creativetoolkits/provider-stripe";

// Compose all dependencies in one place
const AppLayer = Layer.mergeAll(
  // Infrastructure foundation
  DatabaseServiceLive,
  CacheServiceLive,

  // External providers
  StripeServiceLive,

  // Data access
  ProductRepositoryLive,

  // Features
  ProductServiceLive
);

// Provide to your application
const program = Effect.gen(function* () {
  const productService = yield* ProductService;
  // ... use services
});

Effect.runPromise(program.pipe(Effect.provide(AppLayer)));
```

### Strategy 2: Library-Level Pre-Wiring

Each library provides its own layer with dependencies:

```typescript
// libs/feature/product/src/lib/server/layers.ts
export const ProductFeatureLayer = ProductServiceLive.pipe(
  Layer.provide(ProductRepositoryLive),
  Layer.provide(StripeServiceLive)
);

// Apps just need to provide infrastructure
const AppLayer = Layer.mergeAll(
  DatabaseServiceLive,
  CacheServiceLive,
  ProductFeatureLayer // Pre-wired
);
```

---

## Testing Patterns

### Repository Testing (with @effect/vitest)

```typescript
import { it } from "@effect/vitest";
import { Effect, Layer, Option } from "effect";
import { ProductRepository } from "@creativetoolkits/contract-product";
import { ProductRepositoryLive } from "../repository";

// Mock infrastructure dependencies
const MockDatabaseLayer = Layer.succeed(DatabaseService, {
  query: () => Effect.succeed({ id: "test", name: "Test Product" })
});

it.scoped("findById returns product", () =>
  Effect.gen(function* () {
    const repo = yield* ProductRepository;
    const result = yield* repo.findById("test");

    expect(Option.isSome(result)).toBe(true);
  }).pipe(
    Effect.provide(ProductRepositoryLive),
    Effect.provide(MockDatabaseLayer)
  )
);
```

### Service Testing (with mocked dependencies)

```typescript
import { it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { ProductService } from "../service";

const MockProductRepository = Layer.succeed(ProductRepository, {
  findById: () => Effect.succeed(Option.some(mockProduct))
});

it.scoped("createOrder validates product", () =>
  Effect.gen(function* () {
    const service = yield* ProductService;
    const result = yield* service.createOrder({ productId: "test" });

    expect(result.productId).toBe("test");
  }).pipe(
    Effect.provide(ProductServiceLive),
    Effect.provide(MockProductRepository)
  )
);
```

---

## TypeScript Project References

All libraries use TypeScript composite projects for incremental compilation:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "composite": true,
    "outDir": "../../dist/out-tsc",
    "tsBuildInfoFile": "../../.tsbuildinfo/data-access-product.tsbuildinfo"
  },
  "references": [
    { "path": "../contract-product" },
    { "path": "../infra-database" },
    { "path": "../infra-cache" },
    { "path": "../types-database" }
  ]
}
```

**Benefits**:
- ✅ Incremental compilation (only rebuild what changed)
- ✅ Enforced dependency graph
- ✅ Faster CI builds with Nx
- ✅ Better IDE performance

---

## Quick Decision Tree

### "Which library type should I create?"

1. **Defining domain interfaces?** → `contract-{domain}`
2. **Implementing database operations?** → `data-access-{domain}`
3. **Implementing business logic?** → `feature-{name}`
4. **Wrapping an external SDK?** → `provider-{service}`
5. **Cross-cutting concern (logging, caching)?** → `infra-{concern}`
6. **Shared types?** → `types-{category}`
7. **Utility functions?** → `util-{category}`

### "Where does this code belong?"

1. **Repository interface?** → `contract-{domain}/src/lib/ports.ts`
2. **Repository implementation?** → `data-access-{domain}/src/lib/server/repository.ts`
3. **Business logic?** → `feature-{name}/src/lib/server/service.ts`
4. **SDK adapter?** → `provider-{service}/src/lib/service.ts`
5. **Database service?** → `infra-database/src/lib/service/service.ts`

---

## Library Inventory

### Contract Libraries
- `contract-product` - Product domain interfaces
- `contract-seller` - Seller domain interfaces
- `contract-user` - User domain interfaces
- `contract-payment` - Payment domain interfaces
- `contract-messaging` - Messaging domain interfaces
- `contract-common` - Shared domain interfaces

### Data-Access Libraries
- `data-access-product` - Product repository
- `data-access-seller` - Seller repository
- `data-access-user` - User repository

### Feature Libraries
- `feature-advertising` - Ad auction and targeting
- `feature-analytics` - Analytics and metrics
- `feature-auth` - Authentication
- `feature-cohorts` - User cohorts
- `feature-email` - Email campaigns
- `feature-form` - Form management
- `feature-marketplace` - Marketplace orchestration
- `feature-search` - Search with Typesense

### Infrastructure Libraries
- `infra-cache` - Caching with Redis
- `infra-database` - Database service with Kysely
- `infra-error-tracking` - Error tracking with Sentry
- `infra-logging` - Structured logging
- `infra-messaging` - Message queue
- `infra-rpc` - RPC framework
- `infra-storage` - File storage with Supabase
- `infra-webhooks` - Webhook handling

### Provider Libraries
- `provider-cloudamqp` - CloudAMQP client
- `provider-kysely` - Kysely query builder
- `provider-posthog` - PostHog analytics
- `provider-redis` - Redis client
- `provider-resend` - Resend email
- `provider-sentry` - Sentry error tracking
- `provider-stripe` - Stripe payments
- `provider-supabase` - Supabase client

---

## Pre-Wiring Configuration

### Contract Libraries
**Auto-wired dependencies**:
- `types-database` (for database-backed entities)
- `util-common` (for utility functions)

**Auto-generated files**:
- `src/lib/entities.ts` - Domain entities
- `src/lib/ports.ts` - Repository interfaces
- `src/lib/errors.ts` - Domain errors
- `src/lib/events.ts` - Domain events

### Data-Access Libraries
**Auto-wired dependencies**:
- `contract-{domain}` (implements interfaces)
- `infra-database` (database service)
- `provider-kysely` (query builder)
- `types-database` (database types)

**Auto-generated files**:
- `src/lib/server/repository.ts` - Repository implementation
- `src/lib/server/layers.ts` - Layer composition
- `src/lib/server/repository.spec.ts` - Tests

### Feature Libraries
**Auto-wired dependencies**:
- `data-access-{relevant-domains}` (repositories)
- `infra-logging` (logging service)
- `infra-rpc` (RPC framework)

**Auto-generated files**:
- `src/lib/server/service.ts` - Business logic service
- `src/lib/server/layers.ts` - Layer composition
- `src/lib/rpc/{name}-rpc.ts` - RPC endpoints
- `src/lib/server/service.spec.ts` - Tests

### Infrastructure Libraries
**Auto-wired dependencies**:
- `util-common` (utility functions)
- `infra-logging` (for service logging)

**Auto-generated files**:
- `src/lib/service/service.ts` - Service implementation
- `src/lib/service/interface.ts` - Service interface
- `src/lib/layers/server-layers.ts` - Server layers
- `src/lib/service/service.spec.ts` - Tests

### Provider Libraries
**Auto-wired dependencies**:
- `infra-logging` (for adapter logging)
- External SDK package (Stripe, AWS, etc.)

**Auto-generated files**:
- `src/lib/service.ts` - SDK adapter
- `src/lib/interface.ts` - Service interface
- `src/lib/layers.ts` - Layer composition
- `src/lib/errors.ts` - Error transformations
- `src/__tests__/service.spec.ts` - Tests with mocks
- `src/__tests__/test-layer.ts` - Test utilities

---

## Common Pitfalls

### ❌ Don't: Implement repositories in providers
```typescript
// WRONG: provider-supabase implementing ProductRepository
export const ProductRepositoryLive = Layer.effect(/* ... */);
```

### ✅ Do: Implement repositories in data-access
```typescript
// CORRECT: data-access-product implementing ProductRepository
export const ProductRepositoryLive = Layer.effect(/* ... */);
```

---

### ❌ Don't: Put business logic in data-access
```typescript
// WRONG: Pricing logic in repository
findById: (id) => {
  const product = /* query */;
  const discountedPrice = product.price * 0.9; // ❌ Business logic
  return { ...product, price: discountedPrice };
}
```

### ✅ Do: Keep data-access focused on queries
```typescript
// CORRECT: Just query and return
findById: (id) => {
  const product = /* query */;
  return Option.some(product); // ✅ Pure data access
}
```

---

### ❌ Don't: Create circular dependencies
```typescript
// WRONG: feature-product depends on feature-order which depends on feature-product
```

### ✅ Do: Extract shared logic to a new library
```typescript
// CORRECT: Create feature-shared or data-access-shared
```

---

## Resources

- [Effect.ts Documentation](https://effect.website/)
- [Nx Documentation](https://nx.dev/)
- [Kysely Documentation](https://kysely.dev/)
- [Vitest Documentation](https://vitest.dev/)
- [TypeScript Project References](https://www.typescriptlang.org/docs/handbook/project-references.html)
