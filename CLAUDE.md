# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **dual-mode Effect.ts library generator** for creating standardized, scalable monorepo architectures. It supports both Nx workspaces and Effect-native monorepos, generating libraries that follow Effect.ts patterns with type-safe service definitions, layer-based dependency injection, and compile-time error handling.

### Core Design Philosophy

The generator embodies four foundational principles:

1. **Contract-First Architecture** - Domain contracts define the "what" before implementations define the "how"
2. **Layered Composition** - Effect's Layer system enables declarative dependency injection and testability
3. **Platform-Aware Modularity** - Libraries export platform-specific entry points (server/client/edge) for optimal bundling
4. **Type-Driven Development** - Effect Schema and Context.Tag enforce compile-time contracts

## Build and Test Commands

### Building

```bash
# Build the plugin
pnpm exec nx build workspace-plugin

# Build with dependencies
pnpm exec nx build workspace-plugin --with-deps
```

### Testing

```bash
# Run fast unit tests (default, excludes slow generator tests)
pnpm test

# Run all tests including generators (comprehensive, for CI)
pnpm test:ci

# Run only generator tests (creates virtual file trees)
pnpm test:generators

# Watch mode for development
pnpm test:watch

# Coverage report
pnpm coverage
```

### Linting

```bash
# Check for linting errors
pnpm lint

# Auto-fix linting errors
pnpm lint-fix

# TypeScript type checking
pnpm check
```

### Running Generators

```bash
# Generate a contract library (domain types and interfaces)
pnpm exec nx g @tools/workspace-plugin:contract <name>

# Generate a data-access library (repositories and database logic)
pnpm exec nx g @tools/workspace-plugin:data-access <name>

# Generate a feature library (business logic and orchestration)
pnpm exec nx g @tools/workspace-plugin:feature <name>

# Generate an infrastructure library (shared services)
pnpm exec nx g @tools/workspace-plugin:infra <name>

# Generate a provider library (external service integration)
pnpm exec nx g @tools/workspace-plugin:provider <name> --externalService="ServiceName"
```

## Architecture Overview

### Design Architecture Principles

#### 1. Contract-First Architecture

**Design Decision**: Separate interface definitions (contracts) from implementations (data-access, features).

**Rationale**:
- **Dependency Inversion**: High-level business logic depends on abstractions, not implementations
- **Parallel Development**: Teams can develop against contracts before implementations exist
- **Substitutability**: Multiple implementations (mock, in-memory, production) share the same contract
- **Testing**: Mock implementations satisfy the same type contracts as production code

**Implementation**:
- Contract libraries export pure TypeScript types, interfaces, and Effect Schema definitions
- Data-access generators validate contract library existence before proceeding
- Contract dependencies flow **downward** (implementations depend on contracts, never inverse)

**References**:
- Dependency Inversion Principle (SOLID): https://en.wikipedia.org/wiki/Dependency_inversion_principle
- Effect.ts Context.Tag pattern: https://effect.website/docs/context-management/services

#### 2. Layered Composition Pattern

**Design Decision**: Use Effect's Layer system for dependency injection instead of constructor injection or service locators.

**Rationale**:
- **Compile-Time Safety**: Missing dependencies cause TypeScript errors at build time
- **Composability**: Layers compose via `Layer.provide()` and `Layer.merge()`
- **Resource Management**: Scoped layers handle lifecycle (acquire/release) automatically
- **Environment Separation**: Same service code with different layer implementations (dev/staging/prod)

**Implementation**:
```typescript
// Service Definition (Context.Tag)
export class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  {
    readonly findById: (id: string) => Effect.Effect<User, UserNotFoundError>
  }
>() {}

// Service Implementation (Layer)
export const UserRepositoryLive = Layer.succeed(
  UserRepository,
  UserRepository.of({
    findById: (id) => Effect.gen(function* () {
      // Implementation details
    })
  })
)

// Usage (Dependency Injection)
const program = Effect.gen(function* () {
  const repo = yield* UserRepository
  return yield* repo.findById("user-123")
}).pipe(Effect.provide(UserRepositoryLive))
```

