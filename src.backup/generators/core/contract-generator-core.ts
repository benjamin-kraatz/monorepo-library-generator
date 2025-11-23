/**
 * Contract Generator Core
 *
 * Shared core logic for generating contract libraries.
 * Works with both Nx Tree API and Effect FileSystem via FileSystemAdapter.
 *
 * @module monorepo-library-generator/generators/core/contract-generator-core
 */

import { Effect } from "effect"
import { calculateOffsetFromRoot, parseTags } from "../../utils/generator-utils"
import type { FileSystemAdapter, FileSystemErrors } from "../../utils/filesystem-adapter"
import { generateInfrastructureFiles } from "../../utils/infrastructure-generator"
import { createNamingVariants } from "../../utils/naming-utils"
import type { ContractTemplateOptions } from "../../utils/shared/types"
import { detectWorkspaceConfig } from "../../utils/workspace-detection"
import { generateCommandsFile } from "../contract/templates/commands.template"
import { generateEntitiesFile } from "../contract/templates/entities.template"
import { generateErrorsFile } from "../contract/templates/errors.template"
import { generateEventsFile } from "../contract/templates/events.template"
import { generateIndexFile } from "../contract/templates/index.template"
import { generatePortsFile } from "../contract/templates/ports.template"
import { generateProjectionsFile } from "../contract/templates/projections.template"
import { generateQueriesFile } from "../contract/templates/queries.template"
import { generateRpcFile } from "../contract/templates/rpc.template"

/**
 * Contract Generator Options
 *
 * Unified options interface for both Nx and CLI entry points
 */
export interface ContractGeneratorCoreOptions {
  readonly name: string
  readonly description?: string
  readonly tags?: string
  readonly includeCQRS?: boolean
  readonly includeRPC?: boolean
  readonly workspaceRoot?: string // Optional, adapter provides default if not specified
  readonly directory?: string // Optional parent directory (e.g., "shared")
}

/**
 * Generator Result
 *
 * Metadata about the generated library
 */
export interface GeneratorResult {
  readonly projectName: string
  readonly projectRoot: string
  readonly packageName: string
  readonly sourceRoot: string
  readonly filesGenerated: ReadonlyArray<string>
}

/**
 * Generate Contract Library (Core Logic)
 *
 * This is the shared core that works with any FileSystemAdapter.
 * Both Nx and CLI wrappers call this function.
 *
 * @param adapter - FileSystemAdapter implementation (Tree or Effect FS)
 * @param options - Generator options
 * @returns Effect that succeeds with GeneratorResult or fails with FileSystemErrors
 */
export function generateContractCore(
  adapter: FileSystemAdapter,
  options: ContractGeneratorCoreOptions
): Effect.Effect<GeneratorResult, FileSystemErrors, unknown> {
  return Effect.gen(function*() {
    // 1. Detect workspace configuration
    const workspaceConfig = yield* detectWorkspaceConfig(adapter)
    const workspaceRoot = options.workspaceRoot ?? workspaceConfig.workspaceRoot

    // 2. Generate naming variants
    const nameVariants = createNamingVariants(options.name)
    const projectName = `contract-${nameVariants.fileName}`
    const packageName = `${workspaceConfig.scope}/${projectName}`

    // 3. Determine project location
    const projectRoot = options.directory
      ? `${options.directory}/${projectName}`
      : `${workspaceConfig.librariesRoot}/contract/${nameVariants.fileName}`

    const sourceRoot = `${projectRoot}/src`
    const offsetFromRoot = calculateOffsetFromRoot(projectRoot)

    // 4. Parse tags
    const parsedTags = parseTags(options.tags, [
      "type:contract",
      `domain:${nameVariants.fileName}`,
      "platform:universal"
    ])

    // 5. Generate infrastructure files (package.json, tsconfig, etc.)
    yield* generateInfrastructureFiles(adapter, {
      workspaceRoot,
      projectRoot,
      projectName,
      packageName,
      description: options.description ?? `Contract library for ${nameVariants.className}`,
      libraryType: "contract",
      offsetFromRoot
    })

    // 6. Prepare template options for domain files
    const templateOptions: ContractTemplateOptions = {
      // Naming variants
      name: options.name,
      className: nameVariants.className,
      propertyName: nameVariants.propertyName,
      fileName: nameVariants.fileName,
      constantName: nameVariants.constantName,

      // Library metadata
      libraryType: "contract",
      packageName,
      projectName,
      projectRoot,
      sourceRoot,
      offsetFromRoot,
      description: options.description ?? `Contract library for ${nameVariants.className}`,
      tags: parsedTags,

      // Feature flags
      includeCQRS: options.includeCQRS ?? false,
      includeRPC: options.includeRPC ?? false
    }

    // 7. Generate domain files
    const filesGenerated = yield* generateDomainFiles(adapter, sourceRoot, templateOptions)

    // 8. Return result
    return {
      projectName,
      projectRoot,
      packageName,
      sourceRoot,
      filesGenerated
    }
  })
}

