# Monorepo Library Generator - Practical Examples

This guide provides end-to-end examples for using the monorepo library generator to build production-ready libraries with Effect-TS patterns.

> **📚 Related Documentation:**
> - [Main README](../README.md) - Installation and CLI options
> - [Architecture Overview](./ARCHITECTURE_OVERVIEW.md) - Library types and patterns
> - [Effect Patterns](./EFFECT_PATTERNS.md) - Effect-TS best practices
> - [Export Patterns](./EXPORT_PATTERNS.md) - Platform-aware exports

## Table of Contents

1. [Building a Complete Feature](#building-a-complete-feature)
2. [Platform-Specific Examples](#platform-specific-examples)
3. [Testing Patterns](#testing-patterns)
4. [Layer Composition](#layer-composition)
5. [Workspace Setup](#workspace-setup)

---

## 🎯 Quick Reference: Standard Layer Pattern

**All generated libraries follow the same 4-layer pattern:**

```typescript
// Every library provides these four layers:
import {
  ProductRepositoryLive,  // Production
  ProductRepositoryTest,  // Testing (mocks)
  ProductRepositoryDev,   // Development (with logging)
  ProductRepositoryAuto   // Auto-selects based on NODE_ENV
} from '@workspace-scope/data-access-product/server';

// Usage in your application:
const program = Effect.gen(function* () {
  const repo = yield* ProductRepository;
  const product = yield* repo.findById("123");
}).pipe(
  Effect.provide(ProductRepositoryAuto) // Automatically selects layer
);
```

**Layer Selection:**
- `NODE_ENV=test` → Uses Test layer (in-memory mocks)
- `NODE_ENV=development` → Uses Dev layer (with console logging)
- `NODE_ENV=production` → Uses Live layer (real implementation)

---

## Building a Complete Feature

This example shows how to build a complete "Product Management" feature from scratch using all library types.

### Step 1: Generate Contract Library

Define the domain boundary with interfaces and types:

```bash
npx monorepo-library-generator contract product \
  --description "Product domain contracts" \
  --tags "domain:product,layer:contract"
```

**Generated structure:**
```
libs/contract/product/
├── src/
│   ├── index.ts              # Barrel exports
│   └── lib/
│       ├── entities.ts       # Product entity
│       ├── ports.ts          # ProductRepository interface
│       ├── errors.ts         # Domain errors
│       └── events.ts         # Domain events
├── package.json
└── tsconfig.json
```

**Key file: `src/lib/ports.ts`**
```typescript
import { Context, Effect } from "effect";
import type { Product, ProductInsert, ProductUpdate } from "./entities";
import type { ProductError } from "./errors";

export class ProductRepository extends Context.Tag("ProductRepository")<
  ProductRepository,
  {
    readonly findById: (id: string) => Effect.Effect<Product | null, ProductError>;
    readonly create: (data: ProductInsert) => Effect.Effect<Product, ProductError>;
    readonly update: (id: string, data: ProductUpdate) => Effect.Effect<Product, ProductError>;
    readonly delete: (id: string) => Effect.Effect<void, ProductError>;
  }
>() {}
```

---

### Step 2: Generate Data-Access Library

Implement the repository pattern with database operations:

```bash
npx monorepo-library-generator data-access product \
  --description "Product repository implementation" \
  --tags "domain:product,layer:data-access"
```

**Generated structure:**
```
libs/data-access/product/
├── src/
│   ├── index.ts
│   └── lib/
│       ├── repository.ts     # ProductRepository implementation
│       ├── layers.ts         # Live, Test layers
│       ├── queries.ts        # Kysely query builders
│       └── repository.spec.ts
└── package.json
```

**Key file: `src/lib/repository.ts`**
```typescript
import { Effect, Layer } from "effect";
import { ProductRepository } from "@workspace-scope/contract-product";
import { DatabaseService } from "@workspace-scope/infra-database";

export const ProductRepositoryLive = Layer.effect(
  ProductRepository,
  Effect.gen(function* () {
    const db = yield* DatabaseService;

    return {
      findById: (id) =>
        Effect.gen(function* () {
          const result = yield* db.query((kysely) =>
            kysely
              .selectFrom("products")
              .where("id", "=", id)
              .selectAll()
              .executeTakeFirst()
          );

          return result ?? null;
        }),

      create: (data) =>
        db.query((kysely) =>
          kysely
            .insertInto("products")
            .values(data)
            .returningAll()
            .executeTakeFirstOrThrow()
        ),

      // ... update, delete implementations
    };
  })
);
```

---

### Step 3: Generate Feature Library

Implement business logic that orchestrates repositories:

```bash
npx monorepo-library-generator feature product \
  --description "Product feature service" \
  --tags "domain:product,layer:feature"
```

**Generated structure:**
```
libs/feature/product/
├── src/
│   ├── index.ts              # Universal types
│   ├── server.ts             # Server exports
│   ├── client.ts             # Browser exports
│   └── lib/
│       ├── server/
│       │   ├── service.ts    # ProductService
│       │   ├── layers.ts     # Layer composition
│       │   └── service.spec.ts
│       └── shared/
│           ├── types.ts
│           └── errors.ts
└── package.json
```

**Key file: `src/lib/server/service.ts`**
```typescript
import { Context, Effect } from "effect";
import { ProductRepository } from "@workspace-scope/contract-product";
import type { ProductServiceError } from "../shared/errors";

export class ProductService extends Context.Tag("ProductService")<
  ProductService,
  {
    readonly getProductById: (id: string) => Effect.Effect<Product, ProductServiceError>;
    readonly createProduct: (data: CreateProductInput) => Effect.Effect<Product, ProductServiceError>;
  }
>() {
  static readonly Live = Layer.effect(
    this,
    Effect.gen(function* () {
      const productRepo = yield* ProductRepository;
      const logger = yield* LoggingService;

      return {
        getProductById: (id) =>
          Effect.gen(function* () {
            yield* logger.info("Fetching product", { id });

            const product = yield* productRepo.findById(id);
            if (!product) {
              return yield* Effect.fail(new ProductNotFoundError({ id }));
            }

            return product;
          }),

        createProduct: (data) =>
          Effect.gen(function* () {
            yield* logger.info("Creating product", { data });
            return yield* productRepo.create(data);
          })
      };
    })
  );
}
```

---

### Step 4: Generate Provider Library (External Service)

Wrap an external SDK (e.g., Stripe for payments):

```bash
npx monorepo-library-generator provider stripe \
  --externalService "Stripe payments SDK" \
  --platform node \
  --description "Stripe payment provider" \
  --tags "type:provider,service:payment"
```

**Generated structure:**
```
libs/provider/stripe/
├── src/
│   ├── index.ts
│   ├── server.ts             # Node.js exports
│   └── lib/
│       ├── service.ts        # StripeService
│       ├── layers.ts         # Live, Test, Dev layers
│       ├── types.ts
│       ├── errors.ts
│       └── validation.ts
└── package.json
```

**Key file: `src/lib/layers.ts`**
```typescript
import { Effect, Layer } from "effect";
import { StripeService, createStripeClient } from "./service";
import { env } from "@workspace-scope/infra-env";

export const StripeServiceLive = Layer.scoped(
  StripeService,
  Effect.gen(function* () {
    const config = {
      apiKey: env.STRIPE_API_KEY,
      timeout: env.STRIPE_TIMEOUT || 20000,
    };

    const client = createStripeClient(config);

    // Register cleanup for resource management
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        console.log("[StripeService] Cleaning up client resources");
        // Add SDK cleanup if available (e.g., client.close())
      })
    );

    return StripeService.make(client, config);
  })
);
```

---

### Step 5: Generate Infrastructure Library

Create cross-cutting services like caching:

```bash
npx monorepo-library-generator infra cache \
  --description "Caching service with Redis" \
  --tags "layer:infra,type:cache"
```

**Generated structure:**
```
libs/infra/cache/
├── src/
│   ├── index.ts
│   ├── server.ts
│   └── lib/
│       ├── service/
│       │   ├── service.ts    # CacheService
│       │   ├── interface.ts
│       │   └── errors.ts
│       └── layers/
│           ├── server-layers.ts
│           └── client-layers.ts
└── package.json
```

---

## Platform-Specific Examples

### Example 1: Universal Provider with Platform Exports

Generate a provider that works in multiple environments:

```bash
npx monorepo-library-generator provider supabase \
  --platform universal \
  --externalService "Supabase database and auth" \
  --description "Supabase provider with browser and server support"
```

**Usage:**

```typescript
// Server-side (Node.js)
import { SupabaseService } from "@workspace-scope/provider-supabase/server";

const serverLayer = SupabaseService.Live;

// Client-side (Browser)
import { SupabaseService } from "@workspace-scope/provider-supabase/client";

const clientLayer = SupabaseService.Live;

// Edge runtime (Cloudflare Workers)
import { SupabaseService } from "@workspace-scope/provider-supabase/edge";

const edgeLayer = SupabaseService.Live;
```

---

### Example 2: Server-Only Data Access

Data-access libraries are always server-only:

```bash
npx monorepo-library-generator data-access user \
  --description "User repository implementation"
```

**Usage:**

```typescript
// ✅ CORRECT - Import in server code
import { UserRepository } from "@workspace-scope/data-access-user";

// ❌ WRONG - Cannot import in browser
// This will fail tree-shaking and include server code in client bundle
```

---

### Example 3: Feature with Client Hooks

Features can export both server services and client hooks:

```bash
npx monorepo-library-generator feature auth \
  --includeClientServer \
  --description "Authentication feature with hooks"
```

**Server usage:**

```typescript
// apps/api/src/main.ts
import { AuthService } from "@workspace-scope/feature-auth/server";

const AppLayer = Layer.mergeAll(
  DatabaseServiceLive,
  UserRepositoryLive,
  AuthService.Live
);
```

**Client usage:**

```typescript
// apps/web/src/components/LoginForm.tsx
import { useAuth } from "@workspace-scope/feature-auth/client";

export function LoginForm() {
  const { login, isLoading } = useAuth();

  // ... component logic
}
```

---

## Testing Patterns

### Example 1: Testing a Repository

```typescript
// libs/data-access/product/src/lib/repository.spec.ts
import { it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { ProductRepository } from "@workspace-scope/contract-product";
import { ProductRepositoryLive } from "./repository";
import { DatabaseService } from "@workspace-scope/infra-database";

// Mock database layer
const MockDatabaseLayer = Layer.succeed(DatabaseService, {
  query: (fn) => Effect.succeed({
    id: "test-product",
    name: "Test Product",
    price: 999
  })
});

it.scoped("findById returns product when found", () =>
  Effect.gen(function* () {
    const repo = yield* ProductRepository;
    const result = yield* repo.findById("test-product");

    expect(result).toBeDefined();
    expect(result?.name).toBe("Test Product");
  }).pipe(
    Effect.provide(ProductRepositoryLive),
    Effect.provide(MockDatabaseLayer)
  )
);
```

---

### Example 2: Testing a Service with Mocks

```typescript
// libs/feature/product/src/lib/server/service.spec.ts
import { it } from "@effect/vitest";
import { Effect, Layer } from "effect";
import { ProductService } from "./service";
import { ProductRepository } from "@workspace-scope/contract-product";

// Use the Test layer from the service
it.scoped("createProduct validates and saves", () =>
  Effect.gen(function* () {
    const service = yield* ProductService;
    const result = yield* service.createProduct({
      name: "New Product",
      price: 1999
    });

    expect(result.id).toBeDefined();
    expect(result.name).toBe("New Product");
  }).pipe(
    Effect.provide(ProductService.Test), // Uses built-in test layer
  )
);
```

---

## Layer Composition

### Example 1: Application-Level Composition

Compose all layers at the app entry point:

```typescript
// apps/api/src/main.ts
import { Effect, Layer } from "effect";
import { ProductService } from "@workspace-scope/feature-product/server";
import { ProductRepositoryLive } from "@workspace-scope/data-access-product";
import { DatabaseServiceLive } from "@workspace-scope/infra-database";
import { CacheServiceLive } from "@workspace-scope/infra-cache";
import { StripeServiceLive } from "@workspace-scope/provider-stripe/server";

// Compose all dependencies
const AppLayer = Layer.mergeAll(
  // Infrastructure foundation
  DatabaseServiceLive,
  CacheServiceLive,

  // External providers
  StripeServiceLive,

  // Data access
  ProductRepositoryLive,

  // Features
  ProductService.Live
);

// Run your program
const program = Effect.gen(function* () {
  const productService = yield* ProductService;
  const product = yield* productService.getProductById("123");
  console.log("Product:", product);
});

Effect.runPromise(program.pipe(Effect.provide(AppLayer)));
```

---

### Example 2: Environment-Aware Composition

Use Auto layers for automatic environment selection:

```typescript
// apps/api/src/main.ts
import { Layer } from "effect";
import { ProductService } from "@workspace-scope/feature-product/server";
import { ProductRepositoryAuto } from "@workspace-scope/data-access-product";
import { DatabaseServiceAuto } from "@workspace-scope/infra-database";

// Auto layers select based on NODE_ENV
const AppLayer = Layer.mergeAll(
  DatabaseServiceAuto,  // Live in prod, Test in test env
  ProductRepositoryAuto,
  ProductService.Auto
);
```

---

## Workspace Setup

### Example 1: Setting Up a New Monorepo

```bash
# 1. Create workspace
mkdir my-monorepo && cd my-monorepo
pnpm init

# 2. Set up workspace config
echo 'packages:
  - "libs/**"
  - "apps/**"' > pnpm-workspace.yaml

# 3. Update root package.json
npm pkg set name="@my-company/root"

# 4. Install generator
pnpm add -D @your-scope/monorepo-library-generator

# 5. Generate your first library
npx monorepo-library-generator contract user \
  --description "User domain contracts"

# The generator automatically detects @my-company scope from package.json
```

---

### Example 2: Nx Workspace Integration

```bash
# 1. Create Nx workspace
npx create-nx-workspace my-monorepo --preset=empty

# 2. Install generator
pnpm add -D @your-scope/monorepo-library-generator

# 3. Generate using Nx
nx g @your-scope/monorepo-library-generator:contract user

# 4. Or use standalone CLI
npx monorepo-library-generator contract user
```

---

## Real-World Scenario

### Building an E-Commerce Product Catalog

Complete example showing all library types working together:

```bash
# 1. Domain contracts
npx monorepo-library-generator contract product \
  --description "Product catalog domain"

# 2. Database layer
npx monorepo-library-generator data-access product \
  --description "Product repository with Kysely"

# 3. Business logic
npx monorepo-library-generator feature product \
  --includeClientServer \
  --description "Product management service"

# 4. External payment integration
npx monorepo-library-generator provider stripe \
  --platform node \
  --externalService "Stripe SDK" \
  --description "Payment processing"

# 5. Infrastructure services
npx monorepo-library-generator infra cache \
  --description "Redis caching layer"

npx monorepo-library-generator infra database \
  --description "PostgreSQL database service"
```

**Application code:**

```typescript
// apps/api/src/routes/products.ts
import { Effect } from "effect";
import { ProductService } from "@workspace-scope/feature-product/server";
import { StripeService } from "@workspace-scope/provider-stripe/server";

export const createProductRoute = (req, res) => {
  const program = Effect.gen(function* () {
    const productService = yield* ProductService;
    const stripe = yield* StripeService;

    // Create product
    const product = yield* productService.createProduct({
      name: req.body.name,
      price: req.body.price
    });

    // Create Stripe price
    const stripePrice = yield* stripe.prices.create({
      product: product.id,
      unit_amount: product.price
    });

    return { product, stripePrice };
  });

  Effect.runPromise(
    program.pipe(Effect.provide(AppLayer))
  ).then(
    (result) => res.json(result),
    (error) => res.status(500).json({ error })
  );
};
```

---

## Quick Reference

### Common Commands

```bash
# Contract library
npx monorepo-library-generator contract {domain}

# Data access library
npx monorepo-library-generator data-access {domain}

# Feature library with client support
npx monorepo-library-generator feature {name} --includeClientServer

# Provider library with platform exports
npx monorepo-library-generator provider {service} --platform universal

# Infrastructure library
npx monorepo-library-generator infra {concern}
```

### Layer Usage Patterns

```typescript
// ✅ Static layer members (Effect 3.0+)
import { ProductService } from "@workspace-scope/feature-product/server";
const layer = ProductService.Live;

// ✅ Test layer
const testLayer = ProductService.Test;

// ✅ Auto layer (environment-aware)
const autoLayer = ProductService.Auto;
```

---

## See Also

- [Architecture Overview](./ARCHITECTURE_OVERVIEW.md) - Complete architecture patterns
- [Effect Patterns](./EFFECT_PATTERNS.md) - Effect-TS deep dive
- [Export Patterns](./EXPORT_PATTERNS.md) - Platform export conventions
- [Library-Specific Docs](./README.md) - Detailed docs for each library type