**References**:
- Effect Layer documentation: https://effect.website/docs/context-management/layers
- Dependency Injection in Functional Programming: https://www.reddit.com/r/functionalprogramming/comments/10h1m7x/

#### 3. Platform-Aware Exports

**Design Decision**: Libraries export platform-specific entry points (index.ts, server.ts, client.ts, edge.ts).

**Rationale**:
- **Bundle Optimization**: Bundlers can tree-shake server-only code from client bundles
- **Runtime Safety**: Platform-specific APIs (Node.js fs, browser localStorage) isolated to correct entry points
- **Isomorphic Support**: Universal libraries export both client and server implementations
- **Edge Compatibility**: Lightweight edge.ts exports for Vercel Edge/Cloudflare Workers

**Implementation**:
- `index.ts` - Universal exports (shared types, schemas, errors)
- `server.ts` - Node.js platform (database access, file system, server-side Effect layers)
- `client.ts` - Browser platform (React hooks, Jotai atoms, browser-only services)
- `edge.ts` - Edge runtime (middleware, lightweight handlers)

**Platform Matrix by Library Type**:

| Library Type  | index.ts | server.ts | client.ts | edge.ts | Rationale |
|---------------|----------|-----------|-----------|---------|-----------|
| **contract**  | ✅ Types | ❌        | ❌        | ❌      | Platform-agnostic type definitions only |
| **data-access**| ✅ All  | ❌        | ❌        | ❌      | Server-only but single entry point (no split needed) |
| **feature**   | ✅ Core  | Optional  | Optional  | Optional| Platform-specific based on `includeClientServer` flag |
| **infra**     | ✅ Core  | Optional  | Optional  | Optional| Infrastructure services (cache, logging, metrics) |
| **provider**  | ✅ Core  | Optional  | Optional  | Optional| External SDK wrappers (Redis, Stripe, Postgres) |

**References**:
- Conditional Exports (Node.js): https://nodejs.org/api/packages.html#conditional-exports
- Tree Shaking Best Practices: https://webpack.js.org/guides/tree-shaking/

#### 4. Type-Driven Development with Effect Schema

**Design Decision**: Use Effect Schema for runtime validation and type inference instead of separate validator libraries.

**Rationale**:
- **Single Source of Truth**: Schema defines both TypeScript types and runtime validators
- **Serialization**: Automatic JSON encoding/decoding with `Schema.encode` and `Schema.decode`
- **Transformation**: Type-safe data transformations (e.g., string → Date, camelCase → snake_case)
- **Error Messages**: Human-readable validation errors via `TreeFormatter`

**Implementation**:
```typescript
import { Schema } from "effect"

// Schema Definition (Single Source of Truth)
export const CreateUserRequest = Schema.Struct({
  email: Schema.String.pipe(Schema.pattern(/^[^@]+@[^@]+\.[^@]+$/)),
  age: Schema.Number.pipe(Schema.int(), Schema.between(18, 120)),
  roles: Schema.Array(Schema.Literal("admin", "user", "guest"))
})

// Type Inference (No Manual Type Definition Needed)
export type CreateUserRequest = Schema.Schema.Type<typeof CreateUserRequest>

// Runtime Validation
const parseUser = Schema.decodeUnknown(CreateUserRequest)
const result = parseUser({ email: "user@example.com", age: 25, roles: ["user"] })
// => Effect.Effect<CreateUserRequest, ParseError>
```

**References**:
- Effect Schema documentation: https://effect.website/docs/schema/introduction
- Runtime Type Validation (Comparison): https://github.com/moltar/typescript-runtime-type-benchmarks

### Workspace Mode Detection

The generator **automatically detects** your workspace type:

- **Nx Mode**: Detected when `nx.json` exists or project.json files are present
- **Effect Mode**: Detected when `pnpm-workspace.yaml` exists with `@effect/build-utils` in root devDependencies

### Generated Files by Mode

**Nx Mode generates:**

