/**
 * Monorepo Library Generator CLI
 *
 * Effect-based CLI for generating libraries in Effect-native monorepos.
 * Uses @effect/cli for command-line interface and @effect/platform for file operations.
 *
 * @module monorepo-library-generator/cli
 */

import { Args, Command, Options } from "@effect/cli"
import { NodeContext, NodeRuntime } from "@effect/platform-node"
import { Console, Effect, Option } from "effect"
import { generateContract } from "./generators/contract"
import { generateDataAccess } from "./generators/data-access"
import { generateFeature } from "./generators/feature"
import { generateInfra } from "./generators/infra"
import { generateProvider } from "./generators/provider"

/**
 * Common arguments used across all generate commands
 */
const nameArg = Args.text({ name: "name" }).pipe(
  Args.withDescription("The name of the library to generate")
)

/**
 * Common options for library generation
 */
const descriptionOption = Options.text("description").pipe(
  Options.withDescription("Description of the library"),
  Options.optional
)

const tagsOption = Options.text("tags").pipe(
  Options.withDescription("Comma-separated list of tags"),
  Options.withDefault("")
)

/**
 * Contract Generator Command
 *
 * Generates a contract library with entities, errors, events, and ports.
 */
const includeCQRSOption = Options.boolean("includeCQRS").pipe(
  Options.withDescription("Include CQRS patterns (commands, queries, projections)"),
  Options.withDefault(false)
)

const includeRPCOption = Options.boolean("includeRPC").pipe(
  Options.withDescription("Include RPC definitions"),
  Options.withDefault(false)
)

const contractCommand = Command.make(
  "contract",
  {
    name: nameArg,
    description: descriptionOption,
    tags: tagsOption,
    includeCQRS: includeCQRSOption,
    includeRPC: includeRPCOption
  },
  ({ description, includeCQRS, includeRPC, name, tags }) => {
    const desc = Option.getOrUndefined(description)
    return generateContract({
      name,
      ...(desc && { description: desc }),
      tags,
      includeCQRS,
      includeRPC
    }).pipe(
      Effect.catchAll((error) =>
        Console.error(`Error generating contract: ${error}`).pipe(
          Effect.flatMap(() => Effect.fail(error))
        )
      )
    )
  }
).pipe(
  Command.withDescription("Generate a contract library with domain types and interfaces")
)

/**
 * Data Access Generator Command
 *
 * Generates a data-access library with repositories and database operations.
 */
const dataAccessCommand = Command.make(
  "data-access",
  { name: nameArg, description: descriptionOption, tags: tagsOption },
  ({ description, name, tags }) => {
    const desc = Option.getOrUndefined(description)
    return generateDataAccess({
      name,
      ...(desc && { description: desc }),
      tags
    }).pipe(
      Effect.catchAll((error) =>
        Console.error(`Error generating data-access: ${error}`).pipe(
          Effect.flatMap(() => Effect.fail(error))
        )
      )
    )
  }
).pipe(
  Command.withDescription("Generate a data-access library with repositories and database operations")
)

/**
 * Feature Generator Command
 *
 * Generates a feature library with server, client, and edge implementations.
 */
const scopeOption = Options.text("scope").pipe(
  Options.withDescription("Scope tag for the feature"),
  Options.optional
)

const platformOption = Options.choice("platform", ["node", "browser", "universal", "edge"]).pipe(
  Options.withDescription("Target platform for the library"),
  Options.optional
)

const includeClientServerOption = Options.boolean("includeClientServer").pipe(
  Options.withDescription("Generate client and server exports (overrides platform defaults)"),
  Options.optional
)

const includeCQRSFeatureOption = Options.boolean("includeCQRS").pipe(
  Options.withDescription("Include CQRS patterns (commands, queries, projections)"),
  Options.optional
)

const includeEdgeOption = Options.boolean("includeEdge").pipe(
  Options.withDescription("Include edge runtime support"),
  Options.optional
)

