/**
 * Effect FileSystem Adapter
 *
 * Wraps @effect/platform FileSystem to implement FileSystemAdapter interface.
 * This allows the CLI to work directly with the file system in Effect-native mode.
 *
 * @module monorepo-library-generator/effect-fs-adapter
 */

import { FileSystem, Path } from '@effect/platform';
import { Effect } from 'effect';
import type { FileSystemAdapter } from './filesystem-adapter.js';
import {
  DirectoryCreationError,
  FileReadError,
  FileSystemError,
  FileWriteError,
} from './filesystem-adapter.js';

/**
 * Effect FileSystem Adapter Implementation
 *
 * Wraps @effect/platform FileSystem for file operations
 * Note: Does not implement FileSystemAdapter due to context requirements
 */
export class EffectFsAdapter {
  constructor(
    private readonly workspaceRoot: string,
    private readonly mode: 'nx' | 'effect' = 'effect',
  ) {}

  /**
   * Write a file using @effect/platform FileSystem
   *
   * Creates parent directories if they don't exist
   */
  writeFile(path: string, content: string) {
    return Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const pathService = yield* Path.Path;

      // Resolve absolute path
      const absolutePath = pathService.isAbsolute(path)
        ? path
        : pathService.resolve(path);

      // Create parent directory
      const parentDir = pathService.dirname(absolutePath);
      yield* fs.makeDirectory(parentDir, { recursive: true }).pipe(
        Effect.mapError((error) =>
          new DirectoryCreationError({
            path: parentDir,
            cause: error,
          }),
        ),
      );

      // Write file
      yield* fs.writeFileString(absolutePath, content).pipe(
        Effect.mapError((error) =>
          new FileWriteError({
            path: absolutePath,
            content,
            cause: error,
          }),
        ),
      );
    });
  }

  /**
   * Read a file using @effect/platform FileSystem
   */
  readFile(path: string) {
    return Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const pathService = yield* Path.Path;

      // Resolve absolute path
      const absolutePath = pathService.isAbsolute(path)
        ? path
        : pathService.resolve(path);

      return yield* fs.readFileString(absolutePath).pipe(
        Effect.mapError((error) =>
          new FileReadError({
            path: absolutePath,
            cause: error,
          }),
        ),
      );
    });
  }

  /**
   * Check if a file exists using @effect/platform FileSystem
   */
  exists(path: string) {
    return Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const pathService = yield* Path.Path;

      // Resolve absolute path
      const absolutePath = pathService.isAbsolute(path)
        ? path
        : pathService.resolve(path);

      return yield* fs.exists(absolutePath).pipe(
        Effect.mapError((error) =>
          new FileSystemError({
            message: `Failed to check existence of: ${absolutePath}`,
            path: absolutePath,
            cause: error,
          }),
        ),
      );
    });
  }

  /**
   * Create a directory using @effect/platform FileSystem
   */
  makeDirectory(path: string) {
    return Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const pathService = yield* Path.Path;

      // Resolve absolute path
      const absolutePath = pathService.isAbsolute(path)
        ? path
        : pathService.resolve(path);

      yield* fs.makeDirectory(absolutePath, { recursive: true }).pipe(
        Effect.mapError((error) =>
          new DirectoryCreationError({
            path: absolutePath,
            cause: error,
          }),
        ),
      );
    });
  }

  /**
   * List directory contents using @effect/platform FileSystem
   */
  listDirectory(path: string) {
    return Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const pathService = yield* Path.Path;

      // Resolve absolute path
      const absolutePath = pathService.isAbsolute(path)
        ? path
        : pathService.resolve(path);

      return yield* fs.readDirectory(absolutePath).pipe(
        Effect.mapError((error) =>
          new FileSystemError({
            message: `Failed to list directory: ${absolutePath}`,
            path: absolutePath,
            cause: error,
          }),
        ),
      );
    });
  }

  /**
   * Delete a file or directory using @effect/platform FileSystem
   */
  remove(path: string, options?: { recursive?: boolean }) {
    return Effect.gen(function* () {
      const fs = yield* FileSystem.FileSystem;
      const pathService = yield* Path.Path;

      // Resolve absolute path
      const absolutePath = pathService.isAbsolute(path)
        ? path
        : pathService.resolve(path);

      yield* fs.remove(absolutePath, { recursive: options?.recursive ?? false }).pipe(
        Effect.mapError((error) =>
          new FileSystemError({
            message: `Failed to delete: ${absolutePath}`,
            path: absolutePath,
            cause: error,
          }),
        ),
      );
    });
  }

  /**
   * Get workspace root
   */
  getWorkspaceRoot(): string {
    return this.workspaceRoot;
  }

  /**
   * Get mode (always 'effect' for EffectFsAdapter)
   */
  getMode(): 'nx' | 'effect' {
    return this.mode;
  }
}

/**
 * Create an EffectFsAdapter for the current workspace
 *
 * @param workspaceRoot - Workspace root directory path
 * @returns EffectFsAdapter instance
 */
export function createEffectFsAdapter(workspaceRoot: string): EffectFsAdapter {
  return new EffectFsAdapter(workspaceRoot);
}
