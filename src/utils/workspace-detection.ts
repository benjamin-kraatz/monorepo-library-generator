/**
 * Workspace Detection Utilities
 *
 * Detects whether the current workspace is:
 * - Nx monorepo (project.json, nx.json)
 * - Effect native monorepo (pnpm workspace with @effect/build-utils)
 *
 * @module monorepo-library-generator/workspace-detection
 */

import type { Tree } from '@nx/devkit';
import type { GeneratorContext } from './shared/types';

/**
 * Detect workspace type and configuration
 *
 * @param tree - Virtual file system
 * @returns Generator context with workspace information
 */
export function detectWorkspace(tree: Tree): GeneratorContext {
  const isNxWorkspace = detectNxWorkspace(tree);
  const isEffectNative = detectEffectNative(tree);
  const packageManager = detectPackageManager(tree);
  const workspaceRoot = tree.root;

  return {
    workspaceRoot,
    packageManager,
    isNxWorkspace,
    isEffectNative,
  };
}

/**
 * Check if workspace uses Nx
 *
 * Nx workspaces have:
 * - nx.json configuration file
 * - OR packages have project.json files
 */
function detectNxWorkspace(tree: Tree): boolean {
  // Check for nx.json at root
  if (tree.exists('nx.json')) {
    return true;
  }

  // Check for any project.json files (indicates Nx project structure)
  const hasProjectJson = tree
    .listChanges()
    .some((change) => change.path.includes('project.json'));

  return hasProjectJson;
}

/**
 * Check if workspace is Effect native monorepo
 *
 * Effect monorepos have:
 * - pnpm-workspace.yaml
 * - Root package.json uses @effect/build-utils
 * - Packages under packages/ directory
 */
function detectEffectNative(tree: Tree): boolean {
  // Must have pnpm workspace
  if (!tree.exists('pnpm-workspace.yaml')) {
    return false;
  }

  // Check root package.json for @effect/build-utils
  if (!tree.exists('package.json')) {
    return false;
  }

  const packageJsonContent = tree.read('package.json', 'utf-8');
  if (!packageJsonContent) {
    return false;
  }

  try {
    const packageJson = JSON.parse(packageJsonContent);

    // Check for @effect/build-utils in devDependencies
    const hasEffectBuildUtils =
      packageJson.devDependencies?.['@effect/build-utils'] !== undefined;

    // Check for Effect-style scripts (codegen using build-utils)
    const hasEffectScripts =
      packageJson.scripts?.['codegen']?.includes('build-utils') === true;

    return hasEffectBuildUtils || hasEffectScripts;
  } catch {
    return false;
  }
}

/**
 * Detect package manager from lock files
 */
function detectPackageManager(
  tree: Tree,
): 'npm' | 'yarn' | 'pnpm' {
  if (tree.exists('pnpm-lock.yaml')) {
    return 'pnpm';
  }
  if (tree.exists('yarn.lock')) {
    return 'yarn';
  }
  return 'npm';
}

/**
 * Get build mode based on workspace type
 *
 * @param context - Generator context
 * @returns 'nx' or 'effect'
 */
export function getBuildMode(context: GeneratorContext): 'nx' | 'effect' {
  // Nx takes precedence if both are detected
  if (context.isNxWorkspace) {
    return 'nx';
  }
  if (context.isEffectNative) {
    return 'effect';
  }

  // Default to Nx for backwards compatibility
  return 'nx';
}

/**
 * Check if project.json should be generated
 *
 * @param context - Generator context
 * @returns true if project.json should be created
 */
export function shouldGenerateProjectJson(context: GeneratorContext): boolean {
  return context.isNxWorkspace;
}

/**
 * Check if Effect build scripts should be generated
 *
 * @param context - Generator context
 * @returns true if Effect scripts should be added to package.json
 */
export function shouldGenerateEffectScripts(
  context: GeneratorContext,
): boolean {
  return context.isEffectNative;
}
