/**
 * Data Access Library Generator (Nx Wrapper)
 *
 * Thin wrapper around the shared data-access generator core.
 * Uses Nx Tree API via TreeAdapter.
 */

import type { Tree } from "@nx/devkit"
import { formatFiles } from "@nx/devkit"
import { Effect } from "effect"
import { parseTags } from "../../utils/generator-utils"
import { generateLibraryFiles } from "../../utils/library-generator-utils"
import { standardizeGeneratorOptions, type NormalizedBaseOptions } from "../../utils/normalization-utils"
import { createTreeAdapter } from "../../utils/tree-adapter"
import { detectWorkspaceConfig, type WorkspaceConfig } from "../../utils/workspace-detection"
import { generateDataAccessCore, type GeneratorResult } from "../core/data-access-generator-core"
import type { DataAccessGeneratorSchema } from "./schema"

/**
 * Normalized options with computed values
 */
type NormalizedDataAccessOptions = NormalizedBaseOptions

/**
 * Data access generator for Nx workspaces
 *
 * Generates a data-access library following Effect-based repository patterns.
 * Creates repositories, queries, and data layers.
 *
 * @param tree - Nx Tree API for virtual file system
 * @param schema - Generator options from user
 * @returns Callback function for post-generation console output
 */
export default async function dataAccessGenerator(
  tree: Tree,
  schema: DataAccessGeneratorSchema
) {
  // Validate required fields
  if (!schema.name || schema.name.trim() === "") {
    throw new Error("Data access name is required and cannot be empty")
  }

  const options = normalizeOptions(tree, schema)

  // Build tags using shared tag utility
  const defaultTags = [
    "type:data-access",
    "scope:shared",
    "platform:server"
  ]
  const tags = parseTags(schema.tags, defaultTags)

  // 1. Generate base library files using centralized utility
  const libraryOptions = {
    name: options.name,
    projectName: options.projectName,
    projectRoot: options.projectRoot,
    offsetFromRoot: options.offsetFromRoot,
    libraryType: "data-access" as const,
    platform: "node" as const,
    description: options.description,
    tags
  }

  await generateLibraryFiles(tree, libraryOptions)

  // 2. Generate domain-specific files using shared core
  const adapter = createTreeAdapter(tree)
  const coreOptions: Parameters<typeof generateDataAccessCore>[1] = {
    name: schema.name,
    ...(schema.description && { description: schema.description }),
    ...(schema.directory && { directory: schema.directory }),
    workspaceRoot: tree.root
  }

  // 3. Run core generator with Effect runtime
  const result: GeneratorResult = await Effect.runPromise(
    generateDataAccessCore(adapter, coreOptions) as Effect.Effect<GeneratorResult, never>
  )

  // 4. Format files
  await formatFiles(tree)

  // 5. Return post-generation instructions
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

/**
 * Normalize options with defaults and computed values
 */
function normalizeOptions(
  tree: Tree,
  schema: DataAccessGeneratorSchema
): NormalizedDataAccessOptions {
  // Detect workspace configuration
  const adapter = createTreeAdapter(tree)
  const workspaceConfig = Effect.runSync(
    detectWorkspaceConfig(adapter).pipe(
      Effect.orDie
    ) as Effect.Effect<WorkspaceConfig, never, never>
  )

  // Use shared normalization utility for common fields
  return standardizeGeneratorOptions(tree, {
    name: schema.name,
    ...(schema.directory !== undefined && { directory: schema.directory }),
    ...(schema.description !== undefined && { description: schema.description }),
    libraryType: "data-access"
  }, workspaceConfig)
}
