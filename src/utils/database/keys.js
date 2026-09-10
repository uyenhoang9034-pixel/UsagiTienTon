/**
 * Database key helpers for Usagi Tiên Tôn.
 *
 * Scope hiện tại của bot mới:
 * - Music
 * - Tiên Lộ / Tu Tiên
 *
 * Một số helper cũ vẫn được giữ dạng compatibility export để các file facade
 * chưa dọn hết không bị lỗi import khi bot khởi động.
 */

const guildKey = (guildId, ...parts) => [
  'guild',
  guildId,
  ...parts,
].filter(Boolean).join(':');

const userKey = (guildId, scope, userId) => guildKey(guildId, scope, userId);

/**
 * =========================================================
 * CURRENT SCOPE · CORE / MUSIC / CULTIVATION
 * =========================================================
 */

export const getGuildConfigKey = (guildId) => guildKey(guildId, 'config');

export const getMusicGuildKey = (guildId) => guildKey(guildId, 'music');
export const getMusicSessionKey = (guildId) => guildKey(guildId, 'music', 'session');
export const getMusicQueueKey = (guildId) => guildKey(guildId, 'music', 'queue');

export const getCultivationProfileKey = (guildId, userId) =>
  `games:cultivation:profile:${guildId}:${userId}`;

export const getCultivationProfilePrefix = (guildId) =>
  `games:cultivation:profile:${guildId}:`;

export const getCultivationAdventureV2SessionKey = (guildId, userId) =>
  `games:cultivation:adventureV2:${guildId}:${userId}`;

export const getCultivationSecretRealmSessionKey = (guildId, userId) =>
  `games:cultivation:secretRealm:${guildId}:${userId}`;

/**
 * =========================================================
 * COMPATIBILITY EXPORTS · OLD MODULES
 * =========================================================
 *
 * Các helper bên dưới không còn là scope chính của Usagi Tiên Tôn.
 * Tạm giữ để tránh lỗi named export trong những facade/script cũ còn sót lại.
 */

export const getGuildBirthdaysKey = (guildId) => guildKey(guildId, 'birthdays');
export const getBirthdayLeftBackupKey = (guildId) => guildKey(guildId, 'birthdays', 'left');
export const getBirthdayTrackingKey = (guildId) => guildKey(guildId, 'birthdays', 'tracking');

export const getTicketKey = (guildId, channelId) => guildKey(guildId, 'ticket', channelId);
export const getTicketCounterKey = (guildId) => guildKey(guildId, 'ticket', 'counter');

export const getInviteTrackingKey = (guildId) => guildKey(guildId, 'invites');
export const getMemberInvitesKey = (guildId, userId) => guildKey(guildId, 'invites', userId);
export const getInviteUsesKey = (guildId, inviteCode) => guildKey(guildId, 'invite_uses', inviteCode);
export const getFakeAccountKey = (guildId, userId) => guildKey(guildId, 'fake_account', userId);

export const getEconomyKey = (guildId, userId) => userKey(guildId, 'economy', userId);
export const getEconomyPrefix = (guildId) => guildKey(guildId, 'economy') + ':';

export const getAFKKey = (guildId, userId) => userKey(guildId, 'afk', userId);
export const getWelcomeConfigKey = (guildId) => guildKey(guildId, 'welcome');

export const getLevelingKey = (guildId) => guildKey(guildId, 'leveling', 'config');
export const getUserLevelKey = (guildId, userId) => guildKey(guildId, 'leveling', 'users', userId);
export const getUserLevelPrefix = (guildId) => guildKey(guildId, 'leveling', 'users') + ':';

export const getApplicationRolesKey = (guildId) => guildKey(guildId, 'applications', 'roles');
export const getApplicationSettingsKey = (guildId) => guildKey(guildId, 'applications', 'settings');
export const getUserApplicationsKey = (guildId, userId) => guildKey(guildId, 'applications', 'users', userId);
export const getApplicationKey = (guildId, applicationId) => guildKey(guildId, 'applications', applicationId);
export const getApplicationsPrefix = (guildId) => guildKey(guildId, 'applications') + ':';

export const getJoinToCreateConfigKey = (guildId) => guildKey(guildId, 'jointocreate');
export const getJoinToCreateChannelsKey = (guildId) => guildKey(guildId, 'jointocreate', 'channels');

export const getWarningsKey = (guildId, userId) => guildKey(guildId, 'warnings', userId);
export const getWarningsPrefix = (guildId) => guildKey(guildId, 'warnings') + ':';
export const getUserNotesKey = (guildId, userId) => guildKey(guildId, 'usernotes', userId);
export const getUserNotesListKey = (guildId) => guildKey(guildId, 'usernotes', 'list');

export const getReactionRoleKey = (guildId, messageId) => guildKey(guildId, 'reaction_roles', messageId);
export const getReactionRolesPrefix = (guildId) => guildKey(guildId, 'reaction_roles') + ':';

export const getServerCountersKey = (guildId) => guildKey(guildId, 'counters');
export const getAutorespondersKey = (guildId) => guildKey(guildId, 'autoresponders');
export const getAutoReactsKey = (guildId) => guildKey(guildId, 'autoreacts');

export const getGiveawayEntryKey = (userId, giveawayId) => `giveaway:${userId}:${giveawayId}`;
export const getGiveawayLockKey = (messageId) => `giveaway:lock:${messageId}`;

/**
 * =========================================================
 * LEGACY KEY NORMALIZATION
 * =========================================================
 *
 * Chỉ giữ những mapping an toàn. Không tự migrate lung tung các hệ cũ vì bot mới
 * không còn chạy Economy/Ticket/Giveaway/Reaction Role nữa.
 */

export const LEGACY_KEY_RESOLVERS = [
  {
    pattern: /^cultivation:profile:([^:]+):([^:]+)$/,
    toCanonical: ([, guildId, userId]) => getCultivationProfileKey(guildId, userId),
  },
  {
    pattern: /^cultivation:adventureV2:([^:]+):([^:]+)$/,
    toCanonical: ([, guildId, userId]) => getCultivationAdventureV2SessionKey(guildId, userId),
  },
];

export function canonicalizeKey(key) {
  if (typeof key !== 'string' || key.length === 0) {
    return key;
  }

  for (const resolver of LEGACY_KEY_RESOLVERS) {
    const match = key.match(resolver.pattern);
    if (match) {
      return resolver.toCanonical(match);
    }
  }

  return key;
}

export function getLegacyVariantsForCanonical(canonicalKey) {
  if (typeof canonicalKey !== 'string' || canonicalKey.length === 0) {
    return [];
  }

  const profileMatch = canonicalKey.match(/^games:cultivation:profile:([^:]+):([^:]+)$/);
  if (profileMatch) {
    return [`cultivation:profile:${profileMatch[1]}:${profileMatch[2]}`];
  }

  const adventureMatch = canonicalKey.match(/^games:cultivation:adventureV2:([^:]+):([^:]+)$/);
  if (adventureMatch) {
    return [`cultivation:adventureV2:${adventureMatch[1]}:${adventureMatch[2]}`];
  }

  return [];
}
