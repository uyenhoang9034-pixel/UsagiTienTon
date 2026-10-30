import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import {
  THAN_VAN_CHANNEL_ID,
  getVietnamDateString,
  getUserDailyFortune,
  saveUserDailyFortune,
  getRandomFortune,
  buildFortuneEmbed,
} from '../../services/thanVanTuBanService.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('boc-que')
    .setDescription('Bốc quẻ công sở - Xem vận mệnh đi làm ngày hôm nay')
    .setDMPermission(false),

  async execute(interaction, guildConfig, client) {
    try {
      const isTargetChannel =
        interaction.channelId === THAN_VAN_CHANNEL_ID ||
        interaction.channel?.parentId === THAN_VAN_CHANNEL_ID;

      if (!isTargetChannel) {
        return interaction.reply({
          content: `❌ Lệnh này chỉ được sử dụng cố định tại kênh Than Vãn Tư Bản (<#${THAN_VAN_CHANNEL_ID}>) thôi nha! Hãy qua đó để xem vận mệnh đi làm hôm nay nhé! 🌸`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const todayStr = getVietnamDateString();
      const existingFortune = await getUserDailyFortune(
        client,
        interaction.user.id,
        todayStr,
      );

      if (existingFortune) {
        const embed = buildFortuneEmbed(
          interaction.user,
          existingFortune,
          true,
        );
        return interaction.reply({
          embeds: [embed],
        });
      }

      const newFortune = getRandomFortune();
      await saveUserDailyFortune(
        client,
        interaction.user.id,
        todayStr,
        newFortune,
      );

      const embed = buildFortuneEmbed(interaction.user, newFortune, false);
      return interaction.reply({
        embeds: [embed],
      });
    } catch (error) {
      logger.error('Error executing /boc-que command:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction
          .reply({
            content:
              '❌ Đã có lỗi xảy ra khi bốc quẻ công sở. Vui lòng thử lại sau!',
            flags: MessageFlags.Ephemeral,
          })
          .catch(() => {});
      }
    }
  },
};