- `project.json` - Nx project configuration with targets (build, test, lint, typecheck)
- `package.json` - With exports only (no scripts)
- Uses Nx executors: `@nx/js:tsc`, `@nx/vite:test`, `@nx/eslint:lint`
- Run with: `nx build`, `nx test`, `nx lint`

**Effect Mode generates:**

- `package.json` - With exports AND Effect build scripts
- NO `project.json` (not needed)
- Scripts follow Effect monorepo pattern: codegen → build-esm → build-annotate → build-cjs → pack
- Uses `@effect/build-utils` for code generation and packaging
- Run with: `pnpm build`, `pnpm test`, `pnpm lint`

Both modes generate identical TypeScript configurations, source files, and documentation.

## Library Types and Design Decisions

### Contract Library (`contract`)

**Purpose**: Define domain boundaries, entities, errors, events, and service interfaces.

**Architectural Role**: The "API" layer that all implementations depend on.

**Design Decisions**:
- **Type-Only Library**: No runtime code, only TypeScript types and Effect Schemas
- **Platform-Agnostic**: Tagged with `platform:universal` (no Node.js or browser dependencies)
- **Zero Dependencies**: Depends only on `effect` and `@effect/platform`
- **Optional CQRS**: Can include commands, queries, and projections for event-sourced domains
- **Optional RPC**: Can include `@effect/rpc` schemas for network boundaries

**Generated Files**:
- `lib/entities.ts` - Domain entity definitions using Effect Schema
- `lib/errors.ts` - Domain-specific errors using `Data.TaggedError`
- `lib/ports.ts` - Service interfaces using `Context.Tag`
- `lib/events.ts` - Domain events (Event Sourcing pattern)
- `lib/commands.ts` - Command definitions (CQRS, optional)
- `lib/queries.ts` - Query definitions (CQRS, optional)
- `lib/projections.ts` - Read model projections (CQRS, optional)
- `lib/rpc.ts` - RPC request/response schemas (optional)

**Dependencies Flow**:
```
contracts (bottom layer)
   ↑
   └── data-access, features (depend on contracts)
```

**References**:
- Domain-Driven Design Contracts: https://martinfowler.com/bliki/BoundedContext.html
- CQRS Pattern: https://martinfowler.com/bliki/CQRS.html

### Data-Access Library (`data-access`)

**Purpose**: Implement repository pattern for database operations with type-safe queries.

**Architectural Role**: Persistence layer that implements contract interfaces.

**Design Decisions**:
- **Repository Pattern**: One repository per aggregate root (DDD pattern)
- **Contract Implementation**: Validates that corresponding contract library exists
- **Server-Only**: Tagged with `platform:server` (uses Node.js database clients)
- **No Platform Split**: All exports in `index.ts` (no separate server.ts/client.ts)
- **Effect Query Builder**: Uses Effect-native query composition instead of SQL strings

**Generated Files**:
- `lib/shared/types.ts` - Database-specific types (row types, query filters)
- `lib/shared/errors.ts` - Repository errors (`NotFoundError`, `DatabaseError`)
- `lib/shared/validation.ts` - Input validation using Effect Schema
- `lib/queries.ts` - Reusable query fragments and builders
- `lib/repository.ts` - Repository service implementation
- `lib/server/layers.ts` - Effect Layer definitions for dependency injection
- `lib/repository.spec.ts` - Repository unit tests
- `lib/layers.spec.ts` - Layer integration tests

**Dependencies Flow**:
```
contract/<domain>
   ↑
   └── data-access/<domain> (implements contract ports)
           ↑
           └── provider/<database> (e.g., provider/kysely)
```

**Validation Pattern**:
```typescript
// Generator validates contract library exists before proceeding
const contractLibPath = `libs/contract/${options.fileName}`;
if (!tree.exists(contractLibPath)) {
  console.warn('WARNING: Contract library not found. Contract-First Architecture requires contract to exist first.');
}
```

**References**:
- Repository Pattern: https://martinfowler.com/eaaCatalog/repository.html
- Effect Query Composition: https://effect.website/docs/guides/use-cases/database-queries

### Feature Library (`feature`)

**Purpose**: Orchestrate business logic by composing services from data-access and infra layers.

