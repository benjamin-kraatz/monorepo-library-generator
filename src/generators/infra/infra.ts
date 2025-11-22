/**
 * Infrastructure Library Generator
 *
 * Generates infrastructure libraries following Effect-based architecture patterns.
 * Creates services, configuration, layers, and providers for cross-cutting concerns.
 */

import type { Tree } from "@nx/devkit"
import { formatFiles } from "@nx/devkit"
import { Effect } from "effect"
import { parseTags } from "../../utils/generator-utils"
import { generateLibraryFiles } from "../../utils/library-generator-utils"
import { normalizeBaseOptions, type NormalizedBaseOptions } from "../../utils/normalization-utils"
import { computePlatformConfiguration } from "../../utils/platform-utils"
import { createTreeAdapter } from "../../utils/tree-adapter"
import { detectWorkspaceConfig, type WorkspaceConfig } from "../../utils/workspace-detection"
import { generateInfraCore, type GeneratorResult } from "../core/infra-generator-core"
import type { InfraGeneratorSchema } from "./schema"

/**
 * Normalized options with computed values
 */
type NormalizedInfraOptions = NormalizedBaseOptions

/**
 * Main generator function
 */
export default async function infraGenerator(
  tree: Tree,
  schema: InfraGeneratorSchema
) {
  const options = normalizeOptions(tree, schema)

  // Use shared platform configuration helper
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

  // 1. Generate base library files (project.json, package.json, tsconfig, etc.)
  const libraryOptions = {
    name: options.name,
    projectName: options.projectName,
    projectRoot: options.projectRoot,
    offsetFromRoot: options.offsetFromRoot,
    libraryType: "infra" as const,
    platform,
    description: options.description,
    tags,
    includeClientServer,
    includeEdgeExports: includeEdge
  }

  await generateLibraryFiles(tree, libraryOptions)

  // 2. Generate domain-specific files using shared core
  const adapter = createTreeAdapter(tree)
  const coreOptions = {
    name: options.name,
    className: options.className,
    propertyName: options.propertyName,
    fileName: options.fileName,
    constantName: options.constantName,
    projectName: options.projectName,
    projectRoot: options.projectRoot,
    sourceRoot: options.sourceRoot,
    packageName: options.packageName,
    description: options.description,
    tags: tags.join(","), // Convert array to comma-separated string for core
    offsetFromRoot: options.offsetFromRoot,
    platform,
    ...(includeClientServer !== undefined && { includeClientServer }),
    ...(includeEdge && { includeEdge })
  }

  // Use shared core via Effect
  const result = await Effect.runPromise(
    generateInfraCore(adapter, coreOptions) as Effect.Effect<GeneratorResult, never>
  )

  // 3. Format files
  await formatFiles(tree)

  // 4. Return post-generation instructions
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

/**
 * Normalize options with defaults and computed values
 */
function normalizeOptions(
  tree: Tree,
  schema: InfraGeneratorSchema
): NormalizedInfraOptions {
  // Detect workspace configuration
  const adapter = createTreeAdapter(tree)
  const workspaceConfig = Effect.runSync(
    detectWorkspaceConfig(adapter).pipe(
      Effect.orDie
    ) as Effect.Effect<WorkspaceConfig, never, never>
  )

  // Use shared normalization utility for common fields
  return normalizeBaseOptions(tree, {
    name: schema.name,
    ...(schema.directory !== undefined && { directory: schema.directory }),
    ...(schema.description !== undefined && { description: schema.description }),
    libraryType: "infra",
    additionalTags: ["platform:node"] // Infra is primarily server-side
  }, workspaceConfig)
}
