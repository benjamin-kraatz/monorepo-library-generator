/**
 * Provider Operations Index Template
 *
 * Generates service/operations/index.ts barrel file
 *
 * @module monorepo-library-generator/provider/service/operations-index-template
 */

import { TypeScriptBuilder } from "../../../../utils/code-generation/typescript-builder"
import type { ProviderTemplateOptions } from "../../../../utils/shared/types"

/**
 * Generate service/operations/index.ts file
 *
 * Creates barrel export for all operations
 */
export function generateProviderOperationsIndexFile(
  options: ProviderTemplateOptions
) {
  const builder = new TypeScriptBuilder()
  const { className, fileName } = options

  builder.addFileHeader({
    title: `${className} Operations`,
    description: `Barrel exports for all ${className} service operations.

For optimal bundle size, import operations directly:
  import { createOperations } from '@scope/provider-${fileName}/service/operations/create';

For convenience, you can import from this barrel:
  import { createOperations, queryOperations } from '@scope/provider-${fileName}/service/operations';`,
    module: `@custom-repo/provider-${fileName}/service/operations`
  })
  builder.addBlankLine()

  builder.addSectionComment("Re-export all operations")
  builder.addBlankLine()

  builder.addRaw(`export type { Create${className}Operations } from "./create";
export { createOperations, testCreateOperations, testStore } from "./create";

export type { Query${className}Operations } from "./query";
export { queryOperations, testQueryOperations } from "./query";

export type { Update${className}Operations } from "./update";
export { updateOperations, testUpdateOperations } from "./update";

export type { Delete${className}Operations } from "./delete";
export { deleteOperations, testDeleteOperations } from "./delete";`)

  return builder.toString()
}
