import type { PlatformType } from "../../utils/platform-utils"

export interface InfraGeneratorSchema {
  name: string
  directory?: string
  description?: string
  tags?: string
  platform?: PlatformType
  includeClientServer?: boolean
  includeEdge?: boolean
}
