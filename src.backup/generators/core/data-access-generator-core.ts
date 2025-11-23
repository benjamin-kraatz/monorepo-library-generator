/**
 * Data Access Generator Core
 *
 * Shared core logic for generating data-access libraries.
 * Works with both Nx Tree API and Effect FileSystem via FileSystemAdapter.
 *
 * @module monorepo-library-generator/generators/core/data-access-generator-core
 */

import { Effect } from "effect"
import { calculateOffsetFromRoot, parseTags } from "../../utils/generator-utils"
import type { FileSystemAdapter, FileSystemErrors } from "../../utils/filesystem-adapter"
import { generateInfrastructureFiles } from "../../utils/infrastructure-generator"
import { createNamingVariants } from "../../utils/naming-utils"
import type { DataAccessTemplateOptions } from "../../utils/shared/types"
import { detectWorkspaceConfig } from "../../utils/workspace-detection"
import { generateErrorsFile } from "../data-access/templates/errors.template"
import { generateIndexFile } from "../data-access/templates/index.template"
import { generateLayersSpecFile } from "../data-access/templates/layers-spec.template"
import { generateLayersFile } from "../data-access/templates/layers.template"
import { generateQueriesFile } from "../data-access/templates/queries.template"
import { generateRepositorySpecFile } from "../data-access/templates/repository-spec.template"
import { generateRepositoryFile } from "../data-access/templates/repository.template"
import { generateTypesFile } from "../data-access/templates/types.template"
import { generateValidationFile } from "../data-access/templates/validation.template"
import type { GeneratorResult } from "./contract-generator-core"

export type { GeneratorResult }

/**
 * Data Access Generator Options
 */
export interface DataAccessGeneratorCoreOptions {
  readonly name: string
  readonly description?: string
  readonly tags?: string
  readonly workspaceRoot?: string
  readonly directory?: string
}

/**
 * Generate Data Access Library (Core Logic)
 */
