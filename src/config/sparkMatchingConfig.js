export const SPARK_MATCHING_CONFIG = Object.freeze({
  feedbackChannelId: '1571930215632867479',
  threadParentChannelId: '1571931107002417386',
  memberRoleId: '1571930353919328276',
  anonymousChatDurationMs: 24 * 60 * 60 * 1000,
  publicThreadDurationMs: 48 * 60 * 60 * 1000,
  feedbackTimeoutMs: 24 * 60 * 60 * 1000,
  profileIntroMaxLength: 1000,
  shortAnswerMaxLength: 600,
  adminRoleIds: ['1541303749916754001', '1545305594712432640'],
  title: '<a:trangtrig50:1567818385306165301> **SPARK MATCHING** <a:trangtrig51:1567818549794439229>',
  emojis: {
    bang2: '<a:bang2:1546891483250954290>',
  },
});

export const SPARK_STORAGE_KEYS = Object.freeze({
  config: (guildId) => `spark:config:${guildId}`,
  profiles: (guildId) => `spark:profiles:${guildId}`,
  matches: (guildId) => `spark:matches:${guildId}`,
  history: (guildId) => `spark:history:${guildId}`,
  sessions: (guildId) => `spark:sessions:${guildId}`,
  feedbackCounter: (guildId) => `spark:feedback_counter:${guildId}`,
  feedbackSticky: (guildId) => `spark:feedback_sticky:${guildId}`,
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
    feedbackTimeoutMs: SPARK_MATCHING_CONFIG.feedbackTimeoutMs,
  };
}
