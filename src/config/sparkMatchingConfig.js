export const SPARK_MATCHING_CONFIG = Object.freeze({
  feedbackChannelId: '1571930215632867479',
  threadParentChannelId: '1571931107002417386',
  memberRoleId: '1571930353919328276',
  anonymousChatDurationMs: 24 * 60 * 60 * 1000,
  publicThreadDurationMs: 48 * 60 * 60 * 1000,
  profileIntroMaxLength: 1000,
  shortAnswerMaxLength: 600,
  adminRoleIds: ['1541303749916754001', '1545305594712432640'],
  title: '(trangtrig50) **SPARK MATCHING** (trangtrig51)',
  emojis: {
    bang2: '<a:bang2:1546040703375904801>',
  },
});

export const SPARK_STORAGE_KEYS = Object.freeze({
  config: (guildId) => `spark:config:${guildId}`,
  profiles: (guildId) => `spark:profiles:${guildId}`,
  matches: (guildId) => `spark:matches:${guildId}`,
  history: (guildId) => `spark:history:${guildId}`,
  sessions: (guildId) => `spark:sessions:${guildId}`,
});

export function getDefaultSparkGuildConfig() {
  return {
    enabled: false,
    registrationEnabled: false,
    testModeEnabled: false,
    maleReviewChannelId: null,
    femaleReviewChannelId: null,
    feedbackChannelId: SPARK_MATCHING_CONFIG.feedbackChannelId,
    threadParentChannelId: SPARK_MATCHING_CONFIG.threadParentChannelId,
    memberRoleId: SPARK_MATCHING_CONFIG.memberRoleId,
    anonymousChatDurationMs: SPARK_MATCHING_CONFIG.anonymousChatDurationMs,
    publicThreadDurationMs: SPARK_MATCHING_CONFIG.publicThreadDurationMs,
  };
}
