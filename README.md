# Effect.ts Library Generator

A **dual-mode Nx plugin** for generating standardized, scalable Effect.ts libraries. Supports both Nx workspaces and Effect-native monorepos with full type safety, layer-based dependency injection, and platform-aware code generation.

## 🎯 Design Philosophy

This generator enforces four architectural principles:

1. **Contract-First Architecture** - Domain contracts define interfaces before implementations
2. **Layered Composition** - Effect's Layer system provides declarative dependency injection
3. **Platform-Aware Modularity** - Separate entry points (server/client/edge) optimize bundle sizes
4. **Type-Driven Development** - Effect Schema enforces compile-time and runtime type safety

## ✨ Features

- **5 Library Types**: contract, data-access, feature, infra, provider
- **Dual Workspace Support**: Automatic detection of Nx vs Effect-native monorepos
- **Platform-Specific Exports**: Generates index.ts, server.ts, client.ts, edge.ts as needed
- **Effect.ts Patterns**: Built-in generators for Context.Tag, Layer, Data.TaggedError, Schema.Struct
- **Type-Safe Templates**: Programmatic TypeScript code generation (no EJS templates)
- **Contract Validation**: Data-access generator validates contract library exists first
- **Full Testing Setup**: Vitest configuration with @effect/vitest integration

## 📦 Installation

```bash
# Install as a dev dependency in your workspace
pnpm add -D @tools/workspace-plugin

# Or use with npx (no installation required)
npx @tools/workspace-plugin
```

## 🚀 Quick Start

### Generate a Contract Library

Define domain types, errors, and service interfaces:

```bash
pnpm exec nx g @tools/workspace-plugin:contract user
```

**Generated structure:**
```
libs/contract/user/
├── src/
│   ├── lib/
│   │   ├── entities.ts     # Effect Schema entities
│   │   ├── errors.ts       # Data.TaggedError definitions
│   │   ├── ports.ts        # Context.Tag service interfaces
│   │   └── events.ts       # Domain events
│   └── index.ts            # Barrel exports
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

### Generate a Data-Access Library

Implement repository pattern with database access:

```bash
pnpm exec nx g @tools/workspace-plugin:data-access user
```

**Key features:**
- Validates contract library exists (Contract-First Architecture)
- Generates repository implementation with Context.Tag
- Creates Effect layers for dependency injection
- Includes test files with Vitest + @effect/vitest

### Generate a Feature Library

Orchestrate business logic across multiple services:

```bash
pnpm exec nx g @tools/workspace-plugin:feature payment --platform=universal --includeRPC
```

**Options:**
- `--platform` - Target runtime (node, universal, browser, edge)
- `--includeRPC` - Add @effect/rpc router and handlers
- `--includeCQRS` - Generate CQRS commands/queries/projections
- `--includeClientServer` - Generate separate client.ts and server.ts exports

### Generate an Infrastructure Library

Create shared infrastructure services (cache, logging, metrics):

```bash
pnpm exec nx g @tools/workspace-plugin:infra cache --includeClientServer
```

**Common use cases:**
- CacheService (Redis, in-memory, localStorage)
- LoggingService (structured logging)
- MetricsService (Prometheus, StatsD)
- StorageService (S3, filesystem, browser storage)

### Generate a Provider Library

Wrap external SDKs with Effect-based APIs:

```bash
pnpm exec nx g @tools/workspace-plugin:provider stripe --externalService="Stripe API" --platform=node
```

**Features:**
- Converts promise-based SDKs to Effect APIs
- Includes health checks, circuit breakers, retry logic
- Scoped layers for resource management (connection pooling)
- Type-safe configuration with Effect Schema

## 🏗️ Architecture Overview

### Library Types and Dependency Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  feature/* (Orchestrates business logic)               │ │
│  │  - Composes data-access + infra services               │ │
│  │  - Optional: RPC endpoints, React hooks                │ │
│  └────────────────────────────────────────────────────────┘ │
└──────────────────────────┬──────────────────────────────────┘
                           │ depends on
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌────────────────┐
│ data-access/* │  │    infra/*    │  │   provider/*   │
│ (Persistence) │  │(Infrastructure)│  │(External SDKs) │
│               │  │                │  │                │
│ - Repository  │  │ - Cache        │  │ - Stripe       │
│ - Queries     │  │ - Logging      │  │ - Redis        │
│ - Layers      │  │ - Metrics      │  │ - Postgres     │
└───────┬───────┘  └────────────────┘  └────────┬───────┘
        │                                        │
        └──────────────┐               ┌────────┘
                       │ depends on    │
                       ▼               ▼
              ┌─────────────────────────┐
              │      contract/*         │
              │  (Domain Definitions)   │
              │                         │
              │  - Entities (Schema)    │
              │  - Errors (TaggedError) │
              │  - Ports (Context.Tag)  │
              │  - Events, Commands     │
              └─────────────────────────┘
```

