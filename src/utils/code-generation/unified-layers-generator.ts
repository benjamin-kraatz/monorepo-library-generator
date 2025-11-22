/**
 * Unified Layers Template Generator
 *
 * Single source of truth for generating Effect Layer compositions across all library types.
 * This utility eliminates code duplication between data-access, feature, and provider generators.
 *
 * @see docs/ARCHITECTURE_OVERVIEW.md for layer composition patterns
 * @see docs/EFFECT_PATTERNS.md for layer best practices
 */

import { TypeScriptBuilder } from "./typescript-builder"
import type { LayersGeneratorOptions, LayerVariant } from "./layers-types"

/**
 * Generate a complete layers.ts file with Layer composition
 *
 * This function generates Effect layer compositions following the standard patterns:
 * - Live: Production implementation
 * - Test: Testing with mocks
 * - Dev: Development with logging
 * - Auto: Automatic selection based on environment
 *
 * @example
 * ```typescript
 * const layersFile = generateUnifiedLayersFile({
 *   className: "Product",
 *   serviceName: "ProductRepository",
 *   libraryType: "data-access",
 *   dependencies: ["DatabaseService", "LoggingService"],
 *   variants: ["Live", "Test", "Dev", "Auto"]
 * });
 * ```
 */
export function generateUnifiedLayersFile(options: LayersGeneratorOptions): string {
  const builder = new TypeScriptBuilder()
  const {
    className,
    serviceName,
    libraryType,
    dependencies = [],
    variants = ["Live", "Test", "Auto"],
    platformVariants
  } = options

  // File header
  builder.addFileHeader({
    title: `${className} Layers`,
    description: getLayersDescription(libraryType),
    sections: [
      "This file provides layer compositions for dependency injection.",
      "Layers are composable units that wire up services and their dependencies.",
      "",
      "Effect 3.0+ Pattern: Layers are accessed via static members:",
      `  - ${serviceName}.Live  (production)`,
      `  - ${serviceName}.Test  (testing)`,
      variants.includes("Dev") ? `  - ${serviceName}.Dev   (development)` : null,
      variants.includes("Auto") ? `  - ${serviceName}.Auto  (environment-based)` : null
    ].filter(Boolean) as string[]
  })

  builder.addBlankLine()

  // Import statements
  generateLayersImports(builder, options)
  builder.addBlankLine()

  // Platform-specific layers (if applicable)
  if (platformVariants) {
    if (platformVariants.includes("server")) {
      generatePlatformLayerSection(builder, "Server", options)
      builder.addBlankLine()
    }
    if (platformVariants.includes("client")) {
      generatePlatformLayerSection(builder, "Client", options)
      builder.addBlankLine()
    }
    if (platformVariants.includes("edge")) {
      generatePlatformLayerSection(builder, "Edge", options)
      builder.addBlankLine()
    }
  } else {
    // Generate standard layer variants
    for (const variant of variants) {
      generateLayerVariant(builder, variant, options)
      builder.addBlankLine()
    }
  }

  return builder.toString()
}

/**
 * Generate import statements for layers file
 */
function generateLayersImports(builder: TypeScriptBuilder, options: LayersGeneratorOptions): void {
  const { serviceName, dependencies, libraryType } = options

  // Core Effect imports
  builder.addRaw(`import { Layer } from "effect";\n`)

  // Import service
  const serviceImportPath = getServiceImportPath(libraryType)
  builder.addRaw(`import { ${serviceName} } from "${serviceImportPath}";\n`)

  // Import dependencies
  if (dependencies.length > 0) {
    builder.addBlankLine()
    builder.addComment("Service dependencies")
    for (const dep of dependencies) {
      const depImportPath = getDependencyImportPath(dep, libraryType)
      builder.addRaw(`import { ${dep} } from "${depImportPath}";\n`)
    }
  }
}

/**
 * Generate a layer variant (Live, Test, Dev, Auto)
 */
function generateLayerVariant(
  builder: TypeScriptBuilder,
  variant: LayerVariant,
  options: LayersGeneratorOptions
): void {
  const { serviceName, dependencies } = options

  switch (variant) {
    case "Live":
      generateLiveLayer(builder, serviceName, dependencies)
      break
    case "Test":
      generateTestLayer(builder, serviceName, dependencies)
      break
    case "Dev":
      generateDevLayer(builder, serviceName, dependencies)
      break
    case "Auto":
      generateAutoLayer(builder, serviceName)
      break
  }
}

/**
 * Generate Live layer (production)
 */
function generateLiveLayer(
  builder: TypeScriptBuilder,
  serviceName: string,
  dependencies: ReadonlyArray<string>
): void {
  builder.addComment(`${serviceName}Live - Production layer`)
  builder.addComment("")
  builder.addComment("Composes the live service implementation with its dependencies")

  if (dependencies.length === 0) {
    builder.addRaw(`export const ${serviceName}Live = ${serviceName}Live.layer;\n`)
  } else {
    builder.addRaw(`export const ${serviceName}Live = ${serviceName}Live.layer.pipe(\n`)
    builder.addRaw(`  Layer.provide(\n`)
    builder.addRaw(`    Layer.mergeAll(\n`)

    for (let i = 0; i < dependencies.length; i++) {
      const dep = dependencies[i]
      const isLast = i === dependencies.length - 1
      builder.addRaw(`      ${dep}Live${isLast ? "" : ","}\n`)
    }

    builder.addRaw(`    )\n`)
    builder.addRaw(`  )\n`)
    builder.addRaw(`);\n`)
  }
}

