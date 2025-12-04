/**
 * Feature Library Generator (Nx Wrapper)
 *
 * Wrapper that integrates feature generator core with Nx workspace.
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
import { type LibraryMetadata, computeLibraryMetadata } from "../../utils/library-metadata"
import { computePlatformConfiguration } from "../../utils/platform-utils"
import { createTreeAdapter } from "../../utils/tree-adapter"
import { generateFeatureCore, type GeneratorResult } from "../core/feature-generator-core"
import type { FeatureGeneratorSchema } from "./schema"

/**
 * Feature Generator for Nx Workspaces
 *
 * Two-phase generation process:
 * 1. Infrastructure Phase: Generates package.json, tsconfig, project.json via generateLibraryFiles()
 * 2. Domain Phase: Generates domain-specific files via core generator
 *
 * @param tree - Nx Tree API for virtual file system operations
 * @param schema - User-provided generator options
 * @returns Callback function that displays post-generation instructions
 */
export default async function featureGenerator(
  tree: Tree,
  schema: FeatureGeneratorSchema
) {
  // Validate required options
  if (!schema.name || schema.name.trim() === "") {
    throw new Error("Feature name is required and cannot be empty")
  }

  // Compute platform-specific configuration
  const includeClientServer = schema.includeClientServer
  const includeRPC = schema.includeRPC ?? false
  const includeCQRS = schema.includeCQRS ?? false
  const includeEdge = schema.includeEdge ?? false
  const platformConfig = computePlatformConfiguration(
    {
      ...(schema.platform !== undefined && { platform: schema.platform }),
      ...(includeClientServer !== undefined && { includeClientServer }),
      ...(includeEdge && { includeEdge })
    },
    {
      defaultPlatform: "universal",
      libraryType: "feature"
    }
  )
  const { includeClientServer: shouldIncludeClientServer, includeEdge: shouldIncludeEdge, platform } = platformConfig

  // Build tags using shared tag utility
  const defaultTags = [
    "type:feature",
    `scope:${schema.scope || schema.name}`,
    `platform:${platform}`
  ]
  const tags = parseTags(schema.tags, defaultTags)

  // Compute library metadata (single source of truth)
  const metadata = computeLibraryMetadata(
    tree,
    schema,
    "feature",
    defaultTags
  )

  // Phase 1: Generate infrastructure files
  const libraryOptions: LibraryGeneratorOptions = {
    name: metadata.name,
    projectName: metadata.projectName,
    projectRoot: metadata.projectRoot,
    offsetFromRoot: metadata.offsetFromRoot,
    libraryType: "feature",
    platform,
    description: metadata.description,
    tags,
    ...(includeClientServer !== undefined && { includeClientServer }),
    includeEdgeExports: includeEdge,
    includeRPC
  }

  await generateLibraryFiles(tree, libraryOptions)

  // Phase 2: Generate domain-specific files via core generator
  const adapter = createTreeAdapter(tree)
  const coreOptions: Parameters<typeof generateFeatureCore>[1] = {
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
    ...(schema.scope !== undefined && { scope: schema.scope }),
    ...(includeClientServer !== undefined && { includeClientServer }),
    includeRPC,
    includeCQRS,
    includeEdge
  }

  // Run core generator with Effect runtime
  const result = await Effect.runPromise(
    generateFeatureCore(adapter, coreOptions) as Effect.Effect<GeneratorResult, never>
  )

  // Format generated files
  await formatFiles(tree)

  // Return post-generation callback
  return () => {
    console.log(`
✅ Feature library created: ${result.packageName}

📁 Location: ${result.projectRoot}
📦 Package: ${result.packageName}
📂 Files generated: ${result.filesGenerated.length}

🎯 Configuration:
   - Platform: ${platform}
   - Scope: ${schema.scope || schema.name}
   - ✅ Server exports generated
${shouldIncludeClientServer ? "   - ✅ Client exports generated" : "   - No client exports"}
${includeRPC ? "   - ✅ RPC router enabled" : "   - No RPC router"}
${includeCQRS ? "   - ✅ CQRS structure enabled" : "   - No CQRS structure"}
${shouldIncludeEdge ? "   - ✅ Edge runtime support enabled" : "   - No edge runtime support"}

🎯 Next Steps:
1. Customize service implementation (see TODO comments):
   - ${result.sourceRoot}/lib/server/service.ts - Implement business logic
   - ${result.sourceRoot}/lib/server/errors.ts  - Add domain-specific errors
${includeRPC ? `   - ${result.sourceRoot}/lib/rpc/handlers.ts   - Implement RPC handlers\n` : ""}
${shouldIncludeClientServer ? `   - ${result.sourceRoot}/lib/client/hooks      - Add React hooks\n` : ""}

2. Build and test:
   - pnpm exec nx build ${result.projectName} --batch
   - pnpm exec nx test ${result.projectName}

3. Auto-sync TypeScript project references:
   - pnpm exec nx sync

📚 Documentation:
   - See /libs/ARCHITECTURE.md for feature patterns
   - See ${result.projectRoot}/README.md for usage examples
    `)
  }
}
