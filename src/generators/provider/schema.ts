/**
 * Provider Generator Schema Interface
 *
 * Defines the options interface for the provider generator
 * based on the JSON schema definition.
 */

export interface ProviderGeneratorSchema {
  name: string
  directory?: string
  externalService: string
  description?: string
  platform?: "node" | "browser" | "universal" | "edge"
  includeClientServer?: boolean
  tags?: string
}

/**
 * Normalized options with defaults applied and computed values
 */
export interface NormalizedProviderOptions {
  name: string
  directory?: string
  externalService: string
  description: string
  platform: "node" | "browser" | "universal" | "edge"
  includeClientServer: boolean
  projectName: string
  projectRoot: string
  projectClassName: string
  projectConstantName: string
  parsedTags: Array<string>
  offsetFromRoot: string
  className: string
  propertyName: string
  fileName: string
  constantName: string
  sourceRoot: string
  packageName: string
}
