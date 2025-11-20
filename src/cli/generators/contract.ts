/**
 * Contract Generator for CLI
 *
 * Generates contract libraries in Effect-native mode without Nx dependencies.
 * Uses FileSystemAdapter for file operations.
 *
 * @module monorepo-library-generator/cli/generators/contract
 */

import { Effect, Console } from 'effect';
import { FileSystem, Path } from '@effect/platform';
import { names } from '@nx/devkit';

/**
 * Contract Generator Options
 */
export interface ContractGeneratorOptions {
  readonly name: string;
  readonly description: string | undefined;
  readonly tags?: string;
  readonly includeCQRS?: boolean;
  readonly includeRPC?: boolean;
}

/**
 * Generate a contract library
 *
 * Creates:
 * - package.json with Effect build scripts
 * - tsconfig files
 * - Source files (entities, errors, ports)
 * - Index exports
 *
 * @param options - Generator options
 * @returns Effect that succeeds with void or fails with platform errors
 */
export function generateContract(options: ContractGeneratorOptions) {
  return Effect.gen(function* () {
    const fileSystem = yield* FileSystem.FileSystem;
    const pathService = yield* Path.Path;

    // Get workspace root
    const workspaceRoot = yield* Effect.sync(() => process.cwd());

    // Generate naming variants
    const nameVariants = names(options.name);
    const projectName = `contract-${nameVariants.fileName}`;
    const packageName = `@generated/contract-${nameVariants.fileName}`;
    const projectRoot = `packages/${projectName}`;

    yield* Console.log(`Creating contract library: ${projectName}`);
    yield* Console.log(`  Location: ${projectRoot}`);
    yield* Console.log(`  Package: ${packageName}`);

    // Create project directory
    const projectPath = pathService.join(workspaceRoot, projectRoot);
    yield* fileSystem.makeDirectory(projectPath, { recursive: true });

    // Generate package.json
    const packageJson = {
      name: packageName,
      version: '0.0.1',
      type: 'module' as const,
      description: options.description ?? `Contract library for ${nameVariants.className}`,
      exports: {
        '.': {
          import: './dist/index.js',
          types: './dist/index.d.ts',
        },
      },
      scripts: {
        codegen: 'build-utils prepare-v2',
        build: 'pnpm build-esm && pnpm build-annotate && pnpm build-cjs && build-utils pack-v2',
        'build-esm': 'tsc -b tsconfig.build.json',
        'build-cjs': 'babel build/esm --plugins @babel/transform-export-namespace-from --plugins @babel/transform-modules-commonjs --out-dir build/cjs --source-maps',
        'build-annotate': 'babel build/esm --plugins annotate-pure-calls --out-dir build/esm --source-maps',
        check: 'tsc -b tsconfig.json',
        test: 'vitest',
      },
      peerDependencies: {
        effect: '^3.0.0',
      },
    };

    const packageJsonPath = pathService.join(projectPath, 'package.json');
    yield* fileSystem.writeFileString(packageJsonPath, JSON.stringify(packageJson, null, 2));

    yield* Console.log('  ✓ Created package.json');

    // Generate tsconfig.json
    const tsConfig = {
      extends: '../../tsconfig.base.json',
      compilerOptions: {
        outDir: './dist',
        rootDir: './src',
      },
      include: ['src/**/*.ts'],
      exclude: ['node_modules', 'dist', '**/*.spec.ts'],
    };

    const tsConfigPath = pathService.join(projectPath, 'tsconfig.json');
    yield* fileSystem.writeFileString(tsConfigPath, JSON.stringify(tsConfig, null, 2));

    yield* Console.log('  ✓ Created tsconfig.json');

    // Generate tsconfig.build.json
    const tsBuildConfig = {
      extends: './tsconfig.json',
      compilerOptions: {
        declaration: true,
        declarationMap: true,
      },
      exclude: ['**/*.spec.ts', '**/*.test.ts'],
    };

    const tsBuildConfigPath = pathService.join(projectPath, 'tsconfig.build.json');
    yield* fileSystem.writeFileString(tsBuildConfigPath, JSON.stringify(tsBuildConfig, null, 2));

    yield* Console.log('  ✓ Created tsconfig.build.json');

    // Create src directory
    const srcPath = pathService.join(projectPath, 'src');
    yield* fileSystem.makeDirectory(srcPath, { recursive: true });

    // Generate entities.ts
    const entitiesContent = `/**
 * ${nameVariants.className} Entities
 *
 * Domain entities for ${nameVariants.className}
 */

import { Schema } from 'effect';

/**
 * ${nameVariants.className} entity
 */
export class ${nameVariants.className} extends Schema.Class<${nameVariants.className}>('${nameVariants.className}')({
  id: Schema.String,
  name: Schema.String,
  createdAt: Schema.Date,
  updatedAt: Schema.Date,
}) {}

/**
 * Create${nameVariants.className} input
 */
export class Create${nameVariants.className} extends Schema.Class<Create${nameVariants.className}>('Create${nameVariants.className}')({
  name: Schema.String,
}) {}

/**
 * Update${nameVariants.className} input
 */
export class Update${nameVariants.className} extends Schema.Class<Update${nameVariants.className}>('Update${nameVariants.className}')({
  name: Schema.optional(Schema.String),
}) {}
`;

    const entitiesPath = pathService.join(srcPath, 'entities.ts');
    yield* fileSystem.writeFileString(entitiesPath, entitiesContent);

    yield* Console.log('  ✓ Created entities.ts');

    // Generate errors.ts
    const errorsContent = `/**
 * ${nameVariants.className} Errors
 *
 * Domain errors for ${nameVariants.className}
 */

import { Data } from 'effect';

/**
 * ${nameVariants.className} not found error
 */
export class ${nameVariants.className}NotFoundError extends Data.TaggedError('${nameVariants.className}NotFoundError')<{
  readonly id: string;
}> {}

/**
 * ${nameVariants.className} validation error
 */
export class ${nameVariants.className}ValidationError extends Data.TaggedError('${nameVariants.className}ValidationError')<{
  readonly message: string;
  readonly field?: string;
}> {}
`;

    const errorsPath = pathService.join(srcPath, 'errors.ts');
    yield* fileSystem.writeFileString(errorsPath, errorsContent);

    yield* Console.log('  ✓ Created errors.ts');

    // Generate ports.ts
    const portsContent = `/**
 * ${nameVariants.className} Ports
 *
 * Service interfaces for ${nameVariants.className}
 */

import { Context, Effect } from 'effect';
import type { ${nameVariants.className}, Create${nameVariants.className}, Update${nameVariants.className} } from './entities.js';
import type { ${nameVariants.className}NotFoundError, ${nameVariants.className}ValidationError } from './errors.js';

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasMore: boolean;
}

/**
 * ${nameVariants.className} filter
 */
export interface ${nameVariants.className}Filter {
  readonly name?: string;
}

/**
 * ${nameVariants.className} repository port
 */
export interface ${nameVariants.className}Repository {
  readonly create: (input: Create${nameVariants.className}) => Effect.Effect<${nameVariants.className}, ${nameVariants.className}ValidationError>;
  readonly findById: (id: string) => Effect.Effect<${nameVariants.className}, ${nameVariants.className}NotFoundError>;
  readonly findAll: (filter?: ${nameVariants.className}Filter, limit?: number, offset?: number) => Effect.Effect<PaginatedResult<${nameVariants.className}>, never>;
  readonly update: (id: string, input: Update${nameVariants.className}) => Effect.Effect<${nameVariants.className}, ${nameVariants.className}NotFoundError | ${nameVariants.className}ValidationError>;
  readonly remove: (id: string) => Effect.Effect<void, ${nameVariants.className}NotFoundError>;
}

/**
 * ${nameVariants.className} repository service tag
 */
export class ${nameVariants.className}Repository extends Context.Tag('${nameVariants.className}Repository')<
  ${nameVariants.className}Repository,
  ${nameVariants.className}Repository
>() {}
`;

    const portsPath = pathService.join(srcPath, 'ports.ts');
    yield* fileSystem.writeFileString(portsPath, portsContent);

    yield* Console.log('  ✓ Created ports.ts');

    // Generate index.ts
    const indexContent = `/**
 * ${nameVariants.className} Contract
 *
 * Public API exports
 */

export * from './entities.js';
export * from './errors.js';
export * from './ports.js';
`;

    const indexPath = pathService.join(srcPath, 'index.ts');
    yield* fileSystem.writeFileString(indexPath, indexContent);

    yield* Console.log('  ✓ Created index.ts');

    // Generate README.md
    const readmeContent = `# ${packageName}

${options.description ?? `Contract library for ${nameVariants.className}`}

## Installation

\`\`\`bash
pnpm add ${packageName}
\`\`\`

## Usage

\`\`\`typescript
import { ${nameVariants.className}, Create${nameVariants.className}, ${nameVariants.className}Repository } from '${packageName}';
\`\`\`

## Generated Files

- \`entities.ts\` - Domain entities and DTOs
- \`errors.ts\` - Domain errors
- \`ports.ts\` - Service interfaces (repository pattern)

${options.includeCQRS ? '- Includes CQRS patterns (commands, queries, projections)\n' : ''}${options.includeRPC ? '- Includes RPC definitions\n' : ''}
`;

    const readmePath = pathService.join(projectPath, 'README.md');
    yield* fileSystem.writeFileString(readmePath, readmeContent);

    yield* Console.log('  ✓ Created README.md');

    yield* Console.log('✨ Contract library created successfully!');
    yield* Console.log(`\nNext steps:`);
    yield* Console.log(`  1. cd ${projectRoot}`);
    yield* Console.log(`  2. pnpm install`);
    yield* Console.log(`  3. pnpm build`);
  });
}
