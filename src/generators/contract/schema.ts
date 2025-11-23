export interface ContractGeneratorSchema {
  name: string
  directory?: string
  description?: string
  dependencies?: Array<string>
  entities?: Array<string> | string // Can be array or JSON string from CLI
  includeCQRS?: boolean
  includeRPC?: boolean
  tags?: string
}
