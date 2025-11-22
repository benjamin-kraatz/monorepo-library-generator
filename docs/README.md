# Documentation

This directory contains comprehensive architecture and design documentation for the Monorepo Library Generator.

## Documentation Structure

### Architecture & Patterns

- **[ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md)** - High-level system architecture and design principles
- **[EFFECT_PATTERNS.md](./EFFECT_PATTERNS.md)** - Effect-TS patterns and best practices used throughout the codebase
- **[EXPORT_PATTERNS.md](./EXPORT_PATTERNS.md)** - Platform-aware export patterns and barrel files
- **[NX_STANDARDS.md](./NX_STANDARDS.md)** - Nx workspace conventions and standards
- **[EXAMPLES.md](./EXAMPLES.md)** - Practical end-to-end examples and usage patterns

### Generator Documentation

Each generator has detailed documentation covering:
- Purpose and use cases
- Generated file structure
- Template patterns
- Configuration options
- Examples

#### Available Generators

- **[CONTRACT.md](./CONTRACT.md)** - Contract library generator (domain boundaries, types, interfaces)
- **[DATA-ACCESS.md](./DATA-ACCESS.md)** - Data access library generator (repositories, database operations)
- **[FEATURE.md](./FEATURE.md)** - Feature library generator (business logic, React hooks)
- **[INFRA.md](./INFRA.md)** - Infrastructure library generator (technical services)
- **[PROVIDER.md](./PROVIDER.md)** - Provider library generator (external service integrations)

## Quick Start

1. **For Users**: Start with the main [README](../README.md) for installation and basic usage
2. **For Examples**: See [EXAMPLES.md](./EXAMPLES.md) for practical end-to-end examples
3. **For Contributors**: Read [CONTRIBUTING](../CONTRIBUTING.md) for development guidelines
4. **For Architects**: Review [ARCHITECTURE_OVERVIEW.md](./ARCHITECTURE_OVERVIEW.md) for system design

## Documentation Guidelines

When updating documentation:

1. **Keep it current** - Update docs when changing functionality
2. **Be specific** - Include concrete examples and code snippets
3. **Stay organized** - Follow the existing structure and conventions
4. **Link liberally** - Cross-reference related documentation

## Effect-TS Resources

This project heavily uses Effect-TS patterns. Key resources:

- [Effect Documentation](https://effect.website)
- [Effect GitHub](https://github.com/Effect-TS/effect)
- [EFFECT_PATTERNS.md](./EFFECT_PATTERNS.md) - Project-specific Effect patterns

## Nx Resources

The generators follow Nx conventions:

- [Nx Documentation](https://nx.dev)
- [Nx Generators](https://nx.dev/extending-nx/intro/getting-started)
- [NX_STANDARDS.md](./NX_STANDARDS.md) - Project-specific Nx standards