**Architectural Role**: Application/service layer that coordinates use cases.

**Design Decisions**:
- **Platform Flexibility**: Defaults to `universal` (can run client or server)
- **Service Composition**: Coordinates multiple repositories and infrastructure services
- **Optional RPC Router**: Can expose HTTP endpoints via `@effect/rpc`
- **Optional React Integration**: Can generate React hooks and Jotai atoms for state management
- **Optional Edge Support**: Can generate lightweight edge middleware

**Generated Files**:
- `lib/shared/types.ts` - Feature-specific types and DTOs
- `lib/shared/errors.ts` - Feature-level errors (business rule violations)
- `lib/shared/schemas.ts` - Request/response validation schemas
- `lib/server/service.ts` - Business logic service implementation
- `lib/server/layers.ts` - Service layer composition
- `lib/client/hooks/use-<feature>.ts` - React hooks (optional)
- `lib/client/atoms/<feature>-atoms.ts` - Jotai atoms (optional)
- `lib/server/service.spec.ts` - Service unit tests

**Dependencies Flow**:
```
contract/* + data-access/* + infra/*
   ↑
   └── feature/<domain> (orchestrates cross-cutting concerns)
```

**Example Use Case**:
```typescript
// Feature: Payment Processing
// Depends on:
// - data-access/payment (persist payment records)
// - provider/stripe (charge customer)
// - infra/logging (audit trail)

export const processPayment = (amount: number, customerId: string) =>
  Effect.gen(function* () {
    const paymentRepo = yield* PaymentRepository
    const stripe = yield* StripeService
    const logger = yield* LoggingService

    // Orchestrate cross-service workflow
    const charge = yield* stripe.createCharge({ amount, customerId })
    const payment = yield* paymentRepo.create({ chargeId: charge.id, amount })
    yield* logger.info(`Payment processed: ${payment.id}`)

    return payment
  })
```

**References**:
- Service Layer Pattern: https://martinfowler.com/eaaCatalog/serviceLayer.html
- Effect RPC: https://effect.website/docs/guides/use-cases/http-apis

### Infrastructure Library (`infra`)

**Purpose**: Provide cross-cutting infrastructure services (cache, logging, metrics, storage).

**Architectural Role**: Foundational layer consumed by features and data-access layers.

**Design Decisions**:
- **Platform-Agnostic by Default**: Can generate client, server, or both implementations
- **Interface-First**: Defines service interface with multiple provider implementations
- **Configuration as Layer**: Uses Effect Config for environment-based settings
- **Optional Multi-Platform**: Can generate separate client.ts and server.ts variants

**Generated Files**:
- `lib/service/interface.ts` - Service interface using `Context.Tag`
- `lib/service/config.ts` - Configuration schema using Effect Config
- `lib/service/errors.ts` - Infrastructure-specific errors
- `lib/layers/server-layers.ts` - Server-side layer implementations
- `lib/layers/client-layers.ts` - Client-side layer implementations (optional)
- `lib/providers/memory.ts` - In-memory implementation (testing/development)

**Common Infrastructure Services**:
- **Cache**: `CacheService` (Redis, in-memory, browser localStorage)
- **Logging**: `LoggingService` (structured logging, log levels)
- **Metrics**: `MetricsService` (counters, histograms, gauges)
- **Storage**: `StorageService` (S3, local filesystem, browser storage)
- **Environment**: `EnvService` (type-safe environment variable access)

**Dependencies Flow**:
```
infra/* (foundational layer, minimal dependencies)
   ↑
   ├── data-access/* (uses logging, caching)
   └── feature/* (uses all infra services)
```

**References**:
- Infrastructure Layer (DDD): https://khalilstemmler.com/articles/software-design-architecture/organizing-app-logic/
- Effect Config: https://effect.website/docs/configuration

### Provider Library (`provider`)

**Purpose**: Wrap external service SDKs (Redis, Stripe, Postgres) with Effect-based APIs.

**Architectural Role**: Adapter layer that translates third-party APIs into Effect services.