### Platform Matrix

| Library Type  | index.ts | server.ts | client.ts | edge.ts | Rationale |
|---------------|----------|-----------|-----------|---------|-----------|
| **contract**  | ✅ Types | ❌        | ❌        | ❌      | Platform-agnostic type definitions only |
| **data-access**| ✅ All  | ❌        | ❌        | ❌      | Server-only but single entry point |
| **feature**   | ✅ Core  | Optional  | Optional  | Optional| Configurable platform splits |
| **infra**     | ✅ Core  | Optional  | Optional  | Optional| Multi-platform infrastructure |
| **provider**  | ✅ Core  | Optional  | Optional  | Optional| Platform-specific SDK wrappers |

## 📖 Detailed Documentation

### Contract Library

**Purpose**: Define domain boundaries with type-safe contracts.

**When to use**:
- Starting a new domain (User, Product, Order)
- Defining service interfaces before implementation
- Creating shared types across implementations

**Generated files**:
- `entities.ts` - Effect Schema entity definitions
- `errors.ts` - Domain errors using Data.TaggedError
- `ports.ts` - Service interfaces using Context.Tag
- `events.ts` - Domain events for event sourcing

**Example**:
```typescript
// entities.ts
export const User = Schema.Struct({
  id: Schema.String.pipe(Schema.uuid()),
  email: Schema.String.pipe(Schema.pattern(/^[^@]+@[^@]+\.[^@]+$/)),
  createdAt: Schema.Date
})
export type User = Schema.Schema.Type<typeof User>

// errors.ts
export class UserNotFoundError extends Data.TaggedError("UserNotFoundError")<{
  readonly userId: string
}> {}

// ports.ts
export class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  {
    readonly findById: (id: string) => Effect.Effect<User, UserNotFoundError>
  }
>() {}
```

**Best practices**:
- Keep contracts platform-agnostic (no Node.js or browser APIs)
- Use Effect Schema for runtime validation
- Document domain invariants in JSDoc comments
- Version contracts carefully (breaking changes affect all implementations)

### Data-Access Library

**Purpose**: Implement repository pattern for type-safe database access.

**When to use**:
- Implementing persistence for a contract
- Creating database query builders
- Managing database transactions

**Design decisions**:
- **Contract validation**: Generator checks if corresponding contract library exists
- **Server-only**: Tagged with `platform:server` (uses Node.js database clients)
- **Effect layers**: Uses Layer system for dependency injection
- **Testing**: Includes repository and layer tests

**Example**:
```typescript
// repository.ts
export const UserRepositoryLive = Layer.succeed(
  UserRepository,
  UserRepository.of({
    findById: (id) => Effect.gen(function* () {
      const db = yield* KyselyService
      const row = yield* db
        .selectFrom("users")
        .where("id", "=", id)
        .selectAll()
        .executeTakeFirst()

      if (!row) {
        return yield* Effect.fail(new UserNotFoundError({ userId: id }))
      }

      return yield* Schema.decode(User)(row)
    })
  })
)
```

