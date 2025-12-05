/**
 * File Splitter Utilities
 *
 * Utilities for splitting large monolithic files into smaller operation files
 * for better tree-shaking and maintainability.
 */

import type { LibraryType } from "./shared/types"

/**
 * Operation category for data-access repositories
 */
export type RepositoryOperationType =
  | "create"
  | "read"
  | "update"
  | "delete"
  | "aggregate"

/**
 * Operation category for feature services
 */
export type ServiceOperationType =
  | "create"
  | "update"
  | "delete"
  | "query"
  | "batch"

/**
 * Handler category for RPC handlers
 */
export type HandlerCategory = "mutation" | "query" | "batch" | "subscription"

/**
 * Query builder category
 */
export type QueryBuilderType = "find" | "mutation" | "aggregate"

/**
 * File split configuration
 */
export interface FileSplitConfig {
  libraryType: LibraryType
  entityName: string
  className: string
  operationTypes?: Array<RepositoryOperationType | ServiceOperationType>
  includeTests?: boolean
}

/**
 * Split result containing file paths and contents
 */
export interface SplitFileResult {
  path: string
  content: string
  category: string
}

/**
 * Get repository operation file structure for data-access libraries
 */
export function getRepositoryOperationFiles() {
  const operations: Array<RepositoryOperationType> = [
    "create",
    "read",
    "update",
    "delete",
    "aggregate"
  ]

  return operations.map((operation) => ({
    operation,
    fileName: `${operation}.ts`,
    path: `src/lib/repository/operations/${operation}.ts`
  }))
}

/**
 * Get service operation file structure for feature libraries
 */
export function getServiceOperationFiles(
  config: FileSplitConfig
) {
  const { entityName } = config
  const lowerEntity = entityName.toLowerCase()

  return [
    {
      operation: "create",
      fileName: `create-${lowerEntity}.ts`,
      path: `src/lib/server/service/operations/create-${lowerEntity}.ts`
    },
    {
      operation: "update",
      fileName: `update-${lowerEntity}.ts`,
      path: `src/lib/server/service/operations/update-${lowerEntity}.ts`
    },
    {
      operation: "delete",
      fileName: `delete-${lowerEntity}.ts`,
      path: `src/lib/server/service/operations/delete-${lowerEntity}.ts`
    },
    {
      operation: "query",
      fileName: `query-${lowerEntity}.ts`,
      path: `src/lib/server/service/operations/query-${lowerEntity}.ts`
    }
  ]
}

/**
 * Get provider service operation files
 */
export function getProviderServiceOperationFiles() {
  return [
    {
      operation: "create",
      fileName: "create.ts",
      path: "src/lib/service/operations/create.ts"
    },
    {
      operation: "update",
      fileName: "update.ts",
      path: "src/lib/service/operations/update.ts"
    },
    {
      operation: "delete",
      fileName: "delete.ts",
      path: "src/lib/service/operations/delete.ts"
    },
    {
      operation: "query",
      fileName: "query.ts",
      path: "src/lib/service/operations/query.ts"
    }
  ]
}

/**
 * Get query builder file structure for data-access libraries
 */
export function getQueryBuilderFiles() {
  return [
    {
      type: "find",
      fileName: "find-queries.ts",
      path: "src/lib/queries/find-queries.ts"
    },
    {
      type: "mutation",
      fileName: "mutation-queries.ts",
      path: "src/lib/queries/mutation-queries.ts"
    },
    {
      type: "aggregate",
      fileName: "aggregate-queries.ts",
      path: "src/lib/queries/aggregate-queries.ts"
    }
  ]
}

/**
 * Get RPC handler file structure for feature libraries
 */
export function getRpcHandlerFiles(
  config: FileSplitConfig
) {
  const { entityName } = config
  const lowerEntity = entityName.toLowerCase()

  return [
    {
      category: "mutation",
      fileName: `${lowerEntity}-mutation-handlers.ts`,
      path: `src/lib/rpc/handlers/${lowerEntity}-mutation-handlers.ts`
    },
    {
      category: "query",
      fileName: `${lowerEntity}-query-handlers.ts`,
      path: `src/lib/rpc/handlers/${lowerEntity}-query-handlers.ts`
    },
    {
      category: "batch",
      fileName: `${lowerEntity}-batch-handlers.ts`,
      path: `src/lib/rpc/handlers/${lowerEntity}-batch-handlers.ts`
    }
  ]
}

/**
 * Get validation file structure for data-access libraries
 */
export function getValidationFiles() {
  return [
    {
      type: "input",
      fileName: "input-validators.ts",
      path: "src/lib/validation/input-validators.ts"
    },
    {
      type: "filter",
      fileName: "filter-validators.ts",
      path: "src/lib/validation/filter-validators.ts"
    },
    {
      type: "entity",
      fileName: "entity-validators.ts",
      path: "src/lib/validation/entity-validators.ts"
    }
  ]
}

/**
 * Get client hook file structure for feature libraries
 */
export function getClientHookFiles(
  config: FileSplitConfig
) {
  const { entityName } = config
  const lowerEntity = entityName.toLowerCase()

  return [
    {
      type: "single",
      fileName: `use-${lowerEntity}.ts`,
      path: `src/lib/client/hooks/use-${lowerEntity}.ts`
    },
    {
      type: "list",
      fileName: `use-${lowerEntity}-list.ts`,
      path: `src/lib/client/hooks/use-${lowerEntity}-list.ts`
    },
    {
      type: "mutations",
      fileName: `use-${lowerEntity}-mutations.ts`,
      path: `src/lib/client/hooks/use-${lowerEntity}-mutations.ts`
    }
  ]
}

