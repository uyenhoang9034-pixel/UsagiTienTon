import { MessageFlags } from 'discord.js';

import { Mutex } from '../../utils/mutex.js';
import { CULTIVATION_CONFIG } from '../../config/cultivationGame.js';
import {
  getCultivationProfile,
  saveCultivationProfile,
} from '../../services/cultivationServiceV2.js';
import {
  getCultivationPetList,
  getOwnedPets,
} from '../../services/cultivationPet.js';
import {
  buildPetCodexEmbed,
  buildPetCodexRows,
  getPetCollectionRewardAmount,
} from '../../services/cultivationPetCodexUI.js';

export default {
  name: 'tutien_pet_collection_reward',

  async execute(interaction, client, args = []) {
    const [ownerId] = args;

    if (!ownerId || interaction.user.id !== ownerId) {
      return interaction.reply({
        content: 'Đây là Bộ Sưu Tập Linh Thú của một đạo hữu khác.',
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

    const lockKey = `cultivation:${interaction.guildId}:${interaction.user.id}`;

    const result = await Mutex.runExclusive(lockKey, async () => {
      const profile = await getCultivationProfile(
        client,
        interaction.guildId,
        interaction.user.id,
      );

      const totalPets = getCultivationPetList().length;
      const ownedPets = getOwnedPets(profile).length;

      if (totalPets <= 0 || ownedPets < totalPets) {
        return { ok: false, reason: 'incomplete', profile, ownedPets, totalPets };
      }

      if (profile.pets?.collectionRewardClaimed === true) {
        return { ok: false, reason: 'claimed', profile, ownedPets, totalPets };
      }

      const reward = getPetCollectionRewardAmount();

      if (!profile.pets || typeof profile.pets !== 'object') {
        profile.pets = { owned: {}, active: null };
      }

      profile.pets.collectionRewardClaimed = true;
      profile.cultivation = Math.max(0, Number(profile.cultivation) || 0) + reward;
      profile.totalCultivation = Math.max(0, Number(profile.totalCultivation) || 0) + reward;

      const saved = await saveCultivationProfile(client, profile);

      return { ok: true, profile: saved, reward };
    });

    if (!result.ok) {
      const content = result.reason === 'claimed'
        ? 'Đạo hữu đã nhận thưởng hoàn thành Bộ Sưu Tập Linh Thú rồi.'
        : `Đạo hữu mới thu phục ${result.ownedPets}/${result.totalPets} Linh Thú, chưa thể nhận thưởng.`;

      return interaction.reply({
        content,
        flags: MessageFlags.Ephemeral,
      });
    }

    return interaction.update({
      embeds: [buildPetCodexEmbed(interaction.user, result.profile)],
      components: buildPetCodexRows(ownerId, result.profile),
    });
  },
};
