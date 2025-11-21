export interface ContractGeneratorSchema {
  name: string
  directory?: string
  description?: string
  dependencies?: Array<string>
  includeCQRS?: boolean
  includeRPC?: boolean
  tags?: string
}
