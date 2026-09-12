import { MessageFlags } from 'discord.js';

import { CULTIVATION_CONFIG } from '../../config/cultivationGame.js';
import { getCultivationProfile } from '../../services/cultivationServiceV2.js';
import {
  buildPetCodexEmbed,
  buildPetCodexRows,
} from '../../services/cultivationPetCodexUI.js';

export default {
  name: 'tutien_pet_codex',

  async execute(interaction, client, args = []) {
    const [ownerId] = args;

    if (!ownerId || interaction.user.id !== ownerId) {
      return interaction.reply({
        content: 'Đây là Linh Thú Đồ Giám của một đạo hữu khác.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (
      CULTIVATION_CONFIG.channelId &&
      interaction.channelId !== CULTIVATION_CONFIG.channelId
    ) {
      return interaction.reply({
        content: `Tiên Lộ chỉ mở tại <#${CULTIVATION_CONFIG.channelId}>.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const profile = await getCultivationProfile(
      client,
      interaction.guildId,
      interaction.user.id,
    );

    return interaction.update({
      embeds: [buildPetCodexEmbed(interaction.user, profile)],
      components: buildPetCodexRows(ownerId, profile),
    });
  },
};
