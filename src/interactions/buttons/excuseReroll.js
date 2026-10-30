import {
  getRandomExcuse,
  buildExcuseEmbed,
  buildExcuseActionRow,
} from '../../services/thanVanTuBanService.js';
import { logger } from '../../utils/logger.js';
import { MessageFlags } from 'discord.js';

export default {
  name: 'excuse_reroll',

  async execute(interaction, client, args) {
    try {
      const styleKey = args?.[0] || 'luon_leo';
      const excuseData = getRandomExcuse(styleKey);
      const embed = buildExcuseEmbed(excuseData);
      const row = buildExcuseActionRow(excuseData.styleKey);

      await interaction.update({
        embeds: [embed],
        components: [row],
      });

      logger.debug(
        `[ExcuseReroll] ${interaction.user.tag} đã random lại lý do xin nghỉ style ${styleKey}`,
      );
    } catch (error) {
      logger.error('Error executing excuse_reroll button:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction
          .reply({
            content: '❌ Đã có lỗi xảy ra khi đổi lý do xin nghỉ phép.',
            flags: MessageFlags.Ephemeral,
          })
          .catch(() => {});
      }
    }
  },
};
