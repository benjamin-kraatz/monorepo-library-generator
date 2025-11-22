/**
 * Unified Service Template Generator
 *
 * Single source of truth for generating Effect Context.Tag services across all library types.
 * This utility eliminates code duplication between feature, infra, and provider generators.
 *
 * @see docs/EFFECT_PATTERNS.md for service patterns
 * @see docs/ARCHITECTURE_OVERVIEW.md for layer composition
 */

import { TypeScriptBuilder } from "./typescript-builder"
import type { ServiceGeneratorOptions, ServiceMethod } from "./service-types"

/**
 * Generate a complete service file with Context.Tag pattern
 *
 * This function generates an Effect service following the Context.Tag + Layer.effect pattern.
 * It provides consistent service structure across feature, infra, and provider library types.
 *
 * @example
 * ```typescript
 * const serviceFile = generateUnifiedServiceFile({
 *   className: "Product",
 *   serviceName: "ProductService",
 *   libraryType: "feature",
 *   methods: [
 *     {
 *       name: "getById",
 *       params: [{ name: "id", type: "string" }],
 *       returnType: "Product",
 *       errorType: "ProductServiceError"
 *     }
 *   ],
 *   dependencies: ["ProductRepository", "LoggingService"]
 * });
 * ```
 */
export function generateUnifiedServiceFile(options: ServiceGeneratorOptions): string {
  const builder = new TypeScriptBuilder()
  const {
    className,
    serviceName,
    libraryType,
    methods,
    dependencies = [],
    includeTestLayer = true,
    includeDevLayer = false
  } = options

  // File header
  builder.addFileHeader({
    title: `${className} Service`,
    description: getServiceDescription(libraryType),
    sections: [
      `This service provides ${className} operations using Effect's Context.Tag pattern.`,
      "All operations return Effect types for composable error handling."
    ]
  })

  builder.addBlankLine()

  // Import statements
  generateImports(builder, options)
  builder.addBlankLine()

  // Service interface and Context.Tag
  generateServiceTag(builder, options)
  builder.addBlankLine()

  // Live layer implementation
  generateLiveLayer(builder, options)
  builder.addBlankLine()

  // Test layer (if enabled)
  if (includeTestLayer) {
    generateTestLayer(builder, options)
    builder.addBlankLine()
  }

  // Dev layer (if enabled)
  if (includeDevLayer) {
    generateDevLayer(builder, options)
    builder.addBlankLine()
  }

  return builder.toString()
}

/**
 * Generate import statements
 */
function generateImports(builder: TypeScriptBuilder, options: ServiceGeneratorOptions): void {
  const { dependencies, libraryType, className } = options

  // Core Effect imports
  builder.addRaw(`import { Context, Effect, Layer } from "effect";\n`)

  // Import error types
  const errorSuffix = getErrorSuffix(libraryType)
  builder.addRaw(`import type { ${className}${errorSuffix}Errors } from "./errors";\n`)

  // Import types
  if (libraryType === "feature") {
    builder.addRaw(`import type * as Types from "../shared/types";\n`)
  } else {
    builder.addRaw(`import type * as Types from "./types";\n`)
  }

  // Import dependencies
  if (dependencies.length > 0) {
    builder.addBlankLine()
    builder.addComment("Service dependencies")
    for (const dep of dependencies) {
      // Determine import path based on dependency naming convention
      const importPath = getImportPathForDependency(dep, libraryType)
      builder.addRaw(`import { ${dep} } from "${importPath}";\n`)
    }
  }
}

/**
 * Generate service Context.Tag with inline interface
 */
function generateServiceTag(builder: TypeScriptBuilder, options: ServiceGeneratorOptions): void {
  const { serviceName, methods, className, libraryType } = options
  const errorSuffix = getErrorSuffix(libraryType)

  builder.addComment(`${serviceName} - ${className} operations`)
  builder.addComment("")
  builder.addComment("Effect 3.0+ Pattern: Context.Tag with inline interface and static layer members")
  builder.addRaw(`export class ${serviceName} extends Context.Tag("${serviceName}")<
  ${serviceName},
  {\n`)

  // Generate method signatures
  for (const method of methods) {
    const params = method.params.map((p) => `${p.name}: ${p.type}`).join(", ")
    const effectType = method.errorType
      ? `Effect.Effect<${method.returnType}, ${method.errorType}>`
      : `Effect.Effect<${method.returnType}, ${className}${errorSuffix}Errors>`

    builder.addRaw(`    readonly ${method.name}: (${params}) => ${effectType};\n`)
  }

  builder.addRaw(`  }\n`)
  builder.addRaw(`>() {}\n`)
}

/**
 * Generate Live layer implementation
 */
