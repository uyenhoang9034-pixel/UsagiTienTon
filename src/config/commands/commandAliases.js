/**
 * Command aliases for Usagi Tiên Tôn.
 *
 * Repo này chỉ giữ Music + Tiên Lộ, nên alias cũ của
 * Economy / Ticket / Moderation / Giveaway / Shop... đã được bỏ.
 */

export const commandAliases = {
  // Music shortcuts
  p: 'play',
  play: 'play',

  q: 'queue',
  queue: 'queue',

  np: 'nowplaying',
  now: 'nowplaying',
  nowplaying: 'nowplaying',

  j: 'join',
  join: 'join',

  m: 'music',
  music: 'music',

  // Tiên Lộ shortcuts
  tt: 'tutien',
  tu: 'tutien',
  tienlo: 'tutien',
  tutien: 'tutien',

  tti: 'tutienitem',
  itemtt: 'tutienitem',
  tutienitem: 'tutienitem',

  ttest: 'tutientest',
  testtt: 'tutientest',
  tutientest: 'tutientest',
};

export const subcommandAliases = {
  // Generic short names used by prefix parser
  l: 'list',
  ls: 'list',
  r: 'remove',
  rm: 'remove',
  del: 'remove',

  // Music subcommands
  p: 'pause',
  pause: 'pause',
  resume: 'resume',
  rsm: 'resume',
  skip: 'skip',
  s: 'skip',
  stop: 'stop',
  leave: 'leave',
  disconnect: 'leave',
  dc: 'leave',
  volume: 'volume',
  vol: 'volume',
  shuffle: 'shuffle',
  shuf: 'shuffle',
  loop: 'loop',
  seek: 'seek',
  clear: 'clear',
  move: 'move',
};

export function resolveCommandAlias(commandName = '') {
  const normalized = String(commandName).trim().toLowerCase();
  return commandAliases[normalized] || commandName;
}

export function resolveSubcommandAlias(subcommandName = '') {
  const normalized = String(subcommandName).trim().toLowerCase();
  return subcommandAliases[normalized] || subcommandName;
}
