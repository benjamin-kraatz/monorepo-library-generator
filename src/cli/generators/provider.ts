/**
 * Provider Generator for CLI (Effect Wrapper)
 *
 * Wrapper that integrates provider generator core with Effect-based CLI.
 *
 * Responsibilities:
 * - Computes library metadata for standalone use
 * - Generates infrastructure files via generateInfrastructureFiles()
 * - Delegates domain file generation to core generator
 * - Provides CLI-specific output and instructions
 *
 * @module monorepo-library-generator/cli/generators/provider
 */

import { Console, Effect } from "effect"
import { generateProviderCore, type GeneratorResult } from "../../generators/core/provider-generator-core"
import { createEffectFsAdapter } from "../../utils/effect-fs-adapter"
import { generateInfrastructureFiles } from "../../utils/infrastructure-generator"
import type { PlatformType } from "../../utils/platform-utils"

/**
 * Provider Generator Options (CLI)
 */
export interface ProviderGeneratorOptions {
  readonly name: string
  readonly externalService: string
  readonly description?: string
  readonly tags?: string
  readonly platform?: PlatformType
}

/**
 * Generate Provider Library (CLI)
 *
 * Two-phase generation process:
 * 1. Infrastructure Phase: Generates package.json, tsconfig, project.json
 * 2. Domain Phase: Generates domain-specific files via core generator
 *
 * Uses Effect-native FileSystem operations for cross-platform compatibility.
 */
export function generateProvider(options: ProviderGeneratorOptions) {
  return Effect.gen(function*() {
    const workspaceRoot = yield* Effect.sync(() => process.cwd())
    const adapter = yield* createEffectFsAdapter(workspaceRoot)

    yield* Console.log(`Creating provider library: ${options.name}...`)

    // Compute naming variants
    const { names } = yield* Effect.promise(() => import("@nx/devkit"))
    const nameVariants = names(options.name)
    const serviceNameVariants = names(options.externalService)

    // Compute project identifiers
    const projectName = `provider-${nameVariants.fileName}`
    const projectRoot = `libs/provider/${nameVariants.fileName}`
    const sourceRoot = `${projectRoot}/src`
    const packageName = `@custom-repo/${projectName}`

    // Prepare core options
    const coreOptions = {
      name: options.name,
      className: nameVariants.className,
      propertyName: nameVariants.propertyName,
      fileName: nameVariants.fileName,
      constantName: nameVariants.constantName,
      projectName,
      projectRoot,
      sourceRoot,
      packageName,
      description: options.description ||
        `${nameVariants.className} provider for ${options.externalService}`,
      tags: options.tags ||
        `type:provider,scope:provider,platform:${options.platform || "node"},service:${serviceNameVariants.fileName}`,
      offsetFromRoot: "../../..",
      workspaceRoot,
      externalService: options.externalService,
      platform: options.platform || "node"
    }

    // Phase 1: Generate infrastructure files
    yield* generateInfrastructureFiles(adapter, {
      workspaceRoot,
      projectRoot,
      projectName,
      packageName,
      description: options.description ||
        `${nameVariants.className} provider for ${options.externalService}`,
      libraryType: "provider",
      offsetFromRoot: "../../.."
    })

    // Phase 2: Generate domain files via core generator
    const result: GeneratorResult = yield* (
      generateProviderCore(adapter, coreOptions) as Effect.Effect<GeneratorResult>
    )

    // Display CLI output
    yield* Console.log("✨ Provider library created successfully!")
    yield* Console.log(`  Location: ${result.projectRoot}`)
    yield* Console.log(`  Package: ${result.packageName}`)
    yield* Console.log(`  Files generated: ${result.filesGenerated.length}`)
    yield* Console.log(`\nNext steps:`)
    yield* Console.log(`  1. cd ${result.projectRoot}`)
    yield* Console.log(`  2. Customize service implementation`)
    yield* Console.log(`  3. pnpm install && pnpm build`)

    return result
  })
}
