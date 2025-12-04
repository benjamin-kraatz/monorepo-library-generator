/**
 * Infrastructure Library Generator (Nx Wrapper)
 *
 * Wrapper that integrates infrastructure generator core with Nx workspace.
 *
 * Responsibilities:
 * - Computes library metadata and platform configuration
 * - Generates infrastructure files (package.json, tsconfig, project.json)
 * - Delegates domain file generation to core generator
 * - Formats files and provides post-generation instructions
 */

import type { Tree } from "@nx/devkit"
import { formatFiles } from "@nx/devkit"
import { Effect } from "effect"
import { parseTags } from "../../utils/generator-utils"
import { generateLibraryFiles, type LibraryGeneratorOptions } from "../../utils/library-generator-utils"
import { computeLibraryMetadata, type LibraryMetadata } from "../../utils/library-metadata"
import { computePlatformConfiguration } from "../../utils/platform-utils"
import { createTreeAdapter } from "../../utils/tree-adapter"
import { generateInfraCore, type GeneratorResult } from "../core/infra-generator-core"
import type { InfraGeneratorSchema } from "./schema"

/**
 * Infrastructure Generator for Nx Workspaces
 *
 * Two-phase generation process:
 * 1. Infrastructure Phase: Generates package.json, tsconfig, project.json via generateLibraryFiles()
 * 2. Domain Phase: Generates domain-specific files via core generator
 *
 * @param tree - Nx Tree API for virtual file system operations
 * @param schema - User-provided generator options
 * @returns Callback function that displays post-generation instructions
 */
export default async function infraGenerator(
  tree: Tree,
  schema: InfraGeneratorSchema
) {
  // Validate required fields
  if (!schema.name || schema.name.trim() === "") {
    throw new Error("Infra name is required and cannot be empty")
  }

  // Compute platform-specific configuration
  const platformConfig = computePlatformConfiguration(
    {
      ...(schema.platform !== undefined && { platform: schema.platform }),
      ...(schema.includeClientServer !== undefined && { includeClientServer: schema.includeClientServer }),
      ...(schema.includeEdge !== undefined && { includeEdge: schema.includeEdge })
    },
    {
      defaultPlatform: "node",
      libraryType: "infra"
    }
  )
  const { includeClientServer, includeEdge, platform } = platformConfig

  // Build tags using shared tag utility
  const defaultTags = [
    "type:infra",
    "scope:shared",
    `platform:${platform}`
  ]
  const tags = parseTags(schema.tags, defaultTags)

  // Compute library metadata (single source of truth)
  const metadata = computeLibraryMetadata(
    tree,
    schema,
    "infra",
    defaultTags
  )

  // Phase 1: Generate infrastructure files
  const libraryOptions: LibraryGeneratorOptions = {
    name: metadata.name,
    projectName: metadata.projectName,
    projectRoot: metadata.projectRoot,
    offsetFromRoot: metadata.offsetFromRoot,
    libraryType: "infra",
    platform,
    description: metadata.description,
    tags,
    includeClientServer,
    includeEdgeExports: includeEdge
  }

  await generateLibraryFiles(tree, libraryOptions)

  // Phase 2: Generate domain-specific files via core generator
  const adapter = createTreeAdapter(tree)
  const coreOptions: Parameters<typeof generateInfraCore>[1] = {
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
    tags: metadata.tags,

    // Feature flags
    platform,
    ...(includeClientServer !== undefined && { includeClientServer }),
    ...(includeEdge !== undefined && { includeEdge })
  }

  // Run core generator with Effect runtime
  const result = await Effect.runPromise(
    generateInfraCore(adapter, coreOptions) as Effect.Effect<GeneratorResult, never>
  )

  // Format generated files
  await formatFiles(tree)

  // Return post-generation callback
  return () => {
    console.log(`
✅ Infrastructure library created: ${result.packageName}

📁 Location: ${result.projectRoot}
📦 Package: ${result.packageName}
📂 Files generated: ${result.filesGenerated.length}

🎯 IMPORTANT - Customization Required:
This library was generated with minimal scaffolding.
Follow the TODO comments in each file to customize for your service.

Next steps:
1. Customize service implementation (see TODO comments):
   - ${result.sourceRoot}/lib/service/interface.ts - Define service interface
   - ${result.sourceRoot}/lib/service/errors.ts    - Add domain-specific errors
   - ${result.sourceRoot}/lib/service/config.ts    - Add configuration
   - ${result.sourceRoot}/lib/providers/memory.ts  - Implement providers

2. Review the comprehensive README:
   - ${result.projectRoot}/README.md - Customization guide & examples

3. Build and test:
   - pnpm exec nx build ${result.projectName} --batch
   - pnpm exec nx test ${result.projectName}

4. Auto-sync TypeScript project references:
   - pnpm exec nx sync

📚 Documentation:
   - See /libs/ARCHITECTURE.md for infrastructure patterns
   - See ${result.projectRoot}/README.md for customization examples

Platform configuration:
${includeClientServer ? "   - ✅ Client/Server separation enabled" : "   - Server-only (no client separation)"}
${includeEdge ? "   - ✅ Edge runtime support enabled" : "   - No edge runtime support"}
    `)
  }
}
