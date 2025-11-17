# workspace-plugin

Nx plugin for generating standardized architecture components in the CreativeToolkits monorepo.

## Available Generators

This plugin provides four generators for creating architecture components following established patterns:

### Architecture Adapter

Generates an adapter following the Adapter pattern with infrastructure support.

```bash
pnpm exec nx g @tools/workspace-plugin:architecture-adapter my-adapter --externalService=api
```

Options:

- `name` (required): The name of the adapter
- `directory`: Target directory (default: libs/adapters)
- `externalService` (required): The external service this adapter connects to
- `includeHealthCheck`: Add health check capability
- `includeCaching`: Add caching support
- `includeRetry`: Add retry logic

### Architecture Repository

Generates a repository following the Repository pattern with infrastructure support.

```bash
pnpm exec nx g @tools/workspace-plugin:architecture-repository my-repo
```

Options:

- `name` (required): The name of the repository
- `directory`: Target directory (default: libs/repositories)
- `includeCache`: Add caching layer
- `includeValidation`: Add validation logic
- `tags`: Additional tags for the project

### Architecture Service

Generates a service following the Service-Oriented Architecture pattern.

```bash
pnpm exec nx g @tools/workspace-plugin:architecture-service my-service
```

Options:

- `name` (required): The name of the service
- `directory`: Target directory (default: libs/services)
- `includeApi`: Add API endpoints
- `includeWebSocket`: Add WebSocket support
- `tags`: Additional tags for the project

### Provider

Generates a provider library following Effect-based architecture patterns for external service integration.

```bash
pnpm exec nx g @tools/workspace-plugin:provider redis --externalService="Redis" --clientType="RedisClient"
```

Options:

- `name` (required): The name of the provider (e.g., 'redis', 'stripe', 'postgres')
- `directory`: Target directory (default: libs/provider)
- `externalService` (required): The external service this provider connects to
- `clientType`: The type of client SDK this provider wraps
- `includeHealthCheck`: Add health check functionality (default: true)
- `includeCircuitBreaker`: Add circuit breaker pattern (default: true)
- `includeRetry`: Add retry logic with exponential backoff (default: true)
- `includeMetrics`: Add metrics collection (default: true)
- `includeCaching`: Add caching capabilities (default: false)
- `includePooling`: Add connection pooling (default: false)
- `platform`: Target platform - 'node', 'browser', 'universal', 'edge' (default: 'node')
- `configFields`: Custom configuration fields (JSON array)
- `operations`: Primary operations this provider will support (JSON array)
- `tags`: Additional tags for the project
- `skipTests`: Skip generating test files (default: false)

## Building

Run `nx build workspace-plugin` to build the library.

## Running unit tests

Run `nx test workspace-plugin` to execute the unit tests via [Jest](https://jestjs.io).
