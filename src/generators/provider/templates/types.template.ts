/**
 * Provider Generator - Types Template
 *
 * Generates common type definitions for provider libraries.
 * Includes pagination, sorting, filtering, and metadata types.
 *
 * @module monorepo-library-generator/provider/templates/types
 */

import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder.js"
import type { ProviderTemplateOptions } from "../../../utils/shared/types.js"

/**
 * Generate types.ts file for provider library
 *
 * Creates common type definitions used across the service.
 *
 * @param options - Provider template options
 * @returns Generated TypeScript code
 */
export function generateTypesFile(options: ProviderTemplateOptions): string {
  const builder = new TypeScriptBuilder()
  const { name: projectClassName } = options

  // File header
  builder.addRaw("/**")
  builder.addRaw(` * ${projectClassName} - Type Definitions`)
  builder.addRaw(" *")
  builder.addRaw(" * Common types used across the service")
  builder.addRaw(" */")
  builder.addBlankLine()

  // Service Metadata
  builder.addInterface({
    name: "ServiceMetadata",
    exported: true,
    jsdoc: "Service Metadata",
    properties: [
      { name: "name", type: "string", readonly: true, jsdoc: "Service name" },
      { name: "version", type: "string", readonly: true, jsdoc: "Service version" },
      { name: "environment", type: "\"production\" | \"development\" | \"test\"", readonly: true, jsdoc: "Environment" }
    ]
  })

  // Pagination Options
  builder.addInterface({
    name: "PaginationOptions",
    exported: true,
    jsdoc: "Pagination Options",
    properties: [
      { name: "limit", type: "number", readonly: true, optional: true, jsdoc: "Maximum number of items to return" },
      { name: "offset", type: "number", readonly: true, optional: true, jsdoc: "Number of items to skip" },
      { name: "cursor", type: "string", readonly: true, optional: true, jsdoc: "Cursor for cursor-based pagination" }
    ]
  })

  // Paginated Response
  builder.addInterface({
    name: "PaginatedResponse",
    exported: true,
    jsdoc: "Paginated Response",
    properties: [
      { name: "data", type: "readonly T[]", readonly: true, jsdoc: "Data items" },
      { name: "total", type: "number", readonly: true, jsdoc: "Total number of items" },
      { name: "hasMore", type: "boolean", readonly: true, jsdoc: "Whether there are more items" },
      { name: "nextCursor", type: "string", readonly: true, optional: true, jsdoc: "Cursor for next page" }
    ]
  })

  // Add generic type parameter to PaginatedResponse
  const content = builder.toString()
  const updatedContent = content.replace(
    "export interface PaginatedResponse {",
    "export interface PaginatedResponse<T> {"
  )

  builder.clear()
  builder.addRaw(updatedContent)

  // Sort Options
  builder.addInterface({
    name: "SortOptions",
    exported: true,
    jsdoc: "Sort Options",
    properties: [
      { name: "field", type: "string", readonly: true, jsdoc: "Field to sort by" },
      { name: "direction", type: "\"asc\" | \"desc\"", readonly: true, jsdoc: "Sort direction" }
    ]
  })

  // Filter Options
  builder.addInterface({
    name: "FilterOptions",
    exported: true,
    jsdoc: "Filter Options",
    properties: [
      { name: "[key: string]", type: "unknown", jsdoc: "Dynamic filter fields" }
    ]
  })

  // Query Options
  builder.addInterface({
    name: "QueryOptions",
    exported: true,
    jsdoc: "Query Options",
    properties: [
      { name: "pagination", type: "PaginationOptions", readonly: true, optional: true, jsdoc: "Pagination options" },
      { name: "sort", type: "SortOptions", readonly: true, optional: true, jsdoc: "Sort options" },
      { name: "filters", type: "FilterOptions", readonly: true, optional: true, jsdoc: "Filter options" }
    ]
  })

  return builder.toString()
}
