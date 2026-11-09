import { SlashCommandBuilder } from 'discord.js';
import { WORD_GUESS_EMOJIS } from '../../config/wordGuessConfig.js';
import {
  buildLeaderboardPayloadV2,
  buildPersonalStreakPayloadV2,
  buildWordGuessNoticePayloadV2,
  getPlayerLeaderboardPosition,
  getWordGuessGuildConfig,
} from '../../services/wordGuessService.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('doantu')
    .setDescription('Trò chơi Đoán Từ Tiếng Việt — xem bảng xếp hạng & chuỗi streak cá nhân!')
    .addSubcommand((sub) =>
      sub
        .setName('bxh')
        .setDescription('Xem Bảng Xếp Hạng Streak Đoán Từ (5 người mỗi trang)')
        .addIntegerOption((opt) =>
          opt
            .setName('trang')
            .setDescription('Số trang muốn xem (mặc định: 1)')
            .setMinValue(1)
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName('streak')
        .setDescription('Xem chuỗi streak cá nhân và kỷ lục đoán từ của bạn')
        .addUserOption((opt) =>
          opt
            .setName('thanhvien')
            .setDescription('Thành viên muốn xem (bỏ trống để xem của bạn)')
            .setRequired(false),
        ),
    ),

  category: 'Games',

  async execute(interaction, _guildConfig, client) {
    const botClient = client || interaction.client;

    try {
      if (!interaction.guildId) {
        return interaction.reply(
          buildWordGuessNoticePayloadV2({
            title: 'CHỈ DÙNG TRONG SERVER',
            message: `${WORD_GUESS_EMOJIS.STREAK} Lệnh Đoán Từ chỉ sử dụng được trong server nha!`,
            ephemeral: !interaction._isPrefixCommand,
          }),
        );
      }

      const subcommand = interaction.options?.getSubcommand?.(false) || 'streak';
      const config = await getWordGuessGuildConfig(botClient, interaction.guildId);

      if (subcommand === 'bxh') {
        const rawPage = interaction.options?.getInteger?.('trang');
        const requestedPageIndex = Number.isInteger(rawPage) && rawPage > 0 ? rawPage - 1 : 0;
        const { entries, rank, stats } = getPlayerLeaderboardPosition(config, interaction.user.id);

        const payload = buildLeaderboardPayloadV2({
          entries,
          page: requestedPageIndex,
          requesterStats: stats,
          requesterRank: rank,
        });

        return interaction.reply(payload);
      }

      // Mặc định: subcommand === 'streak'
      const targetUser = interaction.options?.getUser?.('thanhvien') || interaction.user;
      const { rank, stats, totalPlayers } = getPlayerLeaderboardPosition(config, targetUser.id);

      const payload = buildPersonalStreakPayloadV2({
        userId: targetUser.id,
        stats,
        rank,
        totalPlayers,
        channelId: config.channelId,
      });

      return interaction.reply(payload);
    } catch (error) {
      logger.error('[Command:DoanTu] Lỗi thực thi lệnh /doantu:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction
          .reply(
            buildWordGuessNoticePayloadV2({
              title: 'LỖI XỬ LÝ LỆNH ĐOÁN TỪ',
              message: `${WORD_GUESS_EMOJIS.ADMIN_DISABLE} Có lỗi xảy ra khi xử lý lệnh Đoán Từ. Vui lòng thử lại sau!`,
              ephemeral: !interaction._isPrefixCommand,
            }),
          )
          .catch(() => {});
      }
    }
  },
};
