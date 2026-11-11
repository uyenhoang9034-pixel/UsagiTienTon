import { MessageFlags } from 'discord.js';
import {
  HSK_ADMIN_ROLE_ID,
  HSK_DEFAULTS,
  HSK_EMOJIS,
  normalizeStudyTier,
} from '../../config/hskConfig.js';
import {
  buildHskAdminPanelPayloadV2,
  buildHskNoticePayloadV2,
  buildPersonalNotebookPayloadV2,
  detectChannelStudyTier,
  evictUnusedBandCaches,
  getActiveHskArenaRound,
  getHskGuildConfig,
  getHskNow,
  getHskUserProgress,
  getPersonalSession,
  isHskAdmin,
  saveHskGuildConfig,
  searchHskVocabulary,
  setPersonalSession,
  withHskGuildLock,
} from '../../services/hskService.js';
import { logger } from '../../utils/logger.js';

function isPublicOriginMessage(interaction) {
  if (!interaction?.message) return false;
  const rawFlags = Number(interaction.message.flags?.bitfield ?? interaction.message.flags ?? 0);
  return (rawFlags & MessageFlags.Ephemeral) === 0;
}

export default [
  {
    name: 'hsk_modal_search',
    async execute(interaction, client, args = []) {
      const botClient = client || interaction.client;
      try {
        const query = interaction.fields?.getTextInputValue('search_query')?.trim() || '';
        const scopeGuildId = String(interaction.guildId || 'dm');
        const actorId = String(interaction.user.id);
        const nowMs = getHskNow(botClient);
        const prevSession = getPersonalSession(scopeGuildId, actorId, nowMs);

        let studyTier = 'all';
        if (args[1]) {
          studyTier = normalizeStudyTier(args[1]);
        } else if (prevSession?.studyTier) {
          studyTier = normalizeStudyTier(prevSession.studyTier);
        } else if (interaction.guildId && (interaction.channelId || interaction.channel?.id)) {
          const guildCfg = await getHskGuildConfig(botClient, interaction.guildId);
          studyTier = detectChannelStudyTier(guildCfg, interaction.channelId || interaction.channel?.id);
        }

        const results = searchHskVocabulary(query, { maxResults: 3 });
        evictUnusedBandCaches();
        setPersonalSession(scopeGuildId, actorId, {
          studyTier,
          searchQuery: query,
          searchResultIds: results.map((w) => w.id),
        }, nowMs);

        const progress = await getHskUserProgress(botClient, scopeGuildId, actorId);
        const canUpdateOriginal =
          typeof interaction.isFromMessage === 'function' &&
          interaction.isFromMessage() &&
          typeof interaction.update === 'function';

        const ephemeral = canUpdateOriginal ? !isPublicOriginMessage(interaction) : true;
        const payload = buildPersonalNotebookPayloadV2({
          ownerId: actorId,
          progress,
          page: 0,
          searchQuery: query,
          searchResults: results,
          studyTier,
          ephemeral,
          nowMs,
        });

        if (canUpdateOriginal) {
          try {
            await interaction.update(payload);
            return;
          } catch (updateErr) {
            logger.debug('[HskModals] Fallback sang reply Ephemeral:', updateErr?.message);
          }
        }

        await interaction.reply({
          ...payload,
          flags: MessageFlags.Ephemeral | (payload.flags || 0),
        });
      } catch (error) {
        logger.error('[HskModals] Lỗi modal hsk_modal_search:', error);
      }
    },
  },

  {
    name: 'hsk_modal_time',
    async execute(interaction, client) {
      const botClient = client || interaction.client;
      try {
        if (!interaction.guildId) {
          return interaction.reply(
            buildHskNoticePayloadV2({
              title: 'CHỈ DÙNG TRONG SERVER',
              message: `${HSK_EMOJIS.TIME} Cấu hình chỉ áp dụng trong server nha!`,
              ephemeral: true,
            }),
          );
        }

        if (!isHskAdmin(interaction.member, interaction.user.id, interaction.guild, interaction.memberPermissions)) {
          return interaction.reply(
            buildHskNoticePayloadV2({
              title: 'KHÔNG CÓ QUYỀN QUẢN TRỊ',
              message: `${HSK_EMOJIS.ADMIN_DISABLE} Chỉ thành viên có role <@&${HSK_ADMIN_ROLE_ID}> hoặc Admin server mới chỉnh được nha!`,
              ephemeral: true,
            }),
          );
        }

        const rawValue = interaction.fields?.getTextInputValue('duration_seconds')?.trim() || '';
        const seconds = Number.parseInt(rawValue, 10);
        if (
          !/^\d+$/.test(rawValue) ||
          !Number.isInteger(seconds) ||
          seconds < HSK_DEFAULTS.MIN_DURATION_SECONDS ||
          seconds > HSK_DEFAULTS.MAX_DURATION_SECONDS
        ) {
          return interaction.reply(
            buildHskNoticePayloadV2({
              title: 'THỜI GIAN KHÔNG HỢP LỆ',
              message: `${HSK_EMOJIS.TIME} Vui lòng nhập số nguyên từ **${HSK_DEFAULTS.MIN_DURATION_SECONDS}** đến **${HSK_DEFAULTS.MAX_DURATION_SECONDS} giây** nha!`,
              ephemeral: true,
            }),
          );
        }

        const updatedConfig = await withHskGuildLock(interaction.guildId, async () => {
          const cfg = await getHskGuildConfig(botClient, interaction.guildId);
          cfg.durationSeconds = seconds;
          return saveHskGuildConfig(botClient, interaction.guildId, cfg);
        });

        const panelPayload = buildHskAdminPanelPayloadV2(
          updatedConfig,
          getActiveHskArenaRound(interaction.guildId),
          getHskNow(botClient),
        );

        if (typeof interaction.isFromMessage === 'function' && interaction.isFromMessage() && typeof interaction.update === 'function') {
          try {
            await interaction.update(panelPayload);
            return;
          } catch (updateErr) {
            logger.debug('[HskModals] Fallback từ update sang reply Ephemeral:', updateErr?.message);
          }
        }

        await interaction.reply(panelPayload);
      } catch (error) {
        logger.error('[HskModals] Lỗi modal hsk_modal_time:', error);
      }
    },
  },
];

