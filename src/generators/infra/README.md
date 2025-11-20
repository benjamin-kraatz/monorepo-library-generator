# Infrastructure Library Generator

Generate cross-cutting infrastructure service libraries (cache, logging, metrics, storage) using Effect.ts patterns.

## Purpose

Infrastructure libraries provide **foundational services** consumed by features and data-access layers:
- Abstract infrastructure concerns (caching, logging, configuration)
- Support multiple implementations (Redis cache, in-memory cache, localStorage)
- Enable platform-specific variants (server vs client)
- Facilitate testing with mock/in-memory implementations

## Design Rationale

### Why Infrastructure Layer?

**Problem**: Infrastructure concerns scattered throughout codebase:
- Logging logic duplicated in every service
- Cache keys inconsistent across modules
- Configuration access not type-safe
- Difficult to swap implementations (Redis → Memcached)

**Solution**: Centralized infrastructure services:

```typescript
// Single CacheService interface
export class CacheService extends Context.Tag("CacheService")<
  CacheService,
  {
    readonly get: (key: string) => Effect.Effect<Option.Option<string>>
    readonly set: (key: string, value: string, ttl?: number) => Effect.Effect<void>
  }
>() {}

// Multiple implementations (same interface)
export const CacheServiceRedis = /* Redis implementation */
export const CacheServiceMemory = /* In-memory implementation */
export const CacheServiceLocalStorage = /* Browser localStorage */
```

**Benefits**:
- **Consistency**: Same cache interface everywhere
- **Swappable**: Change implementation without changing consumers
- **Testing**: Use in-memory for tests, Redis for production
- **Platform-Aware**: Different implementations for server/client

### Why Interface-First?

Define Context.Tag interface before implementations:

**Rationale**:
- Multiple implementations share the same contract
- Consumers depend on abstraction (not concrete implementation)
- Easy to add new implementations (e.g., new cache backend)
- Clear architectural boundaries

## Generated Files

### Always Generated

- `lib/service/interface.ts` - Service Context.Tag definition
- `lib/service/config.ts` - Configuration schema (Effect Config)
- `lib/service/errors.ts` - Infrastructure-specific errors
- `lib/layers/server-layers.ts` - Server-side implementations
- `lib/providers/memory.ts` - In-memory implementation (testing)

### Optional

- `lib/layers/client-layers.ts` - Client-side implementations (`--includeClientServer`)
- `lib/edge/middleware.ts` - Edge runtime support (`--includeEdge`)

## Common Infrastructure Services

### Cache Service

```typescript
export class CacheService extends Context.Tag("CacheService")<
  CacheService,
  {
    readonly get: (key: string) => Effect.Effect<Option.Option<string>>
    readonly set: (key: string, value: string, ttl?: number) => Effect.Effect<void>
    readonly delete: (key: string) => Effect.Effect<void>
    readonly clear: () => Effect.Effect<void>
  }
>() {}

// Redis implementation (production)
export const CacheServiceRedis = Layer.scoped(/* ... */)

// In-memory implementation (development/testing)
export const CacheServiceMemory = Layer.sync(/* ... */)

// LocalStorage implementation (browser)
export const CacheServiceBrowser = Layer.sync(/* ... */)
```

### Logging Service

```typescript
export class LoggingService extends Context.Tag("LoggingService")<
  LoggingService,
  {
    readonly debug: (message: string, meta?: Record<string, unknown>) => Effect.Effect<void>
    readonly info: (message: string, meta?: Record<string, unknown>) => Effect.Effect<void>
    readonly warn: (message: string, meta?: Record<string, unknown>) => Effect.Effect<void>
    readonly error: (message: string, error?: Error, meta?: Record<string, unknown>) => Effect.Effect<void>
  }
>() {}
```

### Metrics Service

```typescript
export class MetricsService extends Context.Tag("MetricsService")<
  MetricsService,
  {
    readonly counter: (name: string, value?: number) => Effect.Effect<void>
    readonly gauge: (name: string, value: number) => Effect.Effect<void>
    readonly histogram: (name: string, value: number) => Effect.Effect<void>
  }
>() {}
```

### Configuration Service

```typescript
export class EnvService extends Context.Tag("EnvService")<
  EnvService,
  {
    readonly get: (key: string) => Effect.Effect<string, ConfigError>
    readonly getOptional: (key: string) => Effect.Effect<Option.Option<string>>
  }
>() {}
```

## Usage

```bash
pnpm exec nx g @tools/workspace-plugin:infra cache --includeClientServer
```

## Best Practices

1. **Design Interface First**: Define Context.Tag before implementations
2. **Provide Memory Implementation**: Always include in-memory for testing
3. **Use Effect Config**: Type-safe environment variable access
4. **Document Platform Requirements**: Specify Node.js vs browser dependencies
5. **Version Carefully**: Infrastructure changes affect all consumers

## References

- **Infrastructure Layer (DDD)**: https://khalilstemmler.com/articles/software-design-architecture/organizing-app-logic/
- **Effect Config**: https://effect.website/docs/configuration
