/**
 * Type definitions for unified service generator
 */

/**
 * Configuration for generating service files
 */
export interface ServiceGeneratorOptions {
  /**
   * Base class name (e.g., "Product", "User")
   */
  readonly className: string

  /**
   * Service name (e.g., "ProductService", "CacheService")
   */
  readonly serviceName: string

  /**
   * Library type determines service patterns
   */
  readonly libraryType: "feature" | "infra" | "provider"

  /**
   * Service methods to implement
   */
  readonly methods: ReadonlyArray<ServiceMethod>

  /**
   * Dependencies required by this service
   * @example ["ProductRepository", "LoggingService"]
   */
  readonly dependencies?: ReadonlyArray<string>

  /**
   * Include Test layer implementation
   * @default true
   */
  readonly includeTestLayer?: boolean

  /**
   * Include Dev layer implementation
   * @default false
   */
  readonly includeDevLayer?: boolean
}

/**
 * Service method definition
 */
export interface ServiceMethod {
  /**
   * Method name
   */
  readonly name: string

  /**
   * Method description for documentation
   */
  readonly description?: string

  /**
   * Method parameters
   */
  readonly params: ReadonlyArray<MethodParameter>

  /**
   * Return type (success case)
   */
  readonly returnType: string

  /**
   * Error type (failure case)
   * If not provided, uses default {ClassName}{Suffix}Errors
   */
  readonly errorType?: string
}

/**
 * Method parameter definition
 */
export interface MethodParameter {
  /**
   * Parameter name
   */
  readonly name: string

  /**
   * TypeScript type
   */
  readonly type: string

  /**
   * Whether parameter is optional
   * @default false
   */
  readonly optional?: boolean
}
