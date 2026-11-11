import { SlashCommandBuilder } from 'discord.js';
import { HSK_EMOJIS } from '../../config/hskConfig.js';
import {
  buildHskNoticePayloadV2,
  buildPersonalHubPayloadV2,
  buildPersonalNotebookPayloadV2,
  detectChannelStudyTier,
  evictUnusedBandCaches,
  getHskGuildConfig,
  getHskNow,
  getHskUserProgress,
  searchHskVocabulary,
  setPersonalSession,
} from '../../services/hskService.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('hsk')
    .setDescription('Ôn luyện tiếng Trung chuẩn HSK 3.0 cá nhân (Trắc nghiệm, Flashcard SRS, Sổ tay)')
    .addStringOption((opt) =>
      opt
        .setName('tukhoa')
        .setDescription('Tra cứu nhanh từ Hán, Pinyin hoặc nghĩa Việt (bỏ trống để mở Menu chính)')
        .setRequired(false),
    ),

  category: 'Games',

  async execute(interaction, _guildConfig, client) {
    const botClient = client || interaction.client;

    try {
      const scopeGuildId = String(interaction.guildId || 'dm');
      const userId = String(interaction.user.id);
      const isPrefix = Boolean(interaction._isPrefixCommand);
      const ephemeral = !isPrefix;
      const nowMs = getHskNow(botClient);

      let studyTier = 'all';
      if (interaction.guildId && (interaction.channelId || interaction.channel?.id)) {
        const guildCfg = await getHskGuildConfig(botClient, interaction.guildId);
        studyTier = detectChannelStudyTier(guildCfg, interaction.channelId || interaction.channel?.id);
      }

      let query = interaction.options?.getString?.('tukhoa')?.trim() || '';
      if (
        isPrefix &&
        Array.isArray(interaction.options?._hoistedOptions) &&
        interaction.options._hoistedOptions.length > 1
      ) {
        query = interaction.options._hoistedOptions
          .map((opt) => String(opt?.value || '').trim())
          .filter(Boolean)
          .join(' ');
      }

      const progress = await getHskUserProgress(botClient, scopeGuildId, userId);

      if (query) {
        const results = searchHskVocabulary(query, { maxResults: 3 });
        evictUnusedBandCaches();
        setPersonalSession(scopeGuildId, userId, {
          studyTier,
          searchQuery: query,
          searchResultIds: results.map((w) => w.id),
          notebookPage: 0,
        }, nowMs);

        return interaction.reply(
          buildPersonalNotebookPayloadV2({
            ownerId: userId,
            progress,
            page: 0,
            searchQuery: query,
            searchResults: results,
            studyTier,
            ephemeral,
            nowMs,
          }),
        );
      }

      setPersonalSession(scopeGuildId, userId, { studyTier }, nowMs);
      const payload = buildPersonalHubPayloadV2({
        ownerId: userId,
        progress,
        studyTier,
        ephemeral,
        nowMs,
      });

      return interaction.reply(payload);
    } catch (error) {
      logger.error('[Command:HSK] Lỗi thực thi lệnh /hsk:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction
          .reply(
            buildHskNoticePayloadV2({
              title: 'LỖI MỞ ÔN LUYỆN HSK 3.0',
              message: `${HSK_EMOJIS.ADMIN_DISABLE} Có lỗi xảy ra khi mở bảng ôn luyện HSK 3.0. Vui lòng thử lại sau!`,
              ephemeral: !interaction._isPrefixCommand,
            }),
          )
          .catch(() => {});
      }
    }
  },
};
