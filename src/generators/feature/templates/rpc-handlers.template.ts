/**
 * RPC Handlers Template
 *
 * Generates rpc/handlers.ts file for feature libraries.
 *
 * @module monorepo-library-generator/feature/rpc-handlers-template
 */

import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder.js"
import type { FeatureTemplateOptions } from "../../../utils/shared/types.js"

/**
 * Generate rpc/handlers.ts file for feature library
 *
 * Creates RPC handler implementations separate from RPC group definitions.
 */
export function generateRpcHandlersFile(options: FeatureTemplateOptions): string {
  const builder = new TypeScriptBuilder()
  const { className } = options

  // Add file header
  builder.addFileHeader({
    title: `${className} RPC Handlers`,
    description: `Separate handler definitions from RPC group.
Handlers have access to middleware context (e.g., CurrentUser).`
  })

  // Add imports
  builder.addImports([
    { from: "effect", imports: ["Effect"] },
    { from: "./rpc", imports: ["ExampleRequest"], isTypeOnly: true },
    { from: "../server/service", imports: [`${className}Service`] }
  ])
  builder.addBlankLine()

  // Add handlers
  builder.addRaw(`/**
 * ${className} RPC Handlers
 *
 * Implementation of RPC operations defined in ${className}Rpcs.
 */
export const ${className}Handlers = {
  exampleOperation: (payload: typeof ExampleRequest.Type) =>
    Effect.gen(function* () {
      // TODO: Access middleware context if needed
      // const user = yield* CurrentUser;

      // Get service from context
      const service = yield* ${className}Service;

      // Execute service operation
      yield* service.exampleOperation();

      // Return response
      return {
        success: true,
        message: "Operation completed successfully",
      };
    }),

  // TODO: Implement additional handlers
};`)
  builder.addBlankLine()

  return builder.toString()
}
