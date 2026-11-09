import { SlashCommandBuilder } from 'discord.js';
import {
  THAN_VAN_CHANNEL_ID,
  THAN_VAN_EMOJIS,
  isThanVanChannel,
  getVietnamDateString,
  getUserDailyFortune,
  saveUserDailyFortune,
  getRandomFortune,
  buildFortunePayloadV2,
  buildThanVanNoticePayloadV2,
} from '../../services/thanVanTuBanService.js';
import { logger } from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('boc-que')
    .setDescription('Bốc quẻ công sở - Xem vận mệnh đi làm ngày hôm nay')
    .setDMPermission(false),

  async execute(interaction, guildConfig, client) {
    const isEphemeral = !interaction?._isPrefixCommand;

    try {
      if (!isThanVanChannel(interaction)) {
        return interaction.reply(
          buildThanVanNoticePayloadV2({
            title: 'SAI KÊNH SỬ DỤNG',
            message: `Lệnh này chỉ được sử dụng cố định tại kênh Than Vãn Tư Bản (<#${THAN_VAN_CHANNEL_ID}>) thôi nha! Hãy qua đó để xem vận mệnh đi làm hôm nay nhé! ${THAN_VAN_EMOJIS.FLOWER}`,
            ephemeral: isEphemeral,
          }),
        );
      }

      const todayStr = getVietnamDateString();
      const existingFortune = await getUserDailyFortune(
        client,
        interaction.user.id,
        todayStr,
      );

      if (existingFortune) {
        return interaction.reply(
          buildFortunePayloadV2(interaction.user, existingFortune, true),
        );
      }

      const newFortune = getRandomFortune();
      await saveUserDailyFortune(
        client,
        interaction.user.id,
        todayStr,
        newFortune,
      );

      return interaction.reply(
        buildFortunePayloadV2(interaction.user, newFortune, false),
      );
    } catch (error) {
      logger.error('Error executing /boc-que command:', error);
      if (!interaction.replied && !interaction.deferred) {
        await interaction
          .reply(
            buildThanVanNoticePayloadV2({
              title: 'THÔNG BÁO LỖI',
              message:
                'Đã có lỗi xảy ra khi bốc quẻ công sở. Vui lòng thử lại sau!',
              ephemeral: isEphemeral,
            }),
          )
          .catch(() => {});
      }
    }
  },
};
