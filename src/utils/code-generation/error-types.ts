/**
 * Type definitions for unified error generator
 */

/**
 * Configuration for generating error files
 */
export interface ErrorGeneratorOptions {
  /**
   * Base class name (e.g., "Product", "User")
   */
  readonly className: string

  /**
   * Library type determines error patterns and naming
   */
  readonly libraryType: "contract" | "data-access" | "feature" | "infra" | "provider"

  /**
   * Custom fields for specific error types
   * Overrides default fields for standard errors
   */
  readonly customFields?: Partial<Record<string, ReadonlyArray<ErrorField>>>

  /**
   * Include RPC-compatible Schema.TaggedError versions
   * @default false
   */
  readonly includeRpcErrors?: boolean
}

/**
 * Field definition for error classes
 */
export interface ErrorField {
  /**
   * Field name
   */
  readonly name: string

  /**
   * TypeScript type
   */
  readonly type: string

  /**
   * Whether field is optional
   * @default false
   */
  readonly optional?: boolean
}

/**
 * Standard error configuration
 */
export interface StandardErrorConfig {
  /**
   * Error name (e.g., "NotFound", "Validation")
   */
  readonly name: string

  /**
   * Description for documentation
   */
  readonly description: string

  /**
   * Default fields for this error type
   */
  readonly defaultFields: ReadonlyArray<ErrorField>
}