/**
 * Get client atom file structure for feature libraries
 */
export function getClientAtomFiles(
  config: FileSplitConfig
) {
  const { entityName } = config
  const lowerEntity = entityName.toLowerCase()

  return [
    {
      type: "single",
      fileName: `${lowerEntity}-atoms.ts`,
      path: `src/lib/client/atoms/${lowerEntity}-atoms.ts`
    },
    {
      type: "list",
      fileName: `${lowerEntity}-list-atoms.ts`,
      path: `src/lib/client/atoms/${lowerEntity}-list-atoms.ts`
    }
  ]
}

/**
 * Generate barrel export index file content
 */
export function generateBarrelExport(
  files: Array<{ fileName: string; exports?: Array<string> }>
) {
  const exports = files
    .map((file) => {
      const baseName = file.fileName.replace(".ts", "")
      if (file.exports && file.exports.length > 0) {
        return `export { ${file.exports.join(", ")} } from "./${baseName}"`
      }
      return `export * from "./${baseName}"`
    })
    .join("\n")

  return `/**
 * Barrel exports
 * Re-exports all operations for convenience imports
 */

${exports}
`
}

/**
 * Get operation file paths based on library type
 */
export function getOperationFiles(config: FileSplitConfig) {
  switch (config.libraryType) {
    case "data-access":
      return getRepositoryOperationFiles().map((op) => ({
        path: op.path,
        content: "", // Content will be generated by templates
        category: op.operation
      }))

    case "feature":
      return getServiceOperationFiles(config).map((op) => ({
        path: op.path,
        content: "",
        category: op.operation
      }))

    case "provider":
      return getProviderServiceOperationFiles().map((op) => ({
        path: op.path,
        content: "",
        category: op.operation
      }))

    default:
      return []
  }
}

/**
 * Determine if a file should be split based on size or complexity
 */
export function shouldSplitFile(
  libraryType: LibraryType,
  fileName: string
) {
  // Define files that should always be split for bundle optimization
  const splitCandidates: Record<LibraryType, Array<string>> = {
    contract: [], // Already split into individual entities
    "data-access": ["repository.ts"],
    feature: ["service.ts", "handlers.ts"],
    infra: [], // Usually small enough
    provider: ["service.ts"],
    util: [] // Util libraries are typically small
  }

  const candidates = splitCandidates[libraryType] || []
  return candidates.some((candidate) => fileName.includes(candidate))
}

/**
 * Get recommended file organization for a library type
 */
export function getRecommendedFileStructure(libraryType: LibraryType) {
  const structures: Record<LibraryType, string> = {
    contract: `src/
├── index.ts
├── types.ts
└── lib/
    ├── entities/
    │   ├── index.ts
    │   └── [entity].ts (one per entity)
    ├── errors.ts
    ├── ports.ts
    └── events.ts`,

    "data-access": `src/
├── index.ts
├── types.ts
└── lib/
    ├── repository/
    │   ├── index.ts
    │   ├── interface.ts
    │   └── operations/
    │       ├── create.ts
    │       ├── read.ts
    │       ├── update.ts
    │       ├── delete.ts
    │       └── aggregate.ts
    ├── queries/
    │   ├── index.ts
    │   ├── find-queries.ts
    │   ├── mutation-queries.ts
    │   └── aggregate-queries.ts
    └── validation/
        ├── index.ts
        ├── input-validators.ts
        ├── filter-validators.ts
        └── entity-validators.ts`,

    feature: `src/
├── index.ts
├── types.ts
├── server.ts
├── client.ts
└── lib/
    ├── server/
    │   ├── service/
    │   │   ├── index.ts
    │   │   ├── interface.ts
    │   │   └── operations/
    │   │       └── [operation].ts
    │   └── layers.ts
    ├── rpc/
    │   └── handlers/
    │       └── [category]-handlers.ts
    └── client/
        ├── hooks/
        │   └── use-[entity].ts
        └── atoms/
            └── [entity]-atoms.ts`,

    infra: `src/
├── index.ts
├── types.ts
├── server.ts
├── client.ts
└── lib/
    ├── service/
    │   ├── index.ts
    │   └── interface.ts
    ├── providers/
    │   └── [provider].ts
    └── layers/
        ├── server-layers.ts
        └── client-layers.ts`,

    provider: `src/
├── index.ts
├── types.ts
├── server.ts
├── client.ts
└── lib/
    ├── service/
    │   ├── index.ts
    │   ├── interface.ts
    │   └── operations/
    │       ├── create.ts
    │       ├── update.ts
    │       ├── delete.ts
    │       └── query.ts
    ├── errors.ts
    ├── validation.ts
    └── layers.ts`,

    util: `src/
├── index.ts
├── types.ts
└── lib/
    └── utils/
        └── [utility].ts`
  }

  return structures[libraryType] || "No specific structure defined"
}

/**
 * Validate file structure matches recommended organization
 */
export function validateFileStructure() {
  // This is a placeholder for future validation logic
  // Would compare existingFiles against getRecommendedFileStructure
  return {
    valid: true,
    missingFiles: [],
    extraFiles: []
  }
}
