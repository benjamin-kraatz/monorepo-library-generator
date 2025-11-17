/**
 * NX Tree FileSystem Adapter
 *
 * Adapts NX's virtual Tree abstraction to work with Effect Platform's FileSystem service.
 * This allows generators to use Effect-based file operations while maintaining
 * compatibility with NX's generator infrastructure.
 *
 * @module monorepo-library-generator/nx-tree-filesystem
 */

import type { FileSystem } from "@effect/platform"
import { Context, Effect, Layer } from "effect"
import * as Path from "node:path"

/**
 * NX Tree interface (minimal subset needed for file operations)
 */
export interface Tree {
  read(filePath: string, encoding?: BufferEncoding): Buffer | null
  write(filePath: string, content: Buffer | string): void
  exists(filePath: string): boolean
  delete(filePath: string): void
  children(dirPath: string): Array<string>
  isFile(filePath: string): boolean
  listChanges(): Array<{ path: string; type: "CREATE" | "UPDATE" | "DELETE"; content: Buffer | null }>
}

/**
 * NX Tree FileSystem Service
 *
 * Implements Effect Platform's FileSystem interface using NX Tree
 */
export class NxTreeFileSystem implements FileSystem.FileSystem {
  constructor(private readonly tree: Tree) {}

  /**
   * Write a file as a string
   */
  writeFileString(path: string, content: string): Effect.Effect<void> {
    return Effect.sync(() => {
      this.tree.write(path, content)
    })
  }

  /**
   * Read a file as a string
   */
  readFileString(path: string, encoding?: string): Effect.Effect<string> {
    return Effect.gen(() => {
      const buffer = this.tree.read(path, (encoding as BufferEncoding) || "utf8")
      if (buffer === null) {
        throw new Error(`File not found: ${path}`)
      }
      return buffer.toString((encoding as BufferEncoding) || "utf8")
    })
  }

  /**
   * Check if a file exists
   */
  exists(path: string): Effect.Effect<boolean> {
    return Effect.sync(() => this.tree.exists(path))
  }

  /**
   * Create a directory
   * Note: NX Tree handles directories automatically when writing files
   */
  makeDirectory(_path: string, _options?: { readonly recursive?: boolean }): Effect.Effect<void> {
    return Effect.void // NX Tree creates directories automatically
  }

  /**
   * Remove a file or directory
   */
  remove(path: string, _options?: { readonly recursive?: boolean }): Effect.Effect<void> {
    return Effect.sync(() => {
      if (this.tree.exists(path)) {
        this.tree.delete(path)
      }
    })
  }

  /**
   * Write a file as bytes
   */
  writeFile(path: string, content: Uint8Array): Effect.Effect<void> {
    return Effect.sync(() => {
      this.tree.write(path, Buffer.from(content))
    })
  }

  /**
   * Read a file as bytes
   */
  readFile(path: string): Effect.Effect<Uint8Array> {
    return Effect.gen(() => {
      const buffer = this.tree.read(path)
      if (buffer === null) {
        throw new Error(`File not found: ${path}`)
      }
      return new Uint8Array(buffer)
    })
  }

  /**
   * Read directory contents
   */
  readDirectory(path: string): Effect.Effect<ReadonlyArray<string>> {
    return Effect.sync(() => {
      if (!this.tree.exists(path)) {
        return []
      }
      return this.tree.children(path)
    })
  }

  /**
   * Copy a file
   */
  copy(fromPath: string, toPath: string): Effect.Effect<void> {
    return Effect.gen(() => {
      const content = this.tree.read(fromPath)
      if (content === null) {
        throw new Error(`File not found: ${fromPath}`)
      }
      this.tree.write(toPath, content)
    })
  }

  /**
   * Copy a directory recursively
   */
  copyTree(_fromPath: string, _toPath: string): Effect.Effect<void> {
    // Not commonly used in generators, can be implemented if needed
    return Effect.void
  }

  /**
   * Link a file (not supported by NX Tree)
   */
  link(_fromPath: string, _toPath: string): Effect.Effect<void> {
    return Effect.fail(new Error("File linking not supported by NX Tree"))
  }

  /**
   * Get file info
   */
  stat(path: string): Effect.Effect<FileSystem.File.Info> {
    return Effect.gen(() => {
      if (!this.tree.exists(path)) {
        throw new Error(`File not found: ${path}`)
      }

      const isFile = this.tree.isFile(path)

      // Mock file info since NX Tree doesn't provide detailed stats
      return {
        type: isFile ? "File" : "Directory",
        mtime: new Date(),
        atime: new Date(),
        birthtime: new Date(),
        dev: 0,
        rdev: 0,
        blksize: 0,
        ino: 0,
        size: isFile ? (this.tree.read(path)?.length || 0) : 0,
        blocks: 0,
        nlink: 0,
        uid: 0,
        gid: 0,
        mode: isFile ? 0o100644 : 0o040755
      } as FileSystem.File.Info
    })
  }

  /**
   * Check if path is a file
   */
  access(
    _path: string,
    _options?: { readonly ok?: boolean; readonly readable?: boolean; readonly writable?: boolean }
  ): Effect.Effect<void> {
    return Effect.void // NX Tree doesn't have access control
  }

