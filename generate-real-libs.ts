#!/usr/bin/env tsx
import { FsTree } from 'nx/src/generators/tree';
import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import contractGenerator from './src/generators/contract/contract';
import dataAccessGenerator from './src/generators/data-access/data-access';
import featureGenerator from './src/generators/feature/feature';
import infraGenerator from './src/generators/infra/infra';
import providerGenerator from './src/generators/provider/provider';

const WORKSPACE = 'generated-libs';

async function generate() {
  console.log('🏗️  GENERATING REAL LIBRARIES TO DISK\n');

  const tree = new FsTree(WORKSPACE, false);

  // Generate all 5 library types
  console.log('📦 Generating contract/product...');
  await contractGenerator(tree, { name: 'product', includeCQRS: true });

  console.log('📦 Generating data-access/user...');
  await dataAccessGenerator(tree, { name: 'user' });

  console.log('📦 Generating feature/payment...');
  await featureGenerator(tree, { name: 'payment', platform: 'universal', includeClientServer: true });

  console.log('📦 Generating infra/cache...');
  await infraGenerator(tree, { name: 'cache' });

  console.log('📦 Generating provider/stripe...');
  await providerGenerator(tree, { name: 'stripe', externalService: 'Stripe' });

  // Write all changes to disk
  console.log('\n💾 Writing files to disk...');
  let fileCount = 0;

  for (const change of tree.listChanges()) {
    const fullPath = `${WORKSPACE}/${change.path}`;
    mkdirSync(dirname(fullPath), { recursive: true });

    if (change.type === 'CREATE' || change.type === 'UPDATE') {
      writeFileSync(fullPath, change.content);
      fileCount++;
    }
  }

  console.log(`✅ ${fileCount} files written!\n`);
  console.log('📁 LIBRARIES GENERATED IN: generated-libs/libs/\n');
  console.log('Generated libraries:');
  console.log('  • libs/contract/product/');
  console.log('  • libs/data-access/user/');
  console.log('  • libs/feature/payment/');
  console.log('  • libs/infra/cache/');
  console.log('  • libs/provider/stripe/');
}

generate().catch(console.error);