export function generateDataAccessCore(
  adapter: FileSystemAdapter,
  options: DataAccessGeneratorCoreOptions
): Effect.Effect<GeneratorResult, FileSystemErrors, unknown> {
  return Effect.gen(function*() {
    // 1. Detect workspace configuration
    const workspaceConfig = yield* detectWorkspaceConfig(adapter)
    const workspaceRoot = options.workspaceRoot ?? workspaceConfig.workspaceRoot

    // 2. Generate naming variants
    const nameVariants = createNamingVariants(options.name)
    const projectName = `data-access-${nameVariants.fileName}`
    const packageName = `${workspaceConfig.scope}/${projectName}`

    // 3. Determine project location
    const projectRoot = options.directory
      ? `${options.directory}/${projectName}`
      : `${workspaceConfig.librariesRoot}/data-access/${nameVariants.fileName}`

    const sourceRoot = `${projectRoot}/src`
    const offsetFromRoot = calculateOffsetFromRoot(projectRoot)

    // 4. Parse tags
    const parsedTags = parseTags(options.tags, [
      "type:data-access",
      "scope:shared",
      "platform:server"
    ])

    // 5. Generate infrastructure files
    yield* generateInfrastructureFiles(adapter, {
      workspaceRoot,
      projectRoot,
      projectName,
      packageName,
      description: options.description ?? `Data access library for ${nameVariants.className}`,
      libraryType: "data-access",
      offsetFromRoot
    })

    // 6. Prepare template options
    const templateOptions: DataAccessTemplateOptions = {
      name: options.name,
      className: nameVariants.className,
      propertyName: nameVariants.propertyName,
      fileName: nameVariants.fileName,
      constantName: nameVariants.constantName,
      libraryType: "data-access",
      packageName,
      projectName,
      projectRoot,
      sourceRoot,
      offsetFromRoot,
      description: options.description ?? `Data access library for ${nameVariants.className}`,
      tags: parsedTags,
      includeCache: false,
      contractLibrary: `${workspaceConfig.scope}/contract-${nameVariants.fileName}`
    }

    // 7. Generate domain files
    const filesGenerated = yield* generateDomainFiles(adapter, sourceRoot, templateOptions)

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
 * Generate domain-specific files
 */
function generateDomainFiles(
  adapter: FileSystemAdapter,
  sourceRoot: string,
  templateOptions: DataAccessTemplateOptions
): Effect.Effect<ReadonlyArray<string>, FileSystemErrors, unknown> {
  return Effect.gen(function*() {
    const workspaceRoot = adapter.getWorkspaceRoot()
    const sourceLibPath = `${workspaceRoot}/${sourceRoot}/lib`
    const sourceSharedPath = `${sourceLibPath}/shared`
    const sourceServerPath = `${sourceLibPath}/server`
    const files: Array<string> = []

    // Generate CLAUDE.md
    const claudeDoc = `# ${templateOptions.packageName}

${templateOptions.description}

## AI Agent Reference

This is a data-access library following Effect-based repository patterns.

### Structure

- **lib/shared/**: Shared types, errors, and validation
  - \`errors.ts\`: Data.TaggedError-based error types
  - \`types.ts\`: Entity types, filters, pagination
  - \`validation.ts\`: Input validation helpers

- **lib/repository.ts**: Repository implementation with CRUD operations
- **lib/queries.ts**: Kysely query builders
- **lib/server/layers.ts**: Server-side Layer compositions (Live, Test, Dev, Auto)

### Customization Guide

1. **Update Entity Types** (\`lib/shared/types.ts\`):
   - Modify entity schema to match your domain
   - Add custom filter types
   - Update pagination options

2. **Implement Repository** (\`lib/repository.ts\`):
   - Customize CRUD methods
   - Add domain-specific queries
   - Implement business logic

3. **Configure Layers** (\`lib/server/layers.ts\`):
   - Wire up dependencies (database, cache, etc.)
   - Configure Live layer with actual implementations
   - Customize Test layer for testing

### Usage Example

\`\`\`typescript
import { ${templateOptions.className}Repository } from '${templateOptions.packageName}';

// Use in your Effect program
Effect.gen(function* () {
  const repo = yield* ${templateOptions.className}Repository;
  const result = yield* repo.findById("id-123");
  // ...
});
\`\`\`
`

    yield* adapter.writeFile(`${workspaceRoot}/${templateOptions.projectRoot}/CLAUDE.md`, claudeDoc)

    // Create directories
    yield* adapter.makeDirectory(sourceLibPath)
    yield* adapter.makeDirectory(sourceSharedPath)
    yield* adapter.makeDirectory(sourceServerPath)

    // Generate shared files
    const sharedFiles = [
      { path: `${sourceSharedPath}/errors.ts`, generator: generateErrorsFile },
      { path: `${sourceSharedPath}/types.ts`, generator: generateTypesFile },
      { path: `${sourceSharedPath}/validation.ts`, generator: generateValidationFile }
    ]

    for (const { generator, path } of sharedFiles) {
      const content = generator(templateOptions)
      yield* adapter.writeFile(path, content)
      files.push(path)
    }

    // Generate repository files
    const repoFiles = [
      { path: `${sourceLibPath}/queries.ts`, generator: generateQueriesFile },
      { path: `${sourceLibPath}/repository.ts`, generator: generateRepositoryFile },
      { path: `${sourceLibPath}/repository.spec.ts`, generator: generateRepositorySpecFile }
    ]

    for (const { generator, path } of repoFiles) {
      const content = generator(templateOptions)
      yield* adapter.writeFile(path, content)
      files.push(path)
    }

    // Generate server files
    yield* adapter.writeFile(
      `${sourceServerPath}/layers.ts`,
      generateLayersFile(templateOptions)
    )
    files.push(`${sourceServerPath}/layers.ts`)

    yield* adapter.writeFile(
      `${sourceLibPath}/layers.spec.ts`,
      generateLayersSpecFile(templateOptions)
    )
    files.push(`${sourceLibPath}/layers.spec.ts`)

    // Generate index
    const indexPath = `${workspaceRoot}/${sourceRoot}/index.ts`
    yield* adapter.writeFile(indexPath, generateIndexFile(templateOptions))
    files.push(indexPath)

    return files
  })
}