**Best practices**:
- Generate contract library first (Contract-First Architecture)
- Use Effect query builders (not raw SQL strings)
- Wrap database errors in domain errors
- Test repositories with in-memory implementations

### Feature Library

**Purpose**: Orchestrate business logic across multiple services.

**When to use**:
- Implementing complex use cases
- Coordinating multiple repositories and infra services
- Creating RPC endpoints or React hooks

**Options**:
- `--platform` - Runtime target (node, universal, browser, edge)
- `--includeRPC` - Generate @effect/rpc router with handlers
- `--includeCQRS` - Generate CQRS commands, queries, projections
- `--includeClientServer` - Separate client.ts and server.ts exports

**Example**:
```typescript
// service.ts
export const processPayment = (amount: number, customerId: string) =>
  Effect.gen(function* () {
    // Dependency injection via Effect.gen + yield*
    const paymentRepo = yield* PaymentRepository
    const stripe = yield* StripeService
    const logger = yield* LoggingService

    // Orchestrate cross-service workflow
    const charge = yield* stripe.createCharge({ amount, customerId })
    const payment = yield* paymentRepo.create({
      chargeId: charge.id,
      amount
    })
    yield* logger.info(`Payment processed: ${payment.id}`)

    return payment
  })
```

**Best practices**:
- Keep features focused on orchestration (not implementation details)
- Compose services via Effect.gen + yield* (declarative)
- Handle errors at the feature boundary
- Test with mock layers for dependencies

### Infrastructure Library

**Purpose**: Provide cross-cutting infrastructure services.

**When to use**:
- Creating cache abstraction (Redis, in-memory, localStorage)
- Implementing logging/metrics
- Building configuration management
- Creating storage abstraction (S3, filesystem)

**Design decisions**:
- **Interface-first**: Define Context.Tag interface with multiple implementations
- **Configuration as Layer**: Use Effect Config for environment-based settings
- **Multi-platform**: Can generate separate client/server implementations

**Example**:
```typescript
// interface.ts
export class CacheService extends Context.Tag("CacheService")<
  CacheService,
  {
    readonly get: (key: string) => Effect.Effect<Option.Option<string>>
    readonly set: (key: string, value: string, ttl?: number) => Effect.Effect<void>
  }
>() {}

// providers/memory.ts
export const CacheServiceMemory = Layer.sync(CacheService, () => {
  const store = new Map<string, { value: string; expires: number }>()

  return CacheService.of({
    get: (key) => Effect.sync(() => Option.fromNullable(store.get(key)?.value)),
    set: (key, value, ttl) => Effect.sync(() => {
      store.set(key, { value, expires: Date.now() + (ttl ?? 3600) * 1000 })
    })
  })
})
```

**Best practices**:
- Design interface before implementations
- Provide in-memory implementation for testing
- Use Effect Config for runtime configuration
- Document platform requirements (Node.js vs browser)

### Provider Library

**Purpose**: Wrap external SDKs with Effect-based APIs.

**When to use**:
- Integrating third-party services (Stripe, Twilio, SendGrid)
- Wrapping database clients (Postgres, Redis, Mongo)
- Creating resilient external API clients

**Design decisions**:
- **SDK wrapping**: Convert callbacks/promises to Effect
- **Resource management**: Use scoped layers for connection pooling
- **Resilience**: Includes retry logic, circuit breakers, health checks
- **Type safety**: Effect Schema for configuration validation

**Example**:
```typescript
// service.ts (Stripe provider)
export const StripeServiceLive = Layer.scoped(
  StripeService,
  Effect.gen(function* () {
    const config = yield* StripeConfig
    const stripe = new Stripe(config.apiKey) // External SDK

    // Cleanup on scope exit
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => stripe.destroy())
    )

    return StripeService.of({
      createCharge: (req) =>
        Effect.tryPromise({
          try: () => stripe.charges.create(req),
          catch: (error) => new StripeError({ message: String(error) })
        }).pipe(
          Effect.retry(Schedule.exponential("100 millis"))
        )
    })
  })
)
```

