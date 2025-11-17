/**
 * Unified Build Configuration Utilities
 *
 * Provides standardized build configurations for all library types with
 * platform-specific optimizations using @nx/esbuild:esbuild executor.
 */

import type { TargetConfiguration } from '@nx/devkit';
import { determinePlatformExports } from './platform-utils.js';

export type PlatformType = 'node' | 'universal' | 'browser' | 'edge';
export type LibraryType =
  | 'contract'
  | 'data-access'
  | 'feature'
  | 'provider'
  | 'infra'
  | 'util';

export interface BuildConfigOptions {
  projectRoot: string;
  platform: PlatformType;
  libraryType: LibraryType;
  includeClientServer?: boolean;
  additionalEntryPoints?: Array<string>;
}

/**
 * Get platform-specific build configuration
 */
function _getPlatformConfig(platform: PlatformType) {
  switch (platform) {
    case 'node':
      return {
        platform: 'node' as const,
        target: 'node20',
        format: ['cjs'] as const,
      };
    case 'browser':
      return {
        platform: 'browser' as const,
        target: 'es2022',
        format: ['esm'] as const,
      };
    case 'edge':
      return {
        platform: 'neutral' as const,
        target: 'es2022',
        format: ['esm'] as const,
      };
    case 'universal':
    default:
      return {
        platform: 'neutral' as const,
        target: 'es2022',
        format: ['cjs', 'esm'] as const,
      };
  }
}

/**
 * Get library-type specific external dependencies
 */
function _getLibraryExternals(libraryType: LibraryType) {
  const baseExternals = ['effect', '@effect', '@custom-repo/*'];

  switch (libraryType) {
    case 'contract':
      // Contract libraries are pure type/schema definitions
      return baseExternals;
    case 'data-access':
      return [
        ...baseExternals,
        'db',
        '@prisma/client',
        'kysely',
        '@supabase/supabase-js',
      ];
    case 'infra':
      return [
        ...baseExternals,
        'redis',
        'aws-sdk',
        '@supabase/supabase-js',
        'fastify',
      ];
    case 'provider':
      return [
        ...baseExternals,
        // Provider libs will have their own SDK dependencies
        // but we keep it minimal for the template
      ];
    case 'feature':
      return [...baseExternals, 'react', 'react-dom', 'next'];
    default:
      return baseExternals;
  }
}

/**
 * Generate additional entry points based on library type and options
 */
function getAdditionalEntryPoints(options: BuildConfigOptions) {
  const {
    additionalEntryPoints = [],
    includeClientServer,
    libraryType,
    platform,
    projectRoot,
  } = options;

  const entryPoints = [...additionalEntryPoints];

  // Use shared platform utilities for consistent logic
  const { shouldGenerateClient, shouldGenerateServer } =
    determinePlatformExports({
      libraryType,
      platform,
      includeClientServer,
    });

  if (shouldGenerateServer) {
    entryPoints.push(`${projectRoot}/src/server.ts`);
  }

  if (shouldGenerateClient) {
    entryPoints.push(`${projectRoot}/src/client.ts`);
  }

  // Library-type specific entry points
  switch (libraryType) {
    case 'data-access':
      // Data-access libraries have NO platform splits per dataaccess.md documentation
      // All exports in index.ts only - no server.ts/client.ts/edge.ts
      // The logic above at lines 112-119 already handles the exception correctly
      break;
    case 'provider':
      // Provider libs may have separate client/server implementations
      break;
    case 'infra':
      // Infrastructure is typically server-only
      if (!entryPoints.includes(`${projectRoot}/src/server.ts`)) {
        entryPoints.push(`${projectRoot}/src/server.ts`);
      }
      break;
    case 'feature':
      // Features may have client exports for UI components
      break;
  }

  return entryPoints;
}

/**
 * Create unified build target configuration using TypeScript compiler
 */
export function createUnifiedBuildTarget(options: BuildConfigOptions) {
  const additionalEntryPoints = getAdditionalEntryPoints(options);

  return {
    executor: '@nx/js:tsc',
    outputs: ['{options.outputPath}'],
    options: {
      outputPath: `dist/${options.projectRoot}`,
      main: `${options.projectRoot}/src/index.ts`,
      tsConfig: `${options.projectRoot}/tsconfig.lib.json`,
      ...(additionalEntryPoints.length > 0 && { additionalEntryPoints }),
      assets: [`${options.projectRoot}/*.md`],

      // TypeScript compiler options for optimal incremental builds
      // Enable batch mode for TypeScript project references
      // See: https://nx.dev/recipes/tips-n-tricks/enable-tsc-batch-mode
      batch: true, // Enable TypeScript project references mode
      declaration: true, // Generate .d.ts files (required for composite mode)
      declarationMap: true, // Generate .d.ts.map for IDE navigation
      clean: false, // Preserve .tsbuildinfo for TypeScript incremental compilation
    },
  };
}

/**
 * Create standard test target configuration
 * Uses vitest for all projects
 */
export function createTestTarget(projectRoot: string) {
  return {
    executor: '@nx/vite:test',
    outputs: ['{workspaceRoot}/coverage/{projectRoot}'],
    options: {
      config: `${projectRoot}/vitest.config.ts`,
      passWithNoTests: true,
    },
  };
}

/**
 * Create standard lint target configuration
 */
export function createLintTarget(projectRoot: string) {
  return {
    executor: '@nx/eslint:lint',
    outputs: ['{options.outputFile}'],
    options: {
      lintFilePatterns: [`${projectRoot}/**/*.ts`],
    },
  };
}

/**
 * Create typecheck target configuration
 */
export function createTypecheckTarget(projectRoot: string) {
  return {
    executor: 'nx:run-commands',
    options: {
      command: `tsc --noEmit -p ${projectRoot}/tsconfig.lib.json`,
    },
  };
}

/**
 * Create complete target configuration object
 */
export function createStandardTargets(options: BuildConfigOptions) {
  const targets: Record<string, TargetConfiguration> = {
    build: createUnifiedBuildTarget(options),
    lint: createLintTarget(options.projectRoot),
    typecheck: createTypecheckTarget(options.projectRoot),
  };

  targets.test = createTestTarget(options.projectRoot);

  return targets;
}