const featureCommand = Command.make(
  "feature",
  {
    name: nameArg,
    description: descriptionOption,
    tags: tagsOption,
    scope: scopeOption,
    platform: platformOption,
    includeClientServer: includeClientServerOption,
    includeRPC: includeRPCOption,
    includeCQRS: includeCQRSFeatureOption,
    includeEdge: includeEdgeOption
  },
  ({ description, includeCQRS, includeClientServer, includeEdge, includeRPC, name, platform, scope, tags }) => {
    const desc = Option.getOrUndefined(description)
    const scopeValue = Option.getOrUndefined(scope)
    const platformValue = Option.getOrUndefined(platform) as "node" | "browser" | "universal" | "edge" | undefined
    const includeCS = Option.getOrUndefined(includeClientServer)
    const includeCQRSVal = Option.getOrUndefined(includeCQRS)
    const includeEdgeVal = Option.getOrUndefined(includeEdge)

    return generateFeature({
      name,
      ...(desc && { description: desc }),
      tags,
      ...(scopeValue && { scope: scopeValue }),
      ...(platformValue && { platform: platformValue }),
      ...(includeCS !== undefined && { includeClientServer: includeCS }),
      ...(includeRPC && { includeRPC }),
      ...(includeCQRSVal !== undefined && { includeCQRS: includeCQRSVal }),
      ...(includeEdgeVal !== undefined && { includeEdge: includeEdgeVal })
    }).pipe(
      Effect.catchAll((error) =>
        Console.error(`Error generating feature: ${error}`).pipe(
          Effect.flatMap(() => Effect.fail(error))
        )
      )
    )
  }
).pipe(
  Command.withDescription("Generate a feature library with server, client, and edge implementations")
)

/**
 * Infrastructure Generator Command
 *
 * Generates an infrastructure library with services and implementations.
 */
const infraCommand = Command.make(
  "infra",
  {
    name: nameArg,
    description: descriptionOption,
    tags: tagsOption,
    platform: platformOption,
    includeClientServer: includeClientServerOption,
    includeEdge: includeEdgeOption
  },
  ({ description, includeClientServer, includeEdge, name, platform, tags }) => {
    const desc = Option.getOrUndefined(description)
    const platformValue = Option.getOrUndefined(platform) as "node" | "browser" | "universal" | "edge" | undefined
    const includeCS = Option.getOrUndefined(includeClientServer)
    const includeEdgeVal = Option.getOrUndefined(includeEdge)

    return generateInfra({
      name,
      ...(desc && { description: desc }),
      tags,
      ...(platformValue && { platform: platformValue }),
      ...(includeCS !== undefined && { includeClientServer: includeCS }),
      ...(includeEdgeVal !== undefined && { includeEdge: includeEdgeVal })
    }).pipe(
      Effect.catchAll((error) =>
        Console.error(`Error generating infra: ${error}`).pipe(
          Effect.flatMap(() => Effect.fail(error))
        )
      )
    )
  }
).pipe(
  Command.withDescription("Generate an infrastructure library with services and implementations")
)

/**
 * Provider Generator Command
 *
 * Generates a provider library for external service integration.
 */
const externalServiceArg = Args.text({ name: "externalService" }).pipe(
  Args.withDescription("Name of the external service to integrate")
)

const providerCommand = Command.make(
  "provider",
  {
    name: nameArg,
    externalService: externalServiceArg,
    description: descriptionOption,
    tags: tagsOption,
    platform: platformOption
  },
  ({ description, externalService, name, platform, tags }) => {
    const desc = Option.getOrUndefined(description)
    const platformValue = Option.getOrUndefined(platform) as "node" | "browser" | "universal" | "edge" | undefined

    return generateProvider({
      name,
      externalService,
      ...(desc && { description: desc }),
      tags,
      ...(platformValue && { platform: platformValue })
    }).pipe(
      Effect.catchAll((error) =>
        Console.error(`Error generating provider: ${error}`).pipe(
          Effect.flatMap(() => Effect.fail(error))
        )
      )
    )
  }
).pipe(
  Command.withDescription("Generate a provider library for external service integration")
)

/**
 * Generate Command (parent command with subcommands)
 */
const generateCommand = Command.make("generate").pipe(
  Command.withDescription("Generate a new library"),
  Command.withSubcommands([
    contractCommand,
    dataAccessCommand,
    featureCommand,
    infraCommand,
    providerCommand
  ])
)

/**
 * Main CLI Application
 */
const cli = Command.run(generateCommand, {
  name: "Monorepo Library Generator",
  version: "v1.0.0"
})

/**
 * CLI Entry Point
 *
 * Processes command-line arguments and executes the CLI application
 * with the necessary Effect platform context.
 */
export function main(args: ReadonlyArray<string>) {
  return cli(args).pipe(
    Effect.provide(NodeContext.layer)
  )
}

/**
 * Run CLI if executed directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  NodeRuntime.runMain(main(process.argv))
}
