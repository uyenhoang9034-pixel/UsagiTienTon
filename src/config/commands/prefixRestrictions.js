/**
 * Prefix command restrictions for Usagi Bot.
 */

/** Top-level commands that cannot be invoked via prefix at all. */
export const SLASH_ONLY_COMMANDS = new Set([]);

/** Subcommands blocked for every command when invoked via prefix. */
export const GLOBAL_BLOCKED_SUBCOMMANDS = new Set([]);

/** Subcommand groups blocked for every command when invoked via prefix. */
export const GLOBAL_BLOCKED_SUBCOMMAND_GROUPS = new Set([]);

/** Per-command subcommands that stay slash-only. */
export const COMMAND_BLOCKED_SUBCOMMANDS = {};

function collectSubcommandNames(commandJson) {
  const subcommandGroups =
    commandJson.options?.filter((opt) => opt.type === 2) || [];

  if (subcommandGroups.length > 0) {
    const names = [];

    for (const group of subcommandGroups) {
      for (const sub of group.options || []) {
        if (sub.type === 1) {
          names.push(sub.name);
        }
      }
    }

    return names;
  }

  return (commandJson.options?.filter((opt) => opt.type === 1) || [])
    .map((sub) => sub.name);
}

function isSubcommandBlocked(commandName, subcommandName) {
  if (!subcommandName) {
    return false;
  }

  if (GLOBAL_BLOCKED_SUBCOMMANDS.has(subcommandName)) {
    return true;
  }

  const commandBlocked = COMMAND_BLOCKED_SUBCOMMANDS[commandName];
  return commandBlocked?.has(subcommandName) ?? false;
}

export function getPrefixRestriction(command, args = [], resolveSubcommandAlias = (name) => name) {
  if (!command?.data?.toJSON) {
    return { blocked: false };
  }

  const commandJson = command.data.toJSON();
  const commandName = commandJson.name?.toLowerCase();

  if (command.prefixOnly === false || command.slashOnly === true) {
    return {
      blocked: true,
      reason: 'Lệnh này chỉ dùng bằng slash command.',
    };
  }

  if (SLASH_ONLY_COMMANDS.has(commandName)) {
    return {
      blocked: true,
      reason: 'Lệnh này chỉ dùng bằng slash command.',
    };
  }

  const [firstArg, secondArg] = args.map((arg) => arg?.toLowerCase?.() || null);
  const resolvedFirstArg = firstArg ? resolveSubcommandAlias(firstArg) : null;
  const resolvedSecondArg = secondArg ? resolveSubcommandAlias(secondArg) : null;

  const subcommandGroups =
    commandJson.options?.filter((opt) => opt.type === 2) || [];

  const allSubcommandNames = collectSubcommandNames(commandJson);
  const allSubcommandsBlocked =
    allSubcommandNames.length > 0 &&
    allSubcommandNames.every((name) => isSubcommandBlocked(commandName, name));

  if (allSubcommandsBlocked) {
    return {
      blocked: true,
      reason: 'Lệnh này chỉ dùng bằng slash command.',
    };
  }

  if (firstArg && GLOBAL_BLOCKED_SUBCOMMAND_GROUPS.has(firstArg)) {
    return {
      blocked: true,
      reason: 'Nhóm subcommand này chỉ dùng bằng slash command.',
    };
  }

  if (resolvedFirstArg && isSubcommandBlocked(commandName, resolvedFirstArg)) {
    return {
      blocked: true,
      reason: 'Subcommand này chỉ dùng bằng slash command.',
    };
  }

  if (
    subcommandGroups.length > 0 &&
    resolvedSecondArg &&
    isSubcommandBlocked(commandName, resolvedSecondArg)
  ) {
    return {
      blocked: true,
      reason: 'Subcommand này chỉ dùng bằng slash command.',
    };
  }

  return { blocked: false };
}

export function isPrefixRestrictedCommand(command, args, resolveSubcommandAlias) {
  return getPrefixRestriction(command, args, resolveSubcommandAlias).blocked;
}