  /**
   * Make a temporary file (not supported by NX Tree)
   */
  makeTempFile(): Effect.Effect<string> {
    return Effect.sync(() => {
      const tempPath = Path.join("/tmp", `nx-temp-${Date.now()}.tmp`)
      this.tree.write(tempPath, "")
      return tempPath
    })
  }

  /**
   * Make a temporary directory (not supported by NX Tree)
   */
  makeTempDirectory(): Effect.Effect<string> {
    return Effect.sync(() => {
      return Path.join("/tmp", `nx-temp-dir-${Date.now()}`)
    })
  }

  /**
   * Make a temporary file that is automatically cleaned up
   */
  makeTempFileScoped(): Effect.Effect<string, never, never> {
    return Effect.sync(() => {
      const tempPath = Path.join("/tmp", `nx-temp-scoped-${Date.now()}.tmp`)
      this.tree.write(tempPath, "")
      return tempPath
    })
  }

  /**
   * Make a temporary directory that is automatically cleaned up
   */
  makeTempDirectoryScoped(): Effect.Effect<string, never, never> {
    return Effect.sync(() => {
      return Path.join("/tmp", `nx-temp-dir-scoped-${Date.now()}`)
    })
  }

  /**
   * Get real path (resolve symlinks) - not applicable for NX Tree
   */
  realPath(path: string): Effect.Effect<string> {
    return Effect.succeed(path)
  }

  /**
   * Rename/move a file
   */
  rename(oldPath: string, newPath: string): Effect.Effect<void> {
    return Effect.gen(() => {
      const content = this.tree.read(oldPath)
      if (content === null) {
        throw new Error(`File not found: ${oldPath}`)
      }
      this.tree.write(newPath, content)
      this.tree.delete(oldPath)
    })
  }

  /**
   * Truncate a file
   */
  truncate(path: string, _length?: number): Effect.Effect<void> {
    return Effect.sync(() => {
      this.tree.write(path, "")
    })
  }

  /**
   * Change file permissions (not supported by NX Tree)
   */
  chmod(_path: string, _mode: number): Effect.Effect<void> {
    return Effect.void
  }

  /**
   * Change file ownership (not supported by NX Tree)
   */
  chown(_path: string, _uid: number, _gid: number): Effect.Effect<void> {
    return Effect.void
  }

  /**
   * Update file timestamps (not supported by NX Tree)
   */
  utimes(_path: string, _atime: Date | number, _mtime: Date | number): Effect.Effect<void> {
    return Effect.void
  }

  /**
   * Watch for file changes (not supported by NX Tree)
   */
  watch(_path: string): Effect.Effect<FileSystem.WatchEvent> {
    return Effect.fail(new Error("File watching not supported by NX Tree"))
  }

  /**
   * Create a readable stream (not commonly used in generators)
   */
  stream(_path: string): Effect.Effect<unknown> {
    return Effect.fail(new Error("Streaming not supported by NX Tree"))
  }

  /**
   * Create a writable sink (not commonly used in generators)
   */
  sink(_path: string, _options?: FileSystem.SinkOptions): Effect.Effect<unknown> {
    return Effect.fail(new Error("Sink not supported by NX Tree"))
  }
}

/**
 * Tag for the NX Tree FileSystem service
 */
export class NxTreeFileSystemTag extends Context.Tag("NxTreeFileSystem")<
  NxTreeFileSystemTag,
  FileSystem.FileSystem
>() {}

/**
 * Create a Layer that provides FileSystem implementation using NX Tree
 *
 * @example
 * ```typescript
 * import { Tree, formatFiles } from '@nx/devkit';
 * import { NxTreeFileSystemLayer } from './nx-tree-filesystem';
 * import { GeneratorFileWriter } from './file-writer';
 *
 * export default async function myGenerator(tree: Tree, schema: Schema) {
 *   const files = [
 *     { path: 'foo.ts', content: 'export const foo = "bar";' }
 *   ];
 *
 *   await Effect.runPromise(
 *     GeneratorFileWriter.writeFiles(files).pipe(
 *       Effect.provide(NxTreeFileSystemLayer(tree))
 *     )
 *   );
 *
 *   await formatFiles(tree);
 * }
 * ```
 */
export const NxTreeFileSystemLayer = (tree: Tree): Layer.Layer<FileSystem.FileSystem> =>
  Layer.succeed(FileSystem.FileSystem, new NxTreeFileSystem(tree))

/**
 * Helper to run an Effect-based file operation within an NX generator
 *
 * @example
 * ```typescript
 * import { Tree } from '@nx/devkit';
 * import { runWithNxTree } from './nx-tree-filesystem';
 * import { GeneratorFileWriter } from './file-writer';
 *
 * export default async function myGenerator(tree: Tree, schema: Schema) {
 *   await runWithNxTree(tree, () =>
 *     GeneratorFileWriter.writeFile('/path/to/file.ts', 'content')
 *   );
 * }
 * ```
 */
export const runWithNxTree = <A, E>(
  tree: Tree,
  effect: Effect.Effect<A, E, FileSystem.FileSystem>
): Promise<A> =>
  Effect.runPromise(
    effect.pipe(
      Effect.provide(NxTreeFileSystemLayer(tree))
    )
  )
