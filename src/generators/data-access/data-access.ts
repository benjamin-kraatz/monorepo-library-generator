/**
 * Data Access Library Generator (Nx Wrapper)
 *
 * Wrapper that integrates data-access generator core with Nx workspace.
 *
 * Responsibilities:
 * - Computes library metadata via computeLibraryMetadata()
 * - Generates infrastructure files (package.json, tsconfig, project.json)
 * - Delegates domain file generation to core generator
 * - Formats files and provides post-generation instructions
 */

import type { Tree } from "@nx/devkit"
import { formatFiles } from "@nx/devkit"
import { Effect } from "effect"
import type { FileSystemErrors } from "../../utils/filesystem-adapter"
import { parseTags } from "../../utils/generator-utils"
import { generateLibraryFiles, type LibraryGeneratorOptions } from "../../utils/library-generator-utils"
import { computeLibraryMetadata } from "../../utils/library-metadata"
import { createTreeAdapter } from "../../utils/tree-adapter"
import { generateDataAccessCore, type GeneratorResult } from "../core/data-access-generator-core"
import type { DataAccessGeneratorSchema } from "./schema"

/**
 * Data Access Generator for Nx Workspaces
 *
 * Two-phase generation process:
 * 1. Infrastructure Phase: Generates package.json, tsconfig, project.json via generateLibraryFiles()
 * 2. Domain Phase: Generates domain-specific files via core generator
 *
 * @param tree - Nx Tree API for virtual file system operations
 * @param schema - User-provided generator options
 * @returns Callback function that displays post-generation instructions
 */
export default async function dataAccessGenerator(
  tree: Tree,
  schema: DataAccessGeneratorSchema
) {
  // Validate required fields
  if (!schema.name || schema.name.trim() === "") {
    throw new Error("Data access name is required and cannot be empty")
  }

  // Compute library metadata (single source of truth)
  const metadata = computeLibraryMetadata(
    tree,
    schema,
    "data-access",
    ["scope:shared", "platform:server"]
  )

  // Parse tags from metadata
  const tags = metadata.tags.split(",").map(t => t.trim())

  // Phase 1: Generate infrastructure files
  const libraryOptions: LibraryGeneratorOptions = {
    name: metadata.name,
    projectName: metadata.projectName,
    projectRoot: metadata.projectRoot,
    offsetFromRoot: metadata.offsetFromRoot,
    libraryType: "data-access",
    platform: "node",
    description: metadata.description,
    tags
  }

  await generateLibraryFiles(tree, libraryOptions)

  // Phase 2: Generate domain-specific files via core generator
  const adapter = createTreeAdapter(tree)
  const coreOptions: Parameters<typeof generateDataAccessCore>[1] = {
    // Pre-computed metadata
    name: metadata.name,
    className: metadata.className,
    propertyName: metadata.propertyName,
    fileName: metadata.fileName,
    constantName: metadata.constantName,
    projectName: metadata.projectName,
    projectRoot: metadata.projectRoot,
    sourceRoot: metadata.sourceRoot,
    packageName: metadata.packageName,
    offsetFromRoot: metadata.offsetFromRoot,
    description: metadata.description,
    tags: metadata.tags
  }

  // Run core generator with Effect runtime
  const result = await Effect.runPromise(
    generateDataAccessCore(adapter, coreOptions) as Effect.Effect<GeneratorResult, FileSystemErrors, never>
  )

  // Format generated files
  await formatFiles(tree)

  // Return post-generation callback
  return () => {
    console.log(`
✅ Data Access library created: ${result.packageName}

📁 Location: ${result.projectRoot}
📦 Package: ${result.packageName}
📂 Files generated: ${result.filesGenerated.length}

🎯 Next Steps:
1. Customize repository implementation (see TODO comments):
   - ${result.sourceRoot}/lib/repository.ts - Implement CRUD operations
   - ${result.sourceRoot}/lib/queries.ts    - Add query builders
   - ${result.sourceRoot}/lib/shared/types.ts - Define entity types

2. Build and test:
   - pnpm exec nx build ${result.projectName} --batch
   - pnpm exec nx test ${result.projectName}

3. Auto-sync TypeScript project references:
   - pnpm exec nx sync

📚 Documentation:
   - See /libs/ARCHITECTURE.md for repository patterns
   - See ${result.projectRoot}/README.md for usage examples
    `)
  }
}
