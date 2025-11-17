/**
 * Layers Template
 *
 * Generates server/layers.ts file for feature libraries.
 *
 * @module monorepo-library-generator/feature/layers-template
 */

import { TypeScriptBuilder } from "../../../utils/code-generation/typescript-builder.js"
import type { FeatureTemplateOptions } from "../../../utils/shared/types.js"

/**
 * Generate server/layers.ts file for feature library
 *
 * Creates layer composition for different environments.
 */
export function generateLayersFile(options: FeatureTemplateOptions): string {
  const builder = new TypeScriptBuilder()
  const { className, name } = options

  // Add file header
  builder.addFileHeader({
    title: `${className} Layers`,
    description: `Layer composition for ${name} feature.
Provides different layer implementations for different environments.`
  })

  // Add imports
  builder.addImports([
    { from: "effect", imports: ["Effect", "Layer"] },
    { from: "./service", imports: [`${className}Service`] }
  ])
  builder.addBlankLine()

  // Add Live layer
  builder.addRaw(`/**
 * Live layer for production
 */
export const ${className}ServiceLive = ${className}Service.Live;`)
  builder.addBlankLine()

  // Add Test layer
  builder.addRaw(`/**
 * Test layer with mock implementations
 * Uses Layer.succeed with plain object for deterministic testing
 */
export const ${className}ServiceTest = Layer.succeed(
  ${className}Service,
  {
    exampleOperation: () => Effect.void,
  }
);`)
  builder.addBlankLine()

  // Add Auto layer
  builder.addRaw(`/**
 * Auto layer - automatically selects based on environment
 */
export const ${className}ServiceAuto = ${className}Service.Live;`)
  builder.addBlankLine()

  return builder.toString()
}
