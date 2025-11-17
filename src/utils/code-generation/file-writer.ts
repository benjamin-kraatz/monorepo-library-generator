/**
 * Effect FileSystem Writer
 *
 * Type-safe file writing utilities using Effect Platform's FileSystem service.
 * Provides structured error handling, telemetry, and composable file operations.
 *
 * @module monorepo-library-generator/file-writer
 */

import { FileSystem } from "@effect/platform"
import { Data, Effect } from "effect"
import * as Path from "node:path"

/**
 * Error thrown when file generation fails
 */
export class FileGenerationError extends Data.TaggedError("FileGenerationError")<{
  readonly message: string
  readonly path?: string
  readonly cause?: unknown
}> {
  static create(message: string, path?: string, cause?: unknown) {
    return new FileGenerationError({ message, path, cause })
  }
}

/**
 * Represents a file to be generated
 */
export interface GeneratedFile {
  readonly path: string
  readonly content: string
}

/**
 * Options for writing files
 */
export interface WriteFileOptions {
  readonly encoding?: "utf8" | "utf-8"
  readonly createDirs?: boolean
}

/**
 * Options for writing multiple files
 */
export interface WriteFilesOptions extends WriteFileOptions {
  readonly concurrency?: "unbounded" | "inherit" | number
}

/**
 * File writer using Effect Platform FileSystem
 */