**Design Decisions**:
- **SDK Wrapping**: Converts callback/promise-based SDKs to Effect-based APIs
- **Platform-Specific**: Explicitly set platform (node, browser, universal, edge)
- **Resilience Patterns**: Includes health checks, circuit breakers, and retry logic
- **Connection Pooling**: Manages resource lifecycle with scoped Effect layers
- **Type-Safe Configuration**: Uses Effect Schema for SDK configuration validation

**Generated Files**:
- `lib/service.ts` - Effect-based service wrapping the external SDK
- `lib/types.ts` - Type definitions and TypeScript interfaces
- `lib/errors.ts` - Provider-specific errors (connection failures, API errors)
- `lib/validation.ts` - Configuration and request validation schemas
- `lib/layers.ts` - Layer definitions with resource management
- `lib/service.spec.ts` - Unit tests with mocked SDK clients

**Common Provider Examples**:
- **provider/kysely** - Kysely query builder for Postgres/MySQL
- **provider/stripe** - Stripe payment processing
- **provider/redis** - Redis caching and pub/sub
- **provider/postgres** - PostgreSQL connection pooling
- **provider/s3** - AWS S3 object storage

**Dependencies Flow**:
```
provider/* (wraps external SDKs)
   ↑
   ├── data-access/* (uses database providers)
   └── feature/* (uses external service providers)
```

**Example Pattern**:
```typescript
// Provider: Stripe
export class StripeService extends Context.Tag("StripeService")<
  StripeService,
  {
    readonly createCharge: (req: ChargeRequest) => Effect.Effect<Charge, StripeError>
  }
>() {}

// Layer with Resource Management
export const StripeServiceLive = Layer.scoped(
  StripeService,
  Effect.gen(function* () {
    const config = yield* StripeConfig
    const stripe = new Stripe(config.apiKey) // External SDK

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => stripe.destroy()) // Cleanup on scope exit
    )

    return StripeService.of({
      createCharge: (req) =>
        Effect.tryPromise({
          try: () => stripe.charges.create(req),
          catch: (error) => new StripeError({ message: String(error) })
        })
    })
  })
)
```

**References**:
- Adapter Pattern: https://refactoring.guru/design-patterns/adapter
- Effect Resource Management: https://effect.website/docs/resource-management/scope

## Code Generation Architecture

### Programmatic Template Generation

**Design Decision**: Use TypeScript functions instead of EJS file templates.

**Rationale**:
- **Type Safety**: Templates are TypeScript functions with typed parameters
- **Refactoring**: IDE refactoring tools work on template code
- **Testing**: Template functions are unit-testable with Vitest
- **Composition**: Template builders can compose and reuse code fragments

**Implementation Pattern**:
```typescript
// Template Function (Type-Safe)
export function generateServiceFile(options: TemplateOptions) {
  const builder = new TypeScriptBuilder()

  builder
    .addImports([
      { from: "effect", names: ["Context", "Effect", "Layer"] }
    ])
    .addRaw(EffectPatterns.createContextTag({
      tagName: options.className,
      serviceName: options.className,
      serviceInterface: {
        methods: [
          {
            name: "findById",
            params: [{ name: "id", type: "string" }],
            returnType: "Effect.Effect<User, UserNotFoundError>"
          }
        ]
      }
    }))

  return builder.toString()
}
```

**Core Utilities**:
- `src/utils/code-generation/typescript-builder.ts` - AST builder with automatic import management
- `src/utils/code-generation/effect-patterns.ts` - Builders for Effect.ts patterns (TaggedError, Context.Tag, Layer, Schema)
- `src/utils/code-generation/barrel-export-utils.ts` - Generates barrel export files

### File Generation Flow

1. **Normalize Options** (`normalization-utils.ts`)
   - Convert kebab-case names to className, propertyName, fileName, constantName
   - Compute paths: projectRoot, sourceRoot, offsetFromRoot
   - Compute package name with scope

2. **Generate Infrastructure** (`library-generator-utils.ts`)
   - Detect workspace mode (Nx vs Effect-native)
   - Generate project.json (Nx mode only) or package.json scripts (Effect mode)
   - Generate tsconfig files (base, lib, spec, build)
   - Generate vitest.config.ts
   - Generate README.md with library-specific guidance

