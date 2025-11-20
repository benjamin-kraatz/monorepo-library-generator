/**
 * RPC Template
 *
 * Generates rpc/rpc.ts file for feature libraries.
 *
 * @module monorepo-library-generator/feature/rpc-template
 */

import { TypeScriptBuilder } from '../../../utils/code-generation/typescript-builder';
import type { FeatureTemplateOptions } from '../../../utils/shared/types';

/**
 * Generate rpc/rpc.ts file for feature library
 *
 * Creates RPC group definition with request/response schemas.
 */
export function generateRpcFile(options: FeatureTemplateOptions) {
  const builder = new TypeScriptBuilder();
  const { className, name } = options;

  // Add file header
  builder.addFileHeader({
    title: `${className} RPC Group`,
    description: `Uses @effect/rpc 0.69.5 with RpcGroup.make() pattern.
Defines the RPC interface for ${name} operations.`,
  });

  // Add imports
  builder.addImports([
    { from: '@effect/rpc', imports: ['Rpc', 'RpcGroup'] },
    { from: 'effect', imports: ['Schema'] },
    { from: './errors', imports: [`${className}RpcError`] },
  ]);
  builder.addBlankLine();

  // Add request/response schemas
  builder.addComment('Request/Response schemas');
  builder.addRaw(`export const ExampleRequest = Schema.Struct({
  id: Schema.String,
});`);
  builder.addBlankLine();

  builder.addRaw(`export const ExampleResponse = Schema.Struct({
  success: Schema.Boolean,
  message: Schema.String,
});`);
  builder.addBlankLine();

  // Add RPC group
  builder.addRaw(`/**
 * ${className} RPC Group
 *
 * Define all RPC operations for ${name} feature.
 */
export class ${className}Rpcs extends RpcGroup.make(
  Rpc.make("exampleOperation", {
    payload: ExampleRequest,
    success: ExampleResponse,
    error: ${className}RpcError,
  })
  // TODO: Add more RPC operations
) {}`);
  builder.addBlankLine();

  return builder.toString();
}
