/**
 * Command aliases for Usagi Bot.
 */

export const commandAliases = {};

export const subcommandAliases = {};

export function resolveCommandAlias(commandName = '') {
  const normalized = String(commandName).trim().toLowerCase();
  return commandAliases[normalized] || commandName;
}

export function resolveSubcommandAlias(subcommandName = '') {
  const normalized = String(subcommandName).trim().toLowerCase();
  return subcommandAliases[normalized] || subcommandName;
}