function generateLiveLayer(builder: TypeScriptBuilder, options: ServiceGeneratorOptions): void {
  const { serviceName, methods, dependencies, className } = options

  builder.addComment(`${serviceName}Live - Production implementation`)
  builder.addComment("")
  builder.addComment("This layer provides the production implementation of the service.")
  builder.addComment("It wires up all dependencies and implements the service interface.")
  builder.addRaw(`export class ${serviceName}Live extends Context.Tag("${serviceName}Live")<
  ${serviceName}Live,
  never
>() {
  static readonly layer = Layer.effect(
    ${serviceName},
    Effect.gen(function* () {\n`)

  // Yield dependencies
  if (dependencies.length > 0) {
    builder.addRaw(`      // Acquire dependencies\n`)
    for (const dep of dependencies) {
      builder.addRaw(`      const ${toLowerFirst(dep)} = yield* ${dep};\n`)
    }
    builder.addBlankLine()
  }

  builder.addRaw(`      // Return service implementation\n`)
  builder.addRaw(`      return {\n`)

  // Generate method implementations
  for (const method of methods) {
    const params = method.params.map((p) => p.name).join(", ")
    builder.addRaw(`        ${method.name}: (${method.params.map((p) => p.name).join(", ")}) =>\n`)
    builder.addRaw(`          Effect.gen(function* () {\n`)
    builder.addRaw(`            // TODO: Implement ${method.name}\n`)

    if (method.description) {
      builder.addRaw(`            // ${method.description}\n`)
    }

    // Add placeholder implementation
    if (method.returnType === "void") {
      builder.addRaw(`            yield* Effect.logInfo("${method.name} called with:", { ${params} });\n`)
    } else {
      builder.addRaw(`            yield* Effect.logInfo("${method.name} called with:", { ${params} });\n`)
      builder.addRaw(`            return yield* Effect.fail(new ${className}InternalError({ message: "Not implemented", operation: "${method.name}" }));\n`)
    }

    builder.addRaw(`          }),\n`)
  }

  builder.addRaw(`      };\n`)
  builder.addRaw(`    }),\n`)
  builder.addRaw(`  );\n`)
  builder.addRaw(`}\n`)
}

/**
 * Generate Test layer implementation
 */
function generateTestLayer(builder: TypeScriptBuilder, options: ServiceGeneratorOptions): void {
  const { serviceName, methods } = options

  builder.addComment(`${serviceName}Test - Test implementation`)
  builder.addComment("")
  builder.addComment("This layer provides a mock implementation for testing.")
  builder.addComment("All operations succeed with dummy data.")
  builder.addRaw(`export class ${serviceName}Test extends Context.Tag("${serviceName}Test")<
  ${serviceName}Test,
  never
>() {
  static readonly layer = Layer.succeed(${serviceName}, {\n`)

  // Generate mock implementations
  for (const method of methods) {
    const params = method.params.map((p) => `_${p.name}`).join(", ")
    builder.addRaw(`    ${method.name}: (${params}) =>\n`)

    if (method.returnType === "void") {
      builder.addRaw(`      Effect.void,\n`)
    } else {
      builder.addRaw(`      Effect.succeed({} as ${method.returnType}),\n`)
    }
  }

  builder.addRaw(`  });\n`)
  builder.addRaw(`}\n`)
}

/**
 * Generate Dev layer implementation
 */
function generateDevLayer(builder: TypeScriptBuilder, options: ServiceGeneratorOptions): void {
  const { serviceName, methods } = options

  builder.addComment(`${serviceName}Dev - Development implementation`)
  builder.addComment("")
  builder.addComment("This layer provides a development implementation with logging.")
  builder.addRaw(`export class ${serviceName}Dev extends Context.Tag("${serviceName}Dev")<
  ${serviceName}Dev,
  never
>() {
  static readonly layer = Layer.succeed(${serviceName}, {\n`)

  // Generate dev implementations
  for (const method of methods) {
    const params = method.params.map((p) => p.name).join(", ")
    const paramsList = method.params.map((p) => p.name).join(", ")
    builder.addRaw(`    ${method.name}: (${params}) =>\n`)
    builder.addRaw(`      Effect.gen(function* () {\n`)
    builder.addRaw(`        yield* Effect.logDebug("[DEV] ${method.name} called", { ${paramsList} });\n`)

    if (method.returnType === "void") {
      builder.addRaw(`        // No-op in dev mode\n`)
    } else {
      builder.addRaw(`        return {} as ${method.returnType};\n`)
    }

    builder.addRaw(`      }),\n`)
  }

  builder.addRaw(`  });\n`)
  builder.addRaw(`}\n`)
}

/**
 * Get service description based on library type
 */
function getServiceDescription(libraryType: string): string {
  switch (libraryType) {
    case "feature":
      return "Feature service implementation using Effect's Context.Tag pattern"
    case "infra":
      return "Infrastructure service implementation"
    case "provider":
      return "External provider service adapter"
    default:
      return "Service implementation"
  }
}

/**
 * Get error suffix based on library type
 */
function getErrorSuffix(libraryType: string): string {
  switch (libraryType) {
    case "data-access":
      return "Repository"
    case "contract":
      return ""
    default:
      return "Service"
  }
}

/**
 * Get import path for a dependency
 */
function getImportPathForDependency(dep: string, libraryType: string): string {
  // Common patterns for dependency imports
  if (dep.includes("Repository")) {
    return `@custom-repo/data-access-${toKebabCase(dep.replace("Repository", ""))}`
  }
  if (dep.includes("Service") && libraryType === "feature") {
    return `@custom-repo/infra-${toKebabCase(dep.replace("Service", ""))}`
  }
  // Default to relative import (will need to be updated by user)
  return `./${toKebabCase(dep)}`
}

/**
 * Convert string to kebab-case
 */
function toKebabCase(str: string): string {
  return str
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .toLowerCase()
}

/**
 * Convert string to lowercase first character
 */
function toLowerFirst(str: string): string {
  return str.charAt(0).toLowerCase() + str.slice(1)
}
