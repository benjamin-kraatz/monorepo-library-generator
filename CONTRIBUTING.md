# Contributing to Monorepo Library Generator

Thank you for your interest in contributing to the Monorepo Library Generator! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

## Code of Conduct

This project follows a professional code of conduct. Be respectful, inclusive, and constructive in all interactions.

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- TypeScript 5.6+

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/monorepo-library-generator.git
   cd monorepo-library-generator
   ```

3. Install dependencies:
   ```bash
   pnpm install
   ```

4. Build the project:
   ```bash
   pnpm build
   ```

## Development Workflow

### Project Structure

```
.
├── src/                    # Source code
│   ├── generators/         # Generator implementations
│   │   ├── contract/      # Contract library generator
│   │   ├── data-access/   # Data access library generator
│   │   ├── feature/       # Feature library generator
│   │   ├── infra/         # Infrastructure library generator
│   │   └── provider/      # Provider library generator
│   ├── utils/             # Shared utilities
│   └── cli/               # CLI implementation
├── docs/                   # Architecture documentation
├── dist/                   # Build output (generated)
└── tests/                  # Test files

```

### Available Commands

```bash
# Development
pnpm build              # Build the project
pnpm check              # Type check without emitting
pnpm test               # Run tests in watch mode
pnpm test:ci            # Run tests once
pnpm test:generators    # Run generator tests only

# Code Quality
pnpm lint               # Lint code
pnpm lint-fix           # Fix linting issues

# Local Testing
pnpm build              # Build first
cd dist && npm link     # Link locally
mlg --help              # Test CLI
```

## Testing

### Writing Tests

- Place tests next to the code they test (e.g., `generator.spec.ts` next to `generator.ts`)
- Use descriptive test names that explain the behavior
- Follow the existing test structure using vitest and @effect/vitest
- Ensure tests are deterministic and don't rely on external state

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm vitest run src/generators/contract/contract.spec.ts

# Run in watch mode during development
pnpm test:watch
```

### Test Coverage

Aim for high test coverage, especially for:
- Generator logic
- Template generation
- File structure creation
- Error handling

## Submitting Changes

### Branch Naming

Use descriptive branch names:
- `feat/add-new-generator` - New features
- `fix/template-bug` - Bug fixes
- `docs/update-readme` - Documentation updates
- `refactor/cleanup-utils` - Refactoring

### Commit Messages

Follow conventional commits:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `test`: Test updates
- `chore`: Build process or tooling changes

Examples:
```
feat(contract): add support for domain events
fix(provider): correct error handling in template
docs(readme): update installation instructions
```

### Pull Request Process

1. **Create a feature branch** from `main`
2. **Make your changes** with clear, atomic commits
3. **Add tests** for new functionality
4. **Update documentation** if needed
5. **Run tests** and ensure they pass:
   ```bash
   pnpm build && pnpm test:ci
   ```
6. **Submit a pull request** with:
   - Clear description of changes
   - Link to related issues
   - Screenshots/examples if applicable

### Pull Request Checklist

- [ ] Tests pass locally
- [ ] Code follows project style guidelines
- [ ] Documentation updated (if applicable)
- [ ] Changeset created (for version changes)
- [ ] No unrelated changes included

## Release Process

This project uses [Changesets](https://github.com/changesets/changesets) for version management.

### Creating a Changeset

When making changes that should trigger a release:

```bash
npx changeset
```

Select:
- **Patch** (0.0.X) - Bug fixes, minor updates
- **Minor** (0.X.0) - New features, non-breaking changes
- **Major** (X.0.0) - Breaking changes

### Publishing (Maintainers Only)

```bash
# 1. Version packages
pnpm changeset-version

# 2. Commit version changes
git add .
git commit -m "chore: release vX.Y.Z"

# 3. Build and test
pnpm build && pnpm test:ci

# 4. Publish
pnpm changeset-publish

# 5. Tag and push
git tag vX.Y.Z
git push origin main --tags
```

## Architecture Guidelines

### Generator Design Principles

1. **Effect-First**: Use Effect patterns (Context.Tag, Layer, Data.TaggedError)
2. **Template-Based**: Generate code from composable templates
3. **Type-Safe**: Leverage TypeScript for correctness
4. **Testable**: Design for easy testing and verification

### Code Style

- Use functional programming patterns
- Prefer immutability
- Use Effect for error handling and async operations
- Follow existing naming conventions
- Keep functions small and focused

### Documentation

- Add JSDoc comments to public APIs
- Update docs/ for architectural changes
- Include code examples in documentation
- Keep README.md up to date

## Need Help?

- Check the [documentation](./docs/)
- Review existing [issues](https://github.com/samuelho-dev/monorepo-library-generator/issues)
- Ask questions in pull request comments

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
