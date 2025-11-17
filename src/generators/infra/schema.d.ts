export interface InfraGeneratorSchema {
  name: string;
  directory?: string;
  description?: string;
  includeClientServer?: boolean;
  includeEdge?: boolean;
}
