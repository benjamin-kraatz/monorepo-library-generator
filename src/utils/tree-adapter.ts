/**
 * Tree Adapter for Nx
 *
 * Wraps @nx/devkit Tree API to implement FileSystemAdapter interface.
 * This allows existing Nx generators to work with the abstraction layer
 * without any code changes.
 *
 * @module monorepo-library-generator/tree-adapter
 */

import type { Tree } from '@nx/devkit';
import { Effect } from 'effect';
import type { FileSystemAdapter } from './filesystem-adapter.js';
import {
  DirectoryCreationError,
  FileReadError,
  FileSystemError,
  FileWriteError,
} from './filesystem-adapter.js';

/**
 * Tree Adapter Implementation
 *
 * Wraps Nx Tree API and provides Effect-based interface
 */
export class TreeAdapter implements FileSystemAdapter {
  constructor(
    private readonly tree: Tree,
    private readonly mode: 'nx' | 'effect' = 'nx',
  ) {}

  /**
   * Write a file using Tree API
   *
   * Tree.write automatically creates parent directories
   */
  writeFile(
    path: string,
    content: string,
  ): Effect.Effect<void, FileWriteError | DirectoryCreationError> {
    return Effect.try({
      try: () => {
        this.tree.write(path, content);
      },
      catch: (error) =>
        new FileWriteError({
          path,
          content,
          cause: error,
        }),
    });
  }

  /**
   * Read a file using Tree API
   *
   * Tree.read returns Buffer | null
   */
  readFile(path: string): Effect.Effect<string, FileReadError> {
    return Effect.try({
      try: () => {
        const content = this.tree.read(path);
        if (content === null) {
          throw new Error(`File not found: ${path}`);
        }
        // Convert Buffer to string
        return content.toString('utf-8');
      },
      catch: (error) =>
        new FileReadError({
          path,
          cause: error,
        }),
    });
  }

  /**
   * Check if a file exists using Tree API
   */
  exists(path: string): Effect.Effect<boolean, FileSystemError> {
    return Effect.try({
      try: () => this.tree.exists(path),
      catch: (error) =>
        new FileSystemError({
          message: `Failed to check existence of: ${path}`,
          path,
          cause: error,
        }),
    });
  }

  /**
   * Create a directory using Tree API
   *
   * Note: Tree API doesn't have explicit directory creation.
   * Directories are created implicitly when files are written.
   * This is a no-op for Tree API.
   */
  makeDirectory(path: string): Effect.Effect<void, DirectoryCreationError> {
    return Effect.try({
      try: () => {
        // Tree API creates directories implicitly when writing files
        // No explicit directory creation needed
      },
      catch: (error) =>
        new DirectoryCreationError({
          path,
          cause: error,
        }),
    });
  }

  /**
   * List directory contents using Tree API
   */
  listDirectory(
    path: string,
  ): Effect.Effect<readonly string[], FileSystemError> {
    return Effect.try({
      try: () => {
        const children = this.tree.children(path);
        return children as readonly string[];
      },
      catch: (error) =>
        new FileSystemError({
          message: `Failed to list directory: ${path}`,
          path,
          cause: error,
        }),
    });
  }

  /**
   * Delete a file or directory using Tree API
   */
  remove(
    path: string,
    _options?: { recursive?: boolean },
  ): Effect.Effect<void, FileSystemError> {
    return Effect.try({
      try: () => {
        this.tree.delete(path);
      },
      catch: (error) =>
        new FileSystemError({
          message: `Failed to delete: ${path}`,
          path,
          cause: error,
        }),
    });
  }

  /**
   * Get workspace root from Tree
   */
  getWorkspaceRoot(): string {
    return this.tree.root;
  }

  /**
   * Get mode (always 'nx' for TreeAdapter)
   */
  getMode(): 'nx' | 'effect' {
    return this.mode;
  }
}

/**
 * Create a TreeAdapter from an Nx Tree
 *
 * @param tree - Nx Tree instance
 * @returns TreeAdapter instance
 */
export function createTreeAdapter(tree: Tree): TreeAdapter {
  return new TreeAdapter(tree);
}