**Best practices**:
- Use scoped layers for resource cleanup
- Wrap external errors in domain errors
- Add retry logic for transient failures
- Mock external SDK in tests

## 🔧 Configuration

### Workspace Mode Detection

The generator automatically detects your workspace type:

- **Nx Mode**: Detected when `nx.json` exists
  - Generates `project.json` with Nx targets
  - Uses Nx executors (@nx/js:tsc, @nx/vite:test)
  - Run with: `nx build`, `nx test`, `nx lint`

- **Effect Mode**: Detected when `pnpm-workspace.yaml` exists with `@effect/build-utils`
  - Generates package.json with Effect build scripts
  - Uses @effect/build-utils for code generation
  - Run with: `pnpm build`, `pnpm test`, `pnpm lint`

### Generator Options

All generators support:
- `--directory` - Target directory (default: libs/<type>)
- `--description` - Human-readable description
- `--tags` - Additional Nx tags (comma-separated)
- `--skipTests` - Skip test file generation

**Contract-specific**:
- `--includeCQRS` - Generate commands, queries, projections
- `--includeRPC` - Generate @effect/rpc schemas

**Feature/Infra/Provider**:
- `--platform` - Runtime target (node, universal, browser, edge)
- `--includeClientServer` - Generate separate client/server exports
- `--includeEdge` - Generate edge runtime exports

**Provider-specific**:
- `--externalService` - External service name (required)

## 🧪 Testing

```bash
# Fast unit tests (default, excludes generator tests)
pnpm test

# All tests including generators (CI)
pnpm test:ci

# Only generator tests
pnpm test:generators

# Watch mode
pnpm test:watch

# Coverage report
pnpm coverage
```

Generated libraries use:
- **Vitest** - Fast test runner with ESM support
- **@effect/vitest** - Effect-specific matchers and utilities
- **Virtual file trees** - Generator tests use @nx/devkit/testing

## 📚 Advanced Topics

### Contract-First Architecture

1. **Generate contract first**:
   ```bash
   pnpm exec nx g @tools/workspace-plugin:contract product
   ```

2. **Define domain types**:
   ```typescript
   // libs/contract/product/src/lib/entities.ts
   export const Product = Schema.Struct({
     id: Schema.String,
     name: Schema.String,
     price: Schema.Number
   })
   ```

3. **Generate implementations**:
   ```bash
   pnpm exec nx g @tools/workspace-plugin:data-access product
   ```

4. **Validator checks contract exists**:
   ```
   ✅ Contract library found at libs/contract/product
   ```

### Layer Composition

```typescript
// Compose layers declaratively
const AppLayer = Layer.mergeAll(
  UserRepositoryLive,
  PaymentServiceLive,
  StripeServiceLive,
  CacheServiceMemory
)

// Provide to Effect program
const program = Effect.gen(function* () {
  const userRepo = yield* UserRepository
  const paymentService = yield* PaymentService
  // ...
}).pipe(Effect.provide(AppLayer))
```

### Platform-Specific Exports

```typescript
// index.ts (universal)
export * from "./lib/shared/types.js"
export * from "./lib/shared/errors.js"

// server.ts (Node.js only)
export * from "./lib/server/service.js"
export * from "./lib/server/layers.js"

// client.ts (browser only)
export * from "./lib/client/hooks/index.js"
export * from "./lib/client/atoms/index.js"
```

## 🤝 Contributing

See [CLAUDE.md](./CLAUDE.md) for comprehensive development documentation including:
- Architecture principles and design decisions
- Code generation internals
- Testing patterns
- Scalability considerations

## 📄 License

MIT
