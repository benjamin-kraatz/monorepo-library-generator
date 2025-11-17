# Testing Strategy

This project uses a dual-configuration testing approach optimized for both local development and CI/CD pipelines.

## Quick Reference

```bash
# Local Development (Fast - ~1-2 seconds)
pnpm test              # Run unit tests only
pnpm test:watch        # Watch mode for TDD

# CI/CD & Validation (Comprehensive - ~1-2 minutes)
pnpm test:ci           # Full test suite including generators
pnpm test:generators   # Only NX generator tests

# Coverage
pnpm coverage          # Generate coverage report
```

## Configuration Files

### `vitest.config.local.ts` (Default)
- **Purpose**: Fast feedback during development
- **Includes**: Unit tests only (`test/**/*.test.ts`)
- **Excludes**: Slow NX generator tests (`src/**/*.spec.ts`)
- **Timeout**: 5 seconds
- **Usage**: `pnpm test` or `vitest`

### `vitest.config.ci.ts` (CI/CD)
- **Purpose**: Comprehensive validation for continuous integration
- **Includes**: All tests (unit + generator tests)
- **Configuration**:
  - 60-second timeout for NX workspace creation
  - Sequential file execution (`fileParallelism: false`)
  - Prevents NX graph construction conflicts
- **Usage**: `pnpm test:ci`

### `vitest.config.ts` (Router)
- Defaults to local config for fast development
- Can be overridden via explicit config selection

## Test Types

### Unit Tests (`test/**/*.test.ts`)
**Characteristics:**
- Fast execution (< 100ms per test)
- No external dependencies
- Test pure functions and utilities

**Example:**
```typescript
// test/Dummy.test.ts
describe("Dummy", () => {
  it("should pass", () => {
    expect(true).toBe(true);
  });
});
```

### Generator Tests (`src/**/*.spec.ts`)
**Characteristics:**
- Slow execution (30-60s per test)
- Tests NX workspace generators
- Uses `createTreeWithEmptyWorkspace()` from `@nx/devkit/testing`
- Requires sequential execution to avoid graph conflicts

**Example:**
```typescript
// src/generators/contract/contract.spec.ts
describe("Contract Generator", () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace(); // Virtual file system
  });

  it("should generate all base files", async () => {
    await contractGenerator(tree, { name: "product" });
    expect(tree.exists("libs/contract/product/src/lib/entities.ts")).toBe(true);
  });
});
```

## Best Practices

### Local Development
1. **Use `pnpm test`** for quick feedback
2. **Run `pnpm test:watch`** for TDD workflow
3. **Test generators manually** when needed with `pnpm test:generators`

### Continuous Integration
1. **GitHub Actions should use `pnpm test:ci`**
2. **Set timeout in CI config** to at least 10 minutes
3. **Cache dependencies** to speed up subsequent runs

### Writing Tests

#### ✅ DO:
- Keep unit tests fast and isolated
- Use `beforeEach()` for test setup (maintains isolation)
- Follow NX devkit patterns for generator tests
- Test one concern per test case

#### ❌ DON'T:
- Share state between tests (use `beforeAll()` for generators)
- Run generator tests in parallel (causes NX conflicts)
- Create overly complex test scenarios
- Mix unit and integration test concerns

## Performance Considerations

### Why Generator Tests Are Slow
NX generator tests use `createTreeWithEmptyWorkspace()` which:
1. Creates a virtual file system
2. Constructs an NX project graph
3. Simulates workspace operations

This process takes 20-60 seconds per test file.

### Optimization Strategies
1. **Local Development**: Skip generator tests entirely
2. **CI/CD**: Run sequentially with `fileParallelism: false`
3. **Manual Testing**: Use `--dry-run` flag with generators:
   ```bash
   pnpm exec nx g @workspace:contract product --dry-run
   ```

## Troubleshooting

### Tests Hanging/Timing Out
**Problem**: Generator tests timeout or system becomes unresponsive

**Solution**:
```bash
# Kill all vitest processes
pkill -9 -f vitest

# Verify cleanup
ps aux | grep vitest
```

### NX Graph Construction Conflicts
**Problem**: Multiple tests waiting for "graph construction in another process"

**Solution**: Use `pnpm test:ci` which runs tests sequentially

### "Project not found in graph" Warnings
**Problem**: Warnings about projects not found in NX graph during tests

**Solution**: These are expected in virtual workspace tests - can be ignored

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Test
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 10

    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Run tests
        run: pnpm test:ci
```

## Quick Kill Command

If tests are consuming too many resources:

```bash
# Nuclear option - kill all vitest processes
pkill -9 -f vitest && echo "✅ All vitest processes killed"
```

## References

- [Vitest Documentation](https://vitest.dev/)
- [Vitest Performance Guide](https://vitest.dev/guide/improving-performance)
- [NX Devkit Testing](https://nx.dev/reference/core-api/devkit)
- [NX Generator Testing Discussion](https://github.com/nrwl/nx/discussions/19945)
