/**
 * Provider Generator Schema Interface
 *
 * Defines the options interface for the provider generator
 * based on the JSON schema definition.
 */

export interface ProviderGeneratorSchema {
  name: string;
  directory?: string;
  externalService: string;
  description?: string;
  platform?: "node" | "browser" | "universal" | "edge";
  includeClientServer?: boolean;
  tags?: string;
}

/**
 * Normalized options with defaults applied and computed values
 */
export interface NormalizedProviderOptions
  extends Required<Omit<ProviderGeneratorSchema, "tags" | "description">> {
  description: string;
  projectName: string;
  projectRoot: string;
  projectClassName: string;
  projectConstantName: string;
  parsedTags: string[];
  offsetFromRoot: string;
}
