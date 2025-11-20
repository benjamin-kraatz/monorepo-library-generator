/**
 * Monorepo Library Generator CLI
 *
 * Effect-based CLI for generating libraries in Effect-native monorepos.
 * Uses @effect/cli for command-line interface and @effect/platform for file operations.
 *
 * @module monorepo-library-generator/cli
 */

import { Args, Command, Options } from '@effect/cli';
import { NodeContext, NodeRuntime } from '@effect/platform-node';
import { Console, Effect, Option } from 'effect';
import { generateContract } from './generators/contract.js';

/**
 * Common arguments used across all generate commands
 */
const nameArg = Args.text({ name: 'name' }).pipe(
  Args.withDescription('The name of the library to generate'),
);

/**
 * Common options for library generation
 */
const descriptionOption = Options.text('description').pipe(
  Options.withDescription('Description of the library'),
  Options.optional,
);

const tagsOption = Options.text('tags').pipe(
  Options.withDescription('Comma-separated list of tags'),
  Options.withDefault(''),
);

/**
 * Contract Generator Command
 *
 * Generates a contract library with entities, errors, events, and ports.
 */
const includeCQRSOption = Options.boolean('includeCQRS').pipe(
  Options.withDescription('Include CQRS patterns (commands, queries, projections)'),
  Options.withDefault(false),
);

const includeRPCOption = Options.boolean('includeRPC').pipe(
  Options.withDescription('Include RPC definitions'),
  Options.withDefault(false),
);

const contractCommand = Command.make(
  'contract',
  { name: nameArg, description: descriptionOption, tags: tagsOption, includeCQRS: includeCQRSOption, includeRPC: includeRPCOption },
  ({ name, description, tags, includeCQRS, includeRPC }) =>
    generateContract({
      name,
      description: Option.getOrUndefined(description),
      tags,
      includeCQRS,
      includeRPC,
    }).pipe(
      Effect.catchAll((error) =>
        Console.error(`Error generating contract: ${error}`).pipe(
          Effect.flatMap(() => Effect.fail(error)),
        ),
      ),
    ),
).pipe(
  Command.withDescription('Generate a contract library with domain types and interfaces'),
);

/**
 * Data Access Generator Command
 *
 * Generates a data-access library with repositories and database operations.
 */
const dataAccessCommand = Command.make(
  'data-access',
  { name: nameArg, description: descriptionOption, tags: tagsOption },
  ({ name, description, tags }) =>
    Effect.gen(function* () {
      const desc = Option.getOrUndefined(description);
      yield* Console.log(`Generating data-access library: ${name}`);
      yield* Console.log(`  Description: ${desc ?? 'N/A'}`);
      yield* Console.log(`  Tags: ${tags}`);

      // TODO: Implement actual data-access generation logic
      yield* Console.log('Data-access generation not yet implemented');
    }),
).pipe(
  Command.withDescription('Generate a data-access library with repositories and database operations'),
);

/**
 * Feature Generator Command
 *
 * Generates a feature library with server, client, and edge implementations.
 */
const featureCommand = Command.make(
  'feature',
  { name: nameArg, description: descriptionOption, tags: tagsOption, includeRPC: includeRPCOption },
  ({ name, description, tags, includeRPC }) =>
    Effect.gen(function* () {
      const desc = Option.getOrUndefined(description);
      yield* Console.log(`Generating feature library: ${name}`);
      yield* Console.log(`  Description: ${desc ?? 'N/A'}`);
      yield* Console.log(`  Tags: ${tags}`);
      yield* Console.log(`  Include RPC: ${includeRPC}`);

      // TODO: Implement actual feature generation logic
      yield* Console.log('Feature generation not yet implemented');
    }),
).pipe(
  Command.withDescription('Generate a feature library with server, client, and edge implementations'),
);

/**
 * Infrastructure Generator Command
 *
 * Generates an infrastructure library with services and implementations.
 */
const infraCommand = Command.make(
  'infra',
  { name: nameArg, description: descriptionOption, tags: tagsOption },
  ({ name, description, tags }) =>
    Effect.gen(function* () {
      const desc = Option.getOrUndefined(description);
      yield* Console.log(`Generating infra library: ${name}`);
      yield* Console.log(`  Description: ${desc ?? 'N/A'}`);
      yield* Console.log(`  Tags: ${tags}`);

      // TODO: Implement actual infra generation logic
      yield* Console.log('Infra generation not yet implemented');
    }),
).pipe(
  Command.withDescription('Generate an infrastructure library with services and implementations'),
);

/**
 * Provider Generator Command
 *
 * Generates a provider library for external service integration.
 */
const externalServiceOption = Options.text('externalService').pipe(
  Options.withDescription('Name of the external service to integrate'),
  Options.optional,
);

const providerCommand = Command.make(
  'provider',
  { name: nameArg, description: descriptionOption, tags: tagsOption, externalService: externalServiceOption },
  ({ name, description, tags, externalService }) =>
    Effect.gen(function* () {
      const desc = Option.getOrUndefined(description);
      const extService = Option.getOrUndefined(externalService);
      yield* Console.log(`Generating provider library: ${name}`);
      yield* Console.log(`  Description: ${desc ?? 'N/A'}`);
      yield* Console.log(`  Tags: ${tags}`);
      yield* Console.log(`  External Service: ${extService ?? 'N/A'}`);

      // TODO: Implement actual provider generation logic
      yield* Console.log('Provider generation not yet implemented');
    }),
).pipe(
  Command.withDescription('Generate a provider library for external service integration'),
);

/**
 * Generate Command (parent command with subcommands)
 */
const generateCommand = Command.make('generate').pipe(
  Command.withDescription('Generate a new library'),
  Command.withSubcommands([
    contractCommand,
    dataAccessCommand,
    featureCommand,
    infraCommand,
    providerCommand,
  ]),
);

/**
 * Main CLI Application
 */
const cli = Command.run(generateCommand, {
  name: 'Monorepo Library Generator',
  version: 'v1.0.0',
});

/**
 * CLI Entry Point
 *
 * Processes command-line arguments and executes the CLI application
 * with the necessary Effect platform context.
 */
export function main(args: readonly string[]) {
  return cli(args).pipe(
    Effect.provide(NodeContext.layer),
  );
}

/**
 * Run CLI if executed directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  NodeRuntime.runMain(main(process.argv));
}
