/**
 * Type definitions for unified layers generator
 */

/**
 * Configuration for generating layers files
 */
export interface LayersGeneratorOptions {
  /**
   * Base class name (e.g., "Product", "User")
   */
  readonly className: string

  /**
   * Service name (e.g., "ProductRepository", "ProductService")
   */
  readonly serviceName: string

  /**
   * Library type determines layer patterns
   */
  readonly libraryType: "data-access" | "feature" | "infra" | "provider"

  /**
   * Dependencies required by this service
   * @example ["DatabaseService", "LoggingService"]
   */
  readonly dependencies?: ReadonlyArray<string>

  /**
   * Layer variants to generate
   * @default ["Live", "Test", "Auto"]
   */
  readonly variants?: ReadonlyArray<LayerVariant>

  /**
   * Platform-specific layer variants (for infra/feature libraries)
   * If provided, generates platform-specific layers instead of standard variants
   */
  readonly platformVariants?: ReadonlyArray<"server" | "client" | "edge">
}

/**
 * Layer variant types
 */
export type LayerVariant = "Live" | "Test" | "Dev" | "Auto"