/**
 * Generate Test layer (testing)
 */
function generateTestLayer(
  builder: TypeScriptBuilder,
  serviceName: string,
  dependencies: ReadonlyArray<string>
): void {
  builder.addComment(`${serviceName}Test - Test layer`)
  builder.addComment("")
  builder.addComment("Provides mock implementations for testing")

  if (dependencies.length === 0) {
    builder.addRaw(`export const ${serviceName}Test = ${serviceName}Test.layer;\n`)
  } else {
    builder.addRaw(`export const ${serviceName}Test = ${serviceName}Test.layer.pipe(\n`)
    builder.addRaw(`  Layer.provide(\n`)
    builder.addRaw(`    Layer.mergeAll(\n`)

    for (let i = 0; i < dependencies.length; i++) {
      const dep = dependencies[i]
      const isLast = i === dependencies.length - 1
      builder.addRaw(`      ${dep}Test${isLast ? "" : ","}\n`)
    }

    builder.addRaw(`    )\n`)
    builder.addRaw(`  )\n`)
    builder.addRaw(`);\n`)
  }
}

/**
 * Generate Dev layer (development)
 */
function generateDevLayer(
  builder: TypeScriptBuilder,
  serviceName: string,
  dependencies: ReadonlyArray<string>
): void {
  builder.addComment(`${serviceName}Dev - Development layer`)
  builder.addComment("")
  builder.addComment("Development implementation with enhanced logging")

  if (dependencies.length === 0) {
    builder.addRaw(`export const ${serviceName}Dev = ${serviceName}Dev.layer;\n`)
  } else {
    builder.addRaw(`export const ${serviceName}Dev = ${serviceName}Dev.layer.pipe(\n`)
    builder.addRaw(`  Layer.provide(\n`)
    builder.addRaw(`    Layer.mergeAll(\n`)

    for (let i = 0; i < dependencies.length; i++) {
      const dep = dependencies[i]
      const isLast = i === dependencies.length - 1
      builder.addRaw(`      ${dep}Dev${isLast ? "" : ","}\n`)
    }

    builder.addRaw(`    )\n`)
    builder.addRaw(`  )\n`)
    builder.addRaw(`);\n`)
  }
}

/**
 * Generate Auto layer (environment-based selection)
 */
function generateAutoLayer(builder: TypeScriptBuilder, serviceName: string): void {
  builder.addComment(`${serviceName}Auto - Automatic layer selection`)
  builder.addComment("")
  builder.addComment("Selects the appropriate layer based on NODE_ENV:")
  builder.addComment("  - 'production' → Live")
  builder.addComment("  - 'test' → Test")
  builder.addComment("  - 'development' → Dev (if available) or Live")

  builder.addRaw(`export const ${serviceName}Auto =
  process.env.NODE_ENV === "production"
    ? ${serviceName}Live
    : process.env.NODE_ENV === "test"
      ? ${serviceName}Test
      : ${serviceName}Live;\n`)
}

/**
 * Generate platform-specific layer section
 */
function generatePlatformLayerSection(
  builder: TypeScriptBuilder,
  platform: "Server" | "Client" | "Edge",
  options: LayersGeneratorOptions
): void {
  const { serviceName, dependencies } = options

  builder.addSectionComment(`${platform} Layers`)
  builder.addBlankLine()

  builder.addComment(`${serviceName}${platform}Live - ${platform} layer`)
  builder.addRaw(`export const ${serviceName}${platform}Live = ${serviceName}${platform}Live.layer`)

  if (dependencies.length > 0) {
    builder.addRaw(`.pipe(\n`)
    builder.addRaw(`  Layer.provide(\n`)
    builder.addRaw(`    Layer.mergeAll(\n`)

    for (let i = 0; i < dependencies.length; i++) {
      const dep = dependencies[i]
      const isLast = i === dependencies.length - 1
      builder.addRaw(`      ${dep}${platform}Live${isLast ? "" : ","}\n`)
    }

    builder.addRaw(`    )\n`)
    builder.addRaw(`  )\n`)
    builder.addRaw(`)`)
  }

  builder.addRaw(`;\n`)
}

/**
 * Get service import path based on library type
 */
function getServiceImportPath(libraryType: string): string {
  switch (libraryType) {
    case "data-access":
      return "./repository"
    case "feature":
      return "../server/service"
    case "infra":
      return "../service/service"
    case "provider":
      return "./service"
    default:
      return "./service"
  }
}

/**
 * Get dependency import path
 */
function getDependencyImportPath(dep: string, libraryType: string): string {
  // Repository dependencies from data-access
  if (dep.includes("Repository")) {
    return `@custom-repo/data-access-${toKebabCase(dep.replace("Repository", ""))}`
  }

  // Service dependencies from infra
  if (dep.includes("Service")) {
    return `@custom-repo/infra-${toKebabCase(dep.replace("Service", ""))}`
  }

  // Default to relative import (will need user adjustment)
  return `./${toKebabCase(dep)}`
}

/**
 * Get layers description based on library type
 */
function getLayersDescription(libraryType: string): string {
  switch (libraryType) {
    case "data-access":
      return "Repository layer compositions for dependency injection"
    case "feature":
      return "Feature service layer compositions"
    case "infra":
      return "Infrastructure service layer compositions"
    case "provider":
      return "Provider service layer compositions"
    default:
      return "Layer compositions for dependency injection"
  }
}

/**
 * Convert string to kebab-case
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase()
}