/**
 * Generate domain-specific files using templates
 */
function generateDomainFiles(
  adapter: FileSystemAdapter,
  sourceRoot: string,
  templateOptions: ContractTemplateOptions
): Effect.Effect<ReadonlyArray<string>, FileSystemErrors, unknown> {
  return Effect.gen(function*() {
    const workspaceRoot = adapter.getWorkspaceRoot()
    const sourceLibPath = `${workspaceRoot}/${sourceRoot}/lib`
    const files: Array<string> = []

    // Generate CLAUDE.md
    const claudeDoc = `# ${templateOptions.packageName}

${templateOptions.description}

## AI Agent Reference

This is a contract library defining domain types and interfaces.

### Structure

- **lib/entities.ts**: Domain entities with Effect Schema
- **lib/errors.ts**: Domain-specific error types (Data.TaggedError)
- **lib/events.ts**: Domain events
- **lib/ports.ts**: Repository/service interfaces (Context.Tag pattern)
${
      templateOptions.includeCQRS
        ? `- **lib/commands.ts**: CQRS command schemas\n- **lib/queries.ts**: CQRS query schemas\n- **lib/projections.ts**: Read-model projections`
        : ""
    }${templateOptions.includeRPC ? `\n- **lib/rpc.ts**: RPC endpoint definitions` : ""}

### Customization Guide

1. **Entities** (\`lib/entities.ts\`):
   - Update entity schemas to match your domain
   - Add custom fields and validation
   - Define value objects

2. **Errors** (\`lib/errors.ts\`):
   - Add domain-specific error types
   - Use Data.TaggedError for error handling

3. **Ports** (\`lib/ports.ts\`):
   - Define repository interfaces
   - Add service interfaces
   - Use Context.Tag for dependency injection

### Usage Example

\`\`\`typescript
import { ${templateOptions.className}, ${templateOptions.className}Repository } from '${templateOptions.packageName}';

// Use in your Effect program
Effect.gen(function* () {
  const repo = yield* ${templateOptions.className}Repository;
  const entity = yield* repo.findById("id-123");
  // ...
});
\`\`\`
`

    yield* adapter.writeFile(`${workspaceRoot}/${templateOptions.projectRoot}/CLAUDE.md`, claudeDoc)

    // Create lib directory
    yield* adapter.makeDirectory(sourceLibPath)

    // Generate core files (always)
    const coreFiles = [
      { path: "errors.ts", generator: generateErrorsFile },
      { path: "entities.ts", generator: generateEntitiesFile },
      { path: "ports.ts", generator: generatePortsFile },
      { path: "events.ts", generator: generateEventsFile }
    ]

    for (const { generator, path } of coreFiles) {
      const filePath = `${sourceLibPath}/${path}`
      const content = generator(templateOptions)
      yield* adapter.writeFile(filePath, content)
      files.push(filePath)
    }

    // Generate CQRS files (conditional)
    if (templateOptions.includeCQRS) {
      const cqrsFiles = [
        { path: "commands.ts", generator: generateCommandsFile },
        { path: "queries.ts", generator: generateQueriesFile },
        { path: "projections.ts", generator: generateProjectionsFile }
      ]

      for (const { generator, path } of cqrsFiles) {
        const filePath = `${sourceLibPath}/${path}`
        const content = generator(templateOptions)
        yield* adapter.writeFile(filePath, content)
        files.push(filePath)
      }
    }

    // Generate RPC file (conditional)
    if (templateOptions.includeRPC) {
      const rpcPath = `${sourceLibPath}/rpc.ts`
      const content = generateRpcFile(templateOptions)
      yield* adapter.writeFile(rpcPath, content)
      files.push(rpcPath)
    }

    // Generate index file (barrel exports)
    const indexPath = `${workspaceRoot}/${sourceRoot}/index.ts`
    const indexContent = generateIndexFile(templateOptions)
    yield* adapter.writeFile(indexPath, indexContent)
    files.push(indexPath)

    return files
  })
}
