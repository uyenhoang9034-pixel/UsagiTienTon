import {
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';

import {
  CULTIVATION_CONFIG,
} from '../../config/cultivationGame.js';

const TUTIEN_ADMIN_ROLE_ID =
  '1541303749916754001';

const HEADER =
  '<a:trangtrig2:1546040703375904801> **TIÊN LỘ · GM** <a:trangtrig3:1546040818261954610>';

const ERROR_EMOJI =
  '<a:angryg1:1541441195144773652>';

function hasTutienAdminRole(member) {
  return Boolean(
    member?.roles?.cache?.has(
      TUTIEN_ADMIN_ROLE_ID,
    ),
  );
}

function formatError(message) {
  return `${ERROR_EMOJI} ${message}`;
}

export default {
  data:
    new SlashCommandBuilder()
      .setName('tutientuvi')
      .setDescription('GM: Tăng Tu Vi cho một đạo hữu.')
      .addUserOption(
        (option) =>
          option
            .setName('member')
            .setDescription('Đạo hữu muốn tăng Tu Vi.')
            .setRequired(true),
      )
      .addIntegerOption(
        (option) =>
          option
            .setName('tuvi')
            .setDescription('Số Tu Vi muốn cộng thêm.')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(1000000000),
      ),

  category: 'Games',

  async execute(interaction) {
    try {
      if (!interaction.guildId || !interaction.guild) {
        return interaction.reply({
          content: 'Lệnh này chỉ có thể sử dụng trong server.',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!hasTutienAdminRole(interaction.member)) {
        return interaction.reply({
          content: formatError('Bạn không có quyền tăng Tu Vi.'),
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!interaction.client?.db) {
        return interaction.reply({
          content: formatError('Database chưa sẵn sàng, thử lại sau một chút nhé.'),
          flags: MessageFlags.Ephemeral,
        });
      }

      const targetUser = interaction.options.getUser('member', true);
      const amount = interaction.options.getInteger('tuvi', true);

      if (targetUser.bot) {
        return interaction.reply({
          content: formatError('Không thể tăng Tu Vi cho bot.'),
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.deferReply();

      const {
        getCultivationProfile,
        saveCultivationProfile,
      } = await import('../../services/cultivationService.js');

      const profile = await getCultivationProfile(
        interaction.client,
        interaction.guildId,
        targetUser.id,
      );

      profile.cultivation = Math.max(
        0,
        Number(profile.cultivation) || 0,
      ) + amount;

      profile.totalCultivation = Math.max(
        0,
        Number(profile.totalCultivation) || 0,
      ) + amount;

      const saved = await saveCultivationProfile(
        interaction.client,
        profile,
      );

      const userEmoji =
        CULTIVATION_CONFIG.ui?.emojis?.user ||
        '🐰';

      const cultivationEmoji =
        CULTIVATION_CONFIG.ui?.emojis?.cultivation ||
        '✨';

      return interaction.editReply({
        content: [
          HEADER,
          '',
          `${userEmoji} Đạo Hữu: <@${targetUser.id}>`,
          `${cultivationEmoji} Tu Vi được ban: **+${amount.toLocaleString('vi-VN')}**`,
          `${cultivationEmoji} Tu Vi hiện tại: **${Number(saved.cultivation || 0).toLocaleString('vi-VN')}**`,
        ].join('\n'),
      });
    } catch (error) {
      console.error('[TU TIEN TU VI ERROR]', error);

      const message = formatError(
        `Lệnh tăng Tu Vi bị lỗi: \`${error?.message || 'Unknown error'}\``,
      );

      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ content: message }).catch(() => {});
      }

      return interaction.reply({
        content: message,
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
    }
  },
};