export class GeneratorFileWriter {
  /**
   * Write a single file to the filesystem
   *
   * @example
   * ```typescript
   * const program = GeneratorFileWriter.writeFile(
   *   '/path/to/file.ts',
   *   'export const foo = "bar";'
   * );
   *
   * await Effect.runPromise(
   *   program.pipe(Effect.provide(NodeFileSystem.layer))
   * );
   * ```
   */
  static writeFile(
    path: string,
    content: string,
    options: WriteFileOptions = {}
  ): Effect.Effect<void, FileGenerationError, FileSystem.FileSystem> {
    return Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem

      // Ensure directory exists if requested
      if (options.createDirs !== false) {
        const dir = Path.dirname(path)
        yield* fs.makeDirectory(dir, { recursive: true }).pipe(
          Effect.mapError((cause) =>
            FileGenerationError.create(
              `Failed to create directory: ${dir}`,
              path,
              cause
            )
          )
        )
      }

      // Write file
      yield* fs.writeFileString(path, content, options.encoding || "utf8").pipe(
        Effect.mapError((cause) =>
          FileGenerationError.create(
            `Failed to write file: ${path}`,
            path,
            cause
          )
        )
      )

      // Log success with tracing
      yield* Effect.logDebug(`Generated file: ${path}`).pipe(
        Effect.annotateLogs({ filePath: path, fileSize: content.length })
      )
    }).pipe(
      Effect.withSpan("GeneratorFileWriter.writeFile", {
        attributes: { filePath: path, contentLength: content.length }
      })
    )
  }

  /**
   * Write multiple files in batch
   *
   * @example
   * ```typescript
   * const files = [
   *   { path: '/path/to/errors.ts', content: errorsContent },
   *   { path: '/path/to/entities.ts', content: entitiesContent }
   * ];
   *
   * const program = GeneratorFileWriter.writeFiles(files);
   *
   * await Effect.runPromise(
   *   program.pipe(Effect.provide(NodeFileSystem.layer))
   * );
   * ```
   */
  static writeFiles(
    files: ReadonlyArray<GeneratedFile>,
    options: WriteFilesOptions = {}
  ): Effect.Effect<void, FileGenerationError, FileSystem.FileSystem> {
    return Effect.gen(function*() {
      yield* Effect.logInfo(`Generating ${files.length} files`)

      const effects = files.map((file) => GeneratorFileWriter.writeFile(file.path, file.content, options))

      yield* Effect.all(effects, {
        concurrency: options.concurrency || "unbounded",
        discard: true
      })

      yield* Effect.logInfo(`Successfully generated ${files.length} files`)
    }).pipe(
      Effect.withSpan("GeneratorFileWriter.writeFiles", {
        attributes: { fileCount: files.length }
      })
    )
  }

  /**
   * Check if a file exists
   */
  static fileExists(
    path: string
  ): Effect.Effect<boolean, FileGenerationError, FileSystem.FileSystem> {
    return Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem

      return yield* fs.exists(path).pipe(
        Effect.mapError((cause) =>
          FileGenerationError.create(
            `Failed to check if file exists: ${path}`,
            path,
            cause
          )
        )
      )
    })
  }

  /**
   * Read a file's contents
   */
  static readFile(
    path: string,
    encoding: "utf8" | "utf-8" = "utf8"
  ): Effect.Effect<string, FileGenerationError, FileSystem.FileSystem> {
    return Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem

      return yield* fs.readFileString(path, encoding).pipe(
        Effect.mapError((cause) =>
          FileGenerationError.create(
            `Failed to read file: ${path}`,
            path,
            cause
          )
        )
      )
    })
  }

  /**
   * Delete a file
   */
  static deleteFile(
    path: string
  ): Effect.Effect<void, FileGenerationError, FileSystem.FileSystem> {
    return Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem

      yield* fs.remove(path, { recursive: false }).pipe(
        Effect.mapError((cause) =>
          FileGenerationError.create(
            `Failed to delete file: ${path}`,
            path,
            cause
          )
        )
      )

      yield* Effect.logDebug(`Deleted file: ${path}`)
    })
  }

  /**
   * Delete a directory and all its contents
   */
  static deleteDirectory(
    path: string
  ): Effect.Effect<void, FileGenerationError, FileSystem.FileSystem> {
    return Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem

      yield* fs.remove(path, { recursive: true }).pipe(
        Effect.mapError((cause) =>
          FileGenerationError.create(
            `Failed to delete directory: ${path}`,
            path,
            cause
          )
        )
      )

      yield* Effect.logDebug(`Deleted directory: ${path}`)
    })
  }

  /**
   * Create a directory
   */
  static createDirectory(
    path: string,
    recursive = true
  ): Effect.Effect<void, FileGenerationError, FileSystem.FileSystem> {
    return Effect.gen(function*() {
      const fs = yield* FileSystem.FileSystem

      yield* fs.makeDirectory(path, { recursive }).pipe(
        Effect.mapError((cause) =>
          FileGenerationError.create(
            `Failed to create directory: ${path}`,
            path,
            cause
          )
        )
      )

      yield* Effect.logDebug(`Created directory: ${path}`)
    })
  }

  /**
   * Copy a file from source to destination
   */
  static copyFile(
    source: string,
    destination: string,
    options: WriteFileOptions = {}
  ): Effect.Effect<void, FileGenerationError, FileSystem.FileSystem> {
    return Effect.gen(function*() {
      const content = yield* GeneratorFileWriter.readFile(source)
      yield* GeneratorFileWriter.writeFile(destination, content, options)

      yield* Effect.logDebug(`Copied file: ${source} -> ${destination}`)
    }).pipe(
      Effect.withSpan("GeneratorFileWriter.copyFile", {
        attributes: { source, destination }
      })
    )
  }

  /**
   * Write file only if it doesn't exist
   */
  static writeFileIfNotExists(
    path: string,
    content: string,
    options: WriteFileOptions = {}
  ): Effect.Effect<boolean, FileGenerationError, FileSystem.FileSystem> {
    return Effect.gen(function*() {
      const exists = yield* GeneratorFileWriter.fileExists(path)

      if (exists) {
        yield* Effect.logDebug(`Skipping existing file: ${path}`)
        return false
      }

      yield* GeneratorFileWriter.writeFile(path, content, options)
      return true
    })
  }

  /**
   * Write files with validation
   *
   * Validates generated content before writing to filesystem
   */
  static writeFilesWithValidation<E>(
    files: ReadonlyArray<GeneratedFile>,
    validator: (content: string, path: string) => Effect.Effect<void, E>,
    options: WriteFilesOptions = {}
  ): Effect.Effect<void, FileGenerationError | E, FileSystem.FileSystem> {
    return Effect.gen(function*() {
      yield* Effect.logInfo(`Validating ${files.length} files before writing`)

      // Validate all files first
      for (const file of files) {
        yield* validator(file.content, file.path).pipe(
          Effect.mapError((error) =>
            FileGenerationError.create(
              `Validation failed for ${file.path}`,
              file.path,
              error
            )
          )
        )
      }

      yield* Effect.logInfo("All files validated successfully")

      // Write all files
      yield* GeneratorFileWriter.writeFiles(files, options)
    })
  }
}
