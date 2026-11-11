import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { HSK_EMOJIS } from '../../config/hskConfig.js';
import {
  buildHskLeaderboardViewPayload,
  buildHskNoticePayloadV2,
  parseHskBxhArgs,
  toHskEditReplyPayload,
} from '../../services/hskService.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('hsk-bxh')
    .setDescription('Xem BXH Streak Đấu trường và Ôn luyện cá nhân HSK 3.0')
    .addStringOption((opt) =>
      opt
        .setName('loai')
        .setDescription('Chọn bảng xếp hạng muốn xem (mặc định: Đấu trường)')
        .addChoices(
          { name: 'Đấu trường HSK (Kênh chung)', value: 'arena' },
          { name: 'Ôn luyện cá nhân (Tự học)', value: 'study' },
        )
        .setRequired(false),
    )
    .addIntegerOption((opt) =>
      opt
        .setName('trang')
        .setDescription('Số trang muốn xem (mặc định: 1)')
        .setMinValue(1)
        .setRequired(false),
    ),

  category: 'Games',

  async execute(interaction, _guildConfig, client) {
    const botClient = client || interaction.client;
    const isPrefix = Boolean(interaction._isPrefixCommand);
    const ephemeral = !isPrefix;

    try {
      if (!interaction.guildId) {
        return interaction.reply(
          buildHskNoticePayloadV2({
            title: 'CHỈ DÙNG TRONG SERVER',
            message: `${HSK_EMOJIS.STREAK} Bảng xếp hạng HSK 3.0 chỉ xem được ở trong server nha!`,
            ephemeral,
          }),
        );
      }

      const rawArgs =
        isPrefix && Array.isArray(interaction.options?._hoistedOptions)
          ? interaction.options._hoistedOptions.map((opt) => opt?.value).filter(Boolean)
          : null;
      const rawType = interaction.options?.getString?.('loai') || null;
      const rawPage = interaction.options?.getInteger?.('trang') ?? null;
      const { board, page } = parseHskBxhArgs({ rawType, rawPage, rawArgs });

      const shouldDeferSlash =
        !isPrefix &&
        board === 'study' &&
        !interaction.replied &&
        !interaction.deferred &&
        typeof interaction.deferReply === 'function' &&
        typeof interaction.editReply === 'function';

      if (shouldDeferSlash) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
      }

      const payload = await buildHskLeaderboardViewPayload(
        botClient,
        interaction.guildId,
        interaction.user.id,
        { board, page, ephemeral },
      );

      if (shouldDeferSlash || interaction.deferred) {
        return interaction.editReply(toHskEditReplyPayload(payload));
      }

      return interaction.reply(payload);
    } catch (error) {
      logger.error('[Command:HskBxh] Lỗi thực thi lệnh /hsk-bxh:', error);
      const errPayload = buildHskNoticePayloadV2({
        title: 'LỖI XEM BẢNG XẾP HẠNG HSK 3.0',
        message: `${HSK_EMOJIS.ADMIN_DISABLE} Có lỗi xảy ra khi tải BXH HSK 3.0. Vui lòng thử lại sau!`,
        ephemeral,
      });
      if (interaction.deferred && !interaction.replied && typeof interaction.editReply === 'function') {
        await interaction.editReply(toHskEditReplyPayload(errPayload)).catch(() => { });
      } else if (!interaction.replied && !interaction.deferred) {
        await interaction.reply(errPayload).catch(() => { });
      }
    }
  },
};
