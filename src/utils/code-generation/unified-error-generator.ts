/**
 * Unified Error Template Generator
 *
 * Single source of truth for generating error classes across all library types.
 * This utility eliminates code duplication between contract, data-access, feature, infra, and provider generators.
 *
 * @see docs/contract.md for error patterns
 * @see src/utils/code-generation/error-template-utils.ts for related utilities
 */

import { TypeScriptBuilder } from "./typescript-builder"
import type { ErrorGeneratorOptions, StandardErrorConfig } from "./error-types"

/**
 * Generate a complete errors.ts file with standard error classes
 *
 * This function generates all standard error types following Effect's Data.TaggedError pattern.
 * It provides consistent error handling across all library types while supporting
 * library-specific customizations.
 *
 * @example
 * ```typescript
 * const errorsFile = generateUnifiedErrorsFile({
 *   className: "Product",
 *   libraryType: "contract",
 *   customFields: {
 *     NotFound: [{ name: "productId", type: "string" }]
 *   }
 * });
 * ```
 */
export function generateUnifiedErrorsFile(options: ErrorGeneratorOptions): string {
  const builder = new TypeScriptBuilder()
  const { className, libraryType, customFields = {}, includeRpcErrors = false } = options

  // File header
  builder.addFileHeader({
    title: `${className} Errors`,
    description: getErrorFileDescription(libraryType),
    sections: [
      "This file defines error types for the " + className + " domain.",
      "All errors extend Data.TaggedError for Effect-TS integration.",
      libraryType === "contract"
        ? "These are domain errors - they represent business rule violations."
        : libraryType === "data-access"
          ? "These are repository errors - they represent data access failures."
          : "These are service errors - they represent operation failures."
    ]
  })

  builder.addBlankLine()

  // Import statements
  builder.addRaw(`import { Data } from "effect";\n`)
  if (includeRpcErrors) {
    builder.addRaw(`import { Schema } from "effect";\n`)
  }
  builder.addBlankLine()

  // Base error class
  generateBaseError(builder, className, libraryType)
  builder.addBlankLine()

  // Standard error classes
  const errorTypes = getStandardErrorTypes(libraryType)
  for (const errorType of errorTypes) {
    const fields = customFields[errorType.name] || errorType.defaultFields
    generateErrorClass(builder, {
      className,
      errorName: errorType.name,
      description: errorType.description,
      fields,
      baseClass: `${className}Error`
    })
    builder.addBlankLine()
  }

  // RPC errors if enabled
  if (includeRpcErrors) {
    builder.addSectionComment("RPC Error Schemas (Serializable)")
    builder.addBlankLine()
    generateRpcErrorSchemas(builder, className, errorTypes)
    builder.addBlankLine()
  }

  // Error union type
  generateErrorUnionType(builder, className, libraryType, errorTypes)
  builder.addBlankLine()

  // Type guard functions
  generateTypeGuards(builder, className, errorTypes)

  return builder.toString()
}

/**
 * Generate base error class
 */
function generateBaseError(
  builder: TypeScriptBuilder,
  className: string,
  libraryType: string
): void {
  const errorSuffix = getErrorSuffix(libraryType)
  const errorName = `${className}${errorSuffix}Error`

  builder.addComment(`Base error for all ${className} ${libraryType} operations`)
  builder.addRaw(`export class ${errorName} extends Data.TaggedError("${errorName}")<{
  readonly message: string;
  readonly cause?: unknown;
}> {
  /**
   * Create a new ${errorName}
   *
   * @param message - Human-readable error message
   * @param cause - Optional underlying error cause
   */
  static create(message: string, cause?: unknown): ${errorName} {
    return new ${errorName}({ message, cause });
  }
}\n`)
}

/**
 * Generate a specific error class
 */
function generateErrorClass(
  builder: TypeScriptBuilder,
  config: {
    className: string
    errorName: string
    description: string
    fields: Array<{ name: string; type: string; optional?: boolean }>
    baseClass?: string
  }
): void {
  const { className, errorName, description, fields, baseClass } = config
  const fullErrorName = `${className}${errorName}Error`

  builder.addComment(description)
  builder.addRaw(`export class ${fullErrorName} extends Data.TaggedError("${fullErrorName}")<{\n`)
  builder.addRaw(`  readonly message: string;\n`)

  // Add custom fields
  for (const field of fields) {
    const optional = field.optional ? "?" : ""
    builder.addRaw(`  readonly ${field.name}${optional}: ${field.type};\n`)
  }

  builder.addRaw(`  readonly cause?: unknown;\n`)
  builder.addRaw(`}> {\n`)

  // Static create method
  const params = fields.map((f) => {
    const optional = f.optional ? "?" : ""
    return `${f.name}${optional}: ${f.type}`
  }).join(", ")

  const fieldAssignments = fields.map((f) => `${f.name}`).join(", ")

  builder.addRaw(`  /**
   * Create a new ${fullErrorName}
   *
   * @param message - Human-readable error message
${fields.map((f) => `   * @param ${f.name} - ${f.name}`).join("\n")}
   * @param cause - Optional underlying error cause
   */
  static create(
    message: string,
    ${params ? params + "," : ""}
    cause?: unknown
  ): ${fullErrorName} {
    return new ${fullErrorName}({ message, ${fieldAssignments ? fieldAssignments + "," : ""} cause });
  }
}\n`)
}

