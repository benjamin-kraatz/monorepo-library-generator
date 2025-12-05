import type { PlatformType } from "../../utils/platforms"

export interface InfraGeneratorSchema {
  name: string
  directory?: string
  description?: string
  tags?: string
  platform?: PlatformType
  includeClientServer?: boolean
  includeEdge?: boolean
}
