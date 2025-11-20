#!/usr/bin/env node

import { main } from '../build/esm/cli/index.js';
import { NodeRuntime } from '@effect/platform-node';

NodeRuntime.runMain(main(process.argv));
