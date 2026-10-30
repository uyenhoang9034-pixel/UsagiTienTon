/**
 * Command aliases for Usagi Bot.
 */

export const commandAliases = {
  bocque: 'boc-que',
  xinnghi: 'xin-nghi',
  dotvia: 'dot-via',
};

export const subcommandAliases = {};

export function resolveCommandAlias(commandName = '') {
  const normalized = String(commandName).trim().toLowerCase();
  return commandAliases[normalized] || commandName;
}

export function resolveSubcommandAlias(subcommandName = '') {
  const normalized = String(subcommandName).trim().toLowerCase();
  return subcommandAliases[normalized] || subcommandName;
}
