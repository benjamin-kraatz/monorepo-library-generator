#!/usr/bin/env node
import { readFileSync, writeFileSync, mkdirSync, chmodSync } from 'fs';
import { join } from 'path';

const distDir = join(process.cwd(), 'dist');

// 1. Fix dist/package.json to include "type": "module"
const distPackageJsonPath = join(distDir, 'package.json');
const packageJson = JSON.parse(readFileSync(distPackageJsonPath, 'utf-8'));

// Add type: module after version
const { name, version, ...rest } = packageJson;
const updatedPackageJson = {
  name,
  version,
  type: 'module',
  ...rest
};

writeFileSync(distPackageJsonPath, JSON.stringify(updatedPackageJson, null, 2) + '\n');
console.log('✓ Added "type": "module" to dist/package.json');

// 2. Create dist/bin/cli.js
const binDir = join(distDir, 'bin');
mkdirSync(binDir, { recursive: true });

const cliContent = `#!/usr/bin/env node

import { main } from '../dist/esm/cli/index.js';
import { NodeRuntime } from '@effect/platform-node';

NodeRuntime.runMain(main(process.argv));
`;

const cliPath = join(binDir, 'cli.js');
writeFileSync(cliPath, cliContent);
chmodSync(cliPath, 0o755);

console.log('✓ Created dist/bin/cli.js');