/**
 * Generate RPC error schemas (Schema.TaggedError for serialization)
 */
function generateRpcErrorSchemas(
  builder: TypeScriptBuilder,
  className: string,
  errorTypes: ReadonlyArray<StandardErrorConfig>
): void {
  builder.addComment("RPC-compatible error schemas for cross-boundary communication")
  builder.addComment("These errors can be serialized/deserialized across RPC boundaries")
  builder.addBlankLine()

  for (const errorType of errorTypes) {
    const fullErrorName = `${className}${errorType.name}RpcError`
    builder.addRaw(`export class ${fullErrorName} extends Schema.TaggedError<${fullErrorName}>()(
  "${fullErrorName}",
  {
    message: Schema.String,\n`)

    // Add fields as schemas
    for (const field of errorType.defaultFields) {
      const schemaType = getSchemaType(field.type)
      builder.addRaw(`    ${field.name}: ${schemaType},\n`)
    }

    builder.addRaw(`  },
) {}\n\n`)
  }
}

/**
 * Generate error union type
 */
function generateErrorUnionType(
  builder: TypeScriptBuilder,
  className: string,
  libraryType: string,
  errorTypes: ReadonlyArray<StandardErrorConfig>
): void {
  const errorSuffix = getErrorSuffix(libraryType)
  const unionTypeName = `${className}${errorSuffix}Error`

  builder.addComment(`Union type of all ${className} ${libraryType} errors`)
  builder.addRaw(`export type ${unionTypeName}s =\n`)

  const allErrors = [`${className}${errorSuffix}Error`, ...errorTypes.map((e) => `${className}${e.name}Error`)]

  for (let i = 0; i < allErrors.length; i++) {
    const separator = i < allErrors.length - 1 ? " |" : ";"
    builder.addRaw(`  | ${allErrors[i]}${separator}\n`)
  }
}

/**
 * Generate type guard functions
 */
function generateTypeGuards(
  builder: TypeScriptBuilder,
  className: string,
  errorTypes: ReadonlyArray<StandardErrorConfig>
): void {
  builder.addBlankLine()
  builder.addSectionComment("Type Guards")
  builder.addBlankLine()

  for (const errorType of errorTypes) {
    const fullErrorName = `${className}${errorType.name}Error`
    const guardName = `is${className}${errorType.name}Error`

    builder.addComment(`Check if error is a ${fullErrorName}`)
    builder.addRaw(`export function ${guardName}(error: unknown): error is ${fullErrorName} {
  return error instanceof ${fullErrorName};
}\n\n`)
  }
}

/**
 * Get standard error types based on library type
 */
function getStandardErrorTypes(libraryType: string): ReadonlyArray<StandardErrorConfig> {
  // Contract and data-access need domain-specific errors
  if (libraryType === "contract" || libraryType === "data-access") {
    return [
      {
        name: "NotFound",
        description: "Error when entity is not found",
        defaultFields: [{ name: "id", type: "string" }]
      },
      {
        name: "Validation",
        description: "Error when validation fails",
        defaultFields: [
          { name: "field", type: "string" },
          { name: "reason", type: "string" }
        ]
      },
      {
        name: "Conflict",
        description: "Error when operation conflicts with existing state",
        defaultFields: [{ name: "conflictingId", type: "string" }]
      },
      {
        name: "Config",
        description: "Error when configuration is invalid",
        defaultFields: [{ name: "configKey", type: "string" }]
      },
      {
        name: "Connection",
        description: "Error when connection fails",
        defaultFields: [{ name: "target", type: "string" }]
      },
      {
        name: "Timeout",
        description: "Error when operation times out",
        defaultFields: [
          { name: "operation", type: "string" },
          { name: "timeoutMs", type: "number" }
        ]
      },
      {
        name: "Internal",
        description: "Internal error - unexpected system failure",
        defaultFields: [{ name: "operation", type: "string" }]
      }
    ]
  }

  // Feature, infra, and provider use simpler service errors
  return [
    {
      name: "NotFound",
      description: "Error when resource is not found",
      defaultFields: [{ name: "resource", type: "string" }]
    },
    {
      name: "Validation",
      description: "Error when input validation fails",
      defaultFields: [{ name: "reason", type: "string" }]
    },
    {
      name: "Internal",
      description: "Internal service error",
      defaultFields: [{ name: "operation", type: "string" }]
    }
  ]
}

/**
 * Get error file description based on library type
 */
function getErrorFileDescription(libraryType: string): string {
  switch (libraryType) {
    case "contract":
      return "Domain error definitions using Effect's Data.TaggedError pattern"
    case "data-access":
      return "Repository error definitions for data access operations"
    case "feature":
      return "Feature service error definitions"
    case "infra":
      return "Infrastructure service error definitions"
    case "provider":
      return "Provider service error definitions for external API integration"
    default:
      return "Service error definitions"
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
 * Map TypeScript types to Schema types
 */
function getSchemaType(tsType: string): string {
  switch (tsType) {
    case "string":
      return "Schema.String"
    case "number":
      return "Schema.Number"
    case "boolean":
      return "Schema.Boolean"
    default:
      return "Schema.String"
  }
}