3. **Generate Domain Files** (Generator-specific templates)
   - Use TypeScriptBuilder to construct AST
   - Apply EffectPatterns for standard Effect.ts constructs
   - Write files to virtual tree

4. **Format and Validate** (Nx devkit)
   - Run `formatFiles(tree)` to apply Prettier formatting
   - Return post-generation instructions

## Core Utilities Deep Dive

### `src/utils/workspace-detection.ts`

- `detectWorkspace()` - Automatically detects Nx or Effect-native workspace mode
- `getBuildMode()` - Returns 'nx' or 'effect' based on workspace
- `shouldGenerateProjectJson()` - Determines if project.json is needed
- Used by all generators to adapt output to workspace type

### `src/utils/library-generator-utils.ts`

- `generateLibraryFiles()` - Central function for creating all library infrastructure
- Detects workspace mode and generates appropriate configuration
- Conditionally creates project.json (Nx only) or Effect scripts (Effect only)
- Handles platform-aware entry point generation

### `src/utils/build-config-utils.ts`

- `createStandardTargets()` - Creates Nx targets (build, test, lint, check) for Nx mode
- `createEffectScripts()` - Generates Effect-style package.json scripts for Effect mode
- Maps library types to build configurations
- Manages platform-specific build settings

### `src/utils/platform-utils.ts`

- `determinePlatformExports()` - Decides which entry points (index/server/client/edge) to generate based on library type and platform
- Implements precedence logic: explicit flag > platform defaults > library type defaults

### `src/utils/code-generation/typescript-builder.ts`

- **Purpose**: Type-safe TypeScript AST construction
- **Features**: Automatic import deduplication, JSDoc support, class/interface/function builders
- **Pattern**: Builder pattern with method chaining

### `src/utils/code-generation/effect-patterns.ts`

- **Purpose**: Generate standard Effect.ts patterns
- **Patterns**:
  - `createTaggedError()` - `Data.TaggedError` classes
  - `createContextTag()` - `Context.Tag` service definitions
  - `createLiveLayer()` - `Layer.succeed/effect/scoped` implementations
  - `createSchemaStruct()` - `Schema.Struct` definitions

## Testing Architecture

### Test Organization

- **Unit Tests** (`.test.ts`) - Fast, run by default with `pnpm test`
  - Template generation tests
  - Utility function tests
  - No file system access

- **Generator Tests** (`.spec.ts`) - Slower, run with `pnpm test:ci`
  - Create virtual file trees using `@nx/devkit/testing`
  - Validate generated file structure
  - Test workspace mode detection

### Nx Devkit Testing Utilities

**IMPORTANT**: Testing utilities must be imported from `@nx/devkit/testing` (NOT `@nx/devkit`):

```typescript
import { createTree, createTreeWithEmptyWorkspace } from '@nx/devkit/testing'
import { Tree } from '@nx/devkit' // Tree type comes from @nx/devkit
```

Available utilities:
- `createTree()` - Minimal virtual file tree
- `createTreeWithEmptyWorkspace()` - Virtual tree with workspace configuration
- `createTreeWithEmptyV1Workspace()` - Virtual tree with v1 workspace format

### Test Execution

```bash
# Fast unit tests only (default)
pnpm test

# All tests including generators (CI)
pnpm test:ci

# Only generator tests
pnpm test:generators

# Watch mode for TDD
pnpm test:watch
```

## Important Constraints and Requirements

### 1. Module Type and Import Extensions

**Constraint**: Package uses `"type": "module"` - all files must use ESM imports with `.js` extensions for local imports.

**Rationale**: TypeScript's `"moduleResolution": "NodeNext"` requires explicit file extensions for ESM compatibility.

**Implementation**:
```typescript
// ✅ CORRECT: Use .js extension for local TypeScript files
import { generateLibraryFiles } from "../../utils/library-generator-utils.js";
import type { ContractGeneratorSchema } from "./schema.js";

// ❌ INCORRECT: Missing .js extension
import { generateLibraryFiles } from "../../utils/library-generator-utils";
```

