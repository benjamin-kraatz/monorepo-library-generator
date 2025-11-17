/**
 * Infrastructure Templates
 *
 * TypeScript-based template functions for infrastructure generator.
 * These replace the EJS templates with type-safe TypeScript functions.
 *
 * @module monorepo-library-generator/infra-templates
 */

export { generateErrorsFile } from './errors.template.js';
export { generateInterfaceFile } from './interface.template.js';
export { generateConfigFile } from './config.template.js';
export { generateMemoryProviderFile } from './memory-provider.template.js';
export { generateServerLayersFile } from './server-layers.template.js';
export { generateClientLayersFile } from './client-layers.template.js';
export { generateEdgeLayersFile } from './edge-layers.template.js';
export { generateUseHookFile } from './use-hook.template.js';
export { generateIndexFile } from './index.template.js';
export { generateServerFile } from './server.template.js';
export { generateClientFile } from './client.template.js';
export { generateEdgeFile } from './edge.template.js';
