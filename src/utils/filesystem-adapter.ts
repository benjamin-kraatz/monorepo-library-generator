/**
 * File System Adapter
 *
 * Abstraction layer for file system operations that works with both:
 * - @nx/devkit Tree API (for Nx generators)
 * - @effect/platform FileSystem (for Effect CLI)
 *
 * This enables the same core logic to work in both Nx and Effect-native contexts.
 *
 * @module monorepo-library-generator/filesystem-adapter
 */

import { Context, Data } from "effect"
import type { Effect } from "effect"

/**
 * File System Errors
 *
 * Tagged errors following Effect patterns
 */
export class FileSystemError extends Data.TaggedError("FileSystemError")<{
  readonly message: string
  readonly path?: string
  readonly cause?: unknown
}> {}

export class FileNotFoundError extends Data.TaggedError("FileNotFoundError")<{
  readonly path: string
  readonly cause?: unknown
}> {}

export class DirectoryCreationError extends Data.TaggedError(
  "DirectoryCreationError"
)<{
  readonly path: string
  readonly cause?: unknown
}> {}

export class FileWriteError extends Data.TaggedError("FileWriteError")<{
  readonly path: string
  readonly content?: string
  readonly cause?: unknown
}> {}

export class FileReadError extends Data.TaggedError("FileReadError")<{
  readonly path: string
  readonly cause?: unknown
}> {}

/**
 * Type alias for all possible file system errors
 */
export type FileSystemErrors =
  | FileSystemError
  | FileNotFoundError
  | DirectoryCreationError
  | FileWriteError
  | FileReadError

/**
 * File System Adapter Interface
 *
 * Provides common file system operations that work across
 * both Nx Tree API and Effect platform FileSystem.
 */
export interface FileSystemAdapter {
  /**
   * Write a file to the specified path
   *
   * Creates parent directories if they don't exist.
   *
   * @param path - Absolute or relative file path
   * @param content - File content as string
   * @returns Effect that succeeds with void or fails with FileWriteError
   */
  writeFile(
    path: string,
    content: string
  ): Effect.Effect<void, FileWriteError | DirectoryCreationError, unknown>

  /**
   * Read a file from the specified path
   *
   * @param path - Absolute or relative file path
   * @returns Effect that succeeds with file content or fails with FileReadError
   */
  readFile(path: string): Effect.Effect<string, FileReadError, unknown>

  /**
   * Check if a file or directory exists
   *
   * @param path - Absolute or relative path
   * @returns Effect that succeeds with boolean (true if exists)
   */
  exists(path: string): Effect.Effect<boolean, FileSystemError, unknown>

  /**
   * Create a directory (including parent directories)
   *
   * @param path - Absolute or relative directory path
   * @returns Effect that succeeds with void or fails with DirectoryCreationError
   */
  makeDirectory(path: string): Effect.Effect<void, DirectoryCreationError, unknown>

  /**
   * List contents of a directory
   *
   * @param path - Absolute or relative directory path
   * @returns Effect that succeeds with array of file/directory names
   */
  listDirectory(
    path: string
  ): Effect.Effect<ReadonlyArray<string>, FileSystemError, unknown>

  /**
   * Delete a file or directory
   *
   * @param path - Absolute or relative path
   * @param recursive - If true, delete directories recursively
   * @returns Effect that succeeds with void or fails with FileSystemError
   */
  remove(
    path: string,
    options?: { recursive?: boolean }
  ): Effect.Effect<void, FileSystemError, unknown>

  /**
   * Get the root directory of the workspace
   *
   * @returns Workspace root path
   */
  getWorkspaceRoot(): string

  /**
   * Check if running in Nx mode or Effect mode
   *
   * @returns 'nx' or 'effect'
   */
  getMode(): "nx" | "effect"
}

export class FileSystemService extends Context.Tag("FileSystemService")<
  FileSystemService,
  FileSystemAdapter
>() {}