**References**:
- TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/modules/reference.html#file-extension-substitution
- Node.js ESM: https://nodejs.org/api/esm.html

### 2. TypeScript Configuration

- Uses `"moduleResolution": "NodeNext"` and `"module": "NodeNext"`
- Requires `.js` extensions for relative imports (TypeScript will resolve to `.ts` files)
- Project references enabled for incremental compilation

### 3. Effect Version Constraints

- Peer dependencies lock to specific Effect.ts versions:
  - `effect` ^3.17.7
  - `@effect/platform` ^0.93.2
- Generated libraries inherit these version constraints

### 4. Nx Compatibility

- Tested with Nx 22.x
- Uses `@nx/js:tsc` executor for TypeScript compilation
- Uses `@nx/vite:test` executor for Vitest integration

## Code Style and Conventions

### TypeScript Style

- Use `readonly` for all array and object parameters
- Prefer `Array<T>` over `T[]` for consistency with Effect.ts
- Use `interface` for public APIs, `type` for unions and internal types

### Effect.ts Naming Conventions

- Service interfaces: `ServiceName` (e.g., `UserRepository`, `CacheService`)
- Live implementations: `ServiceNameLive` (e.g., `UserRepositoryLive`)
- Test implementations: `ServiceNameTest` (e.g., `UserRepositoryTest`)
- Errors: `EntityActionError` pattern (e.g., `UserNotFoundError`, `DatabaseConnectionError`)

### Generator Requirements

- All generators must call `formatFiles(tree)` before completion
- JSDoc comments required for all public functions and classes
- Template functions must return strings (not write files directly)
- Validation logic must warn users (not throw errors) for fixable issues

### File Organization

```
src/generators/<type>/
├── <type>.ts              # Main generator function
├── <type>.spec.ts         # Generator integration tests
├── schema.json            # JSON schema for CLI prompts
├── schema.d.ts            # TypeScript types for schema
├── templates/             # Template functions
│   ├── index.template.ts  # Barrel exports
│   ├── errors.template.ts # Error definitions
│   ├── types.template.ts  # Type definitions
│   └── *.template.ts      # Additional templates
└── README.md              # Library-specific documentation
```

## Scalability Considerations

### Horizontal Scalability

- **Library Composition**: Features compose multiple data-access and infra services without coupling
- **Parallel Development**: Contract-first approach allows teams to work on different layers simultaneously
- **Monorepo Benefits**: Shared contracts enable atomic refactoring across all implementations

### Vertical Scalability

- **Layer Caching**: Effect's Layer system caches service instances (singleton by default)
- **Resource Pooling**: Scoped layers manage connection pools (database, Redis, HTTP clients)
- **Concurrent Operations**: Effect runtime schedules fibers efficiently across available CPU cores

### Bundle Size Optimization

- **Platform Splits**: Client bundles exclude server-only code via separate entry points
- **Tree Shaking**: ESM exports enable dead code elimination
- **Edge-Friendly**: Lightweight edge.ts exports for serverless environments

## References and Further Reading

### Effect.ts Documentation
- Effect Website: https://effect.website
- Effect Schema: https://effect.website/docs/schema/introduction
- Context Management: https://effect.website/docs/context-management/services
- Layer Documentation: https://effect.website/docs/context-management/layers

### Design Patterns
- Domain-Driven Design: https://martinfowler.com/tags/domain%20driven%20design.html
- Repository Pattern: https://martinfowler.com/eaaCatalog/repository.html
- Service Layer Pattern: https://martinfowler.com/eaaCatalog/serviceLayer.html
- Adapter Pattern: https://refactoring.guru/design-patterns/adapter

### TypeScript
- TypeScript Handbook: https://www.typescriptlang.org/docs/handbook/
- Node.js ESM: https://nodejs.org/api/esm.html

### Nx
- Nx Documentation: https://nx.dev
- Nx Generators: https://nx.dev/extending-nx/intro/getting-started
