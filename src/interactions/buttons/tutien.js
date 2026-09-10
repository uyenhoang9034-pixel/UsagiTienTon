import { MessageFlags } from 'discord.js';

import {
  CULTIVATION_CONFIG,
} from '../../config/cultivationGame.js';

import {
  breakthrough,
  cultivate,
  getCultivationLeaderboard,
  getCultivationProfile,
  useCultivationItem,
} from '../../services/cultivationService.js';

import {
  brewCultivationPill,
} from '../../services/cultivationAlchemy.js';

import {
  forgeEquipment,
} from '../../services/cultivationEquipment.js';

import {
  learnCultivationTechnique,
} from '../../services/cultivationTechnique.js';

import {
  activateCultivationTalisman,
} from '../../services/cultivationTreasure.js';

import {
  captureCultivationPet,
} from '../../services/cultivationPet.js';

import {
  buildBackRow,
  buildBreakthroughEmbed,
  buildCultivateEmbed,
  buildDashboardEmbed,
  buildDashboardRows,
  buildInventoryEmbed,
  buildInventoryRows,
  buildLeaderboardEmbed,
  buildProfileEmbed,
  buildUseItemResultEmbed,
  buildUseItemResultRows,
} from '../../services/cultivationUI.js';

import {
  buildAlchemyEmbed,
  buildAlchemyRows,
  buildAlchemyResultEmbed,
  buildAlchemyResultRows,
} from '../../services/cultivationAlchemyUI.js';

import {
  buildEquipmentEmbed,
  buildEquipmentRows,
  buildForgeEmbed,
  buildForgeResultEmbed,
  buildForgeResultRows,
  buildForgeRows,
} from '../../services/cultivationEquipmentUI.js';

import {
  buildTechniqueEmbed,
  buildTechniqueLearnResultEmbed,
  buildTechniqueResultRows,
  buildTechniqueRows,
} from '../../services/cultivationTechniqueUI.js';

import {
  buildTalismanResultEmbed,
  buildTalismanResultRows,
  buildTreasureEmbed,
  buildTreasureRows,
} from '../../services/cultivationTreasureUI.js';

import {
  buildPetCaptureResultEmbed,
  buildPetEmbed,
  buildPetEncounterEmbed,
  buildPetEncounterRows,
  buildPetResultRows,
  buildPetRows,
} from '../../services/cultivationPetUI.js';

/**
 * =========================================================
 * PLAYER CHECK
 * =========================================================
 */

async function rejectWrongPlayer(
  interaction,
  ownerId,
) {
  if (
    interaction.user.id ===
    ownerId
  ) {
    return false;
  }

  await interaction.reply({
    content:
      'Đây là Tiên Lộ của một đạo hữu khác. Dùng `/tutien` để mở hành trình của riêng bạn.',

    flags:
      MessageFlags.Ephemeral,
  });

  return true;
}

/**
 * =========================================================
 * CHANNEL CHECK
 * =========================================================
 */

async function enforceChannel(
  interaction,
) {
  if (
    CULTIVATION_CONFIG
      .channelId &&
    interaction.channelId !==
      CULTIVATION_CONFIG
        .channelId
  ) {
    await interaction.reply({
      content:
        `Tiên Lộ chỉ mở tại <#${CULTIVATION_CONFIG.channelId}>.`,

      flags:
        MessageFlags.Ephemeral,
    });

    return false;
  }

  return true;
}


/**
 * =========================================================
 * BUTTON HANDLER
 * =========================================================
 */

export default {
  name:
    'tutien_action',

  async execute(
    interaction,
    client,
    args = [],
  ) {
    const [
      ownerId,
      action,
      extra,
    ] = args;

    if (
      !ownerId ||
      !action
    ) {
      return;
    }
    /**
 * =====================================================
 * LAZY LOAD · THÁM HIỂM V2.9
 * =====================================================
 *
 * Không static-import Thám Hiểm ở đầu file.
 * Nếu module Thám Hiểm lỗi thì các hệ thống
 * Tu Luyện / Hồ Sơ / Túi Đồ... vẫn hoạt động.
 */

const isAdventureAction =
  action === 'adventure' ||
  action.startsWith(
    'adventure_v2_',
  ) ||
  action.startsWith(
    'secret_realm_',
  );

let adventureService = {};
let adventureUI = {};

if (isAdventureAction) {
  try {
    adventureService =
      await import(
        '../../services/cultivationAdventureV2.js'
      );

    adventureUI =
      await import(
        '../../services/cultivationAdventureV2UI.js'
      );
  } catch (error) {
    const message =
      String(
        error?.stack ||
        error?.message ||
        error ||
        'Unknown import error',
      ).slice(
        0,
        1800,
      );

    console.error(
      '[TU TIEN V2.9 IMPORT ERROR]',
      error,
    );

    return interaction.reply({
      content:
        `❌ **Lỗi tải Thám Hiểm V2.9:**\n\`\`\`js\n${message}\n\`\`\``,
      flags:
        MessageFlags.Ephemeral,
    });
  }
}
const {
  clearAdventureV2Session,
  comprehendAncientTablet,
  disarmAncientChest,
  fightAdventureV2Monster,
  getAdventureV2CombatInfo,
  getAdventureV2Preview,
  inspectAncientChest,
  leaveAncientChest,
  openAncientChest,
  openAncientStoneGate,
  resolveAdventureV2Choice,
  retreatAdventureV2,
  startAdventureV2,
} = adventureService;

const {
  buildAdventureV2AssistEmbed,
  buildAdventureV2AssistRows,
  buildAdventureV2CombatResultEmbed,
  buildAdventureV2ErrorEmbed,
  buildAdventureV2ErrorRows,
  buildAdventureV2LocationEmbed,
  buildAdventureV2LocationRows,
  buildAdventureV2MonsterEmbed,
  buildAdventureV2MonsterRows,
  buildAdventureV2PreviewEmbed,
  buildAdventureV2PreviewRows,
  buildAdventureV2ResultEmbed,
  buildAdventureV2ResultRows,
  buildAdventureV2RetreatEmbed,
  buildAdventureV2RetreatRows,

  buildAncientChestEmbed,
  buildAncientChestInspectEmbed,
  buildAncientChestInspectRows,
  buildAncientChestLeaveEmbed,
  buildAncientChestResultEmbed,
  buildAncientChestRows,

  buildAncientGateEmbed,
  buildAncientGateFailedEmbed,
  buildAncientGateRows,

  buildAncientTabletEmbed,
  buildAncientTabletRows,

  buildChestDisarmEmbed,
  buildChestDisarmRows,
} = adventureUI;
const adventureError = () =>
  interaction.update({
    embeds: [
      buildAdventureV2ErrorEmbed(),
    ],

    components:
      buildAdventureV2ErrorRows(
        ownerId,
      ),
  });
    /**
     * =====================================================
     * OWNER
     * =====================================================
     */

    if (
      await rejectWrongPlayer(
        interaction,
        ownerId,
      )
    ) {
      return;
    }

    /**
     * =====================================================
     * CHANNEL
     * =====================================================
     */

    if (
      !(await enforceChannel(
        interaction,
      ))
    ) {
      return;
    }

    const guildId =
      interaction.guildId;

    const userId =
      interaction.user.id;

    /**
     * =====================================================
     * DASHBOARD
     * =====================================================
     */

    if (
      action ===
      'dashboard'
    ) {
      const profile =
        await getCultivationProfile(
          client,
          guildId,
          userId,
        );

      return interaction.update({
        embeds: [
          buildDashboardEmbed(
            interaction.user,
            profile,
          ),
        ],

        components:
          buildDashboardRows(
            ownerId,
          ),
      });
    }

    /**
     * =====================================================
     * TU LUYỆN
     * =====================================================
     */

    if (
      action ===
      'cultivate'
    ) {
      const result =
        await cultivate(
          client,
          guildId,
          userId,
        );

      return interaction.update({
        embeds: [
          buildCultivateEmbed(
            result,
          ),
        ],

        components: [
          buildBackRow(
            ownerId,
            'cultivate',
          ),
        ],
      });
    }

    /**
     * =====================================================
     * ĐỘT PHÁ
     * =====================================================
     */

    if (
      action ===
      'breakthrough'
    ) {
      const result =
        await breakthrough(
          client,
          guildId,
          userId,
        );

      return interaction.update({
        embeds: [
          buildBreakthroughEmbed(
            result,
          ),
        ],

        components: [
          buildBackRow(
            ownerId,
            'breakthrough',
          ),
        ],
      });
    }

    /**
     * =====================================================
     * THÁM HIỂM · V2.9
     * =====================================================
     */

   if (
  action ===
  'adventure'
) {
  try {
    const result =
      await getAdventureV2Preview(
        client,
        guildId,
        userId,
      );

    const embed =
      buildAdventureV2PreviewEmbed(
        interaction.user,
        result,
      );

    const components =
      buildAdventureV2PreviewRows(
        ownerId,
        result.ok,
      );

    return await interaction.update({
      embeds: [
        embed,
      ],

      components,
    });
  } catch (error) {
    const message =
      String(
        error?.stack ||
        error?.message ||
        error ||
        'Unknown error',
      ).slice(
        0,
        1800,
      );

    console.error(
      '[TU TIEN ADVENTURE ERROR]',
      error,
    );

    if (
      interaction.replied ||
      interaction.deferred
    ) {
      return interaction.followUp({
        content:
          `❌ **Lỗi Thám Hiểm thật:**\n\`\`\`js\n${message}\n\`\`\``,
        flags:
          MessageFlags.Ephemeral,
      });
    }

    return interaction.reply({
      content:
        `❌ **Lỗi Thám Hiểm thật:**\n\`\`\`js\n${message}\n\`\`\``,
      flags:
        MessageFlags.Ephemeral,
    });
  }
}

    /**
     * =====================================================
     * THÁM HIỂM · BẮT ĐẦU
     * =====================================================
     */

    if (
      action ===
      'adventure_v2_start'
    ) {
      const result =
        await startAdventureV2(
          client,
          guildId,
          userId,
        );

      if (!result.ok) {
        const preview =
          await getAdventureV2Preview(
            client,
            guildId,
            userId,
          );

        return interaction.update({
          embeds: [
            buildAdventureV2PreviewEmbed(
              interaction.user,
              preview,
            ),
          ],

          components:
            buildAdventureV2PreviewRows(
              ownerId,
              false,
            ),
        });
      }

      return interaction.update({
        embeds: [
          buildAdventureV2LocationEmbed(
            result.location,
          ),
        ],

        components:
          buildAdventureV2LocationRows(
            ownerId,
            result.location,
          ),
      });
    }

       /**
     * =====================================================
     * THÁM HIỂM · CHỌN HƯỚNG
     * =====================================================
     */

    if (
      action ===
      'adventure_v2_choice'
    ) {
      if (!extra) {
        return adventureError();
      }

      const result =
        await resolveAdventureV2Choice(
          client,
          guildId,
          userId,
          extra,
        );

      if (!result.ok) {
        return adventureError();
      }
/**
 * ===============================================
 * V2.9.5 · LINH THÚ CHƯA LỘ DIỆN
 * ===============================================
 */

if (
  result.type ===
  'pet_encounter_unknown'
) {
  const {
    buildAdventurePetUnknownEmbed,
    buildAdventurePetUnknownRows,
  } = await import(
    '../../services/cultivationAdventureV295UI.js'
  );

  return interaction.update({
    embeds: [
      buildAdventurePetUnknownEmbed(),
    ],

    components:
      buildAdventurePetUnknownRows(
        ownerId,
      ),
  });
}

/**
 * ===============================================
 * V2.9.5 · PHÁP KHÍ CỘNG MINH
 * ===============================================
 */

if (
  result.type ===
  'equipment_resonance'
) {
  const {
    buildEquipmentResonanceEmbed,
    buildAdventureV295BackRows,
  } = await import(
    '../../services/cultivationAdventureV295UI.js'
  );

  return interaction.update({
    embeds: [
      buildEquipmentResonanceEmbed(
        result,
      ),
    ],

    components:
      buildAdventureV295BackRows(
        ownerId,
      ),
  });
}

/**
 * ===============================================
 * V2.9.5 · CÔNG PHÁP CỘNG MINH
 * ===============================================
 */

if (
  result.type ===
  'technique_resonance'
) {
  const {
    buildTechniqueResonanceEmbed,
    buildAdventureV295BackRows,
  } = await import(
    '../../services/cultivationAdventureV295UI.js'
  );

  return interaction.update({
    embeds: [
      buildTechniqueResonanceEmbed(
        result,
      ),
    ],

    components:
      buildAdventureV295BackRows(
        ownerId,
      ),
  });
}
      /**
       * ===============================================
       * V2.9.4 · THƯƠNG NHÂN THẦN BÍ
       * ===============================================
       */

      if (
        result.type ===
        'merchant'
      ) {
        const {
          buildAdventureMerchantEmbed,
          buildAdventureMerchantRows,
        } = await import(
          '../../services/cultivationAdventureV294UI.js'
        );

        return interaction.update({
          embeds: [
            buildAdventureMerchantEmbed(
              result,
            ),
          ],

          components:
            buildAdventureMerchantRows(
              ownerId,
              result.stock,
            ),
        });
      }

      /**
       * ===============================================
       * V2.9.4 · THIÊN ĐẠO CƠ DUYÊN
       * ===============================================
       */

      if (
        result.type ===
        'heavenly_fortune'
      ) {
        const {
          buildHeavenlyFortuneEmbed,
          buildAdventureV294BackRows,
        } = await import(
          '../../services/cultivationAdventureV294UI.js'
        );

        return interaction.update({
          embeds: [
            buildHeavenlyFortuneEmbed(
              result,
            ),
          ],

          components:
            buildAdventureV294BackRows(
              ownerId,
            ),
        });
      }

      /**
       * ===============================================
       * LINH THÚ HIỆN THẾ
       * ===============================================
       */

      if (
        result.type ===
          'pet_encounter' &&
        result.petEncounter
      ) {
        return interaction.update({
          embeds: [
            buildPetEncounterEmbed(
              result.petEncounter,
            ),
          ],

          components:
            buildPetEncounterRows(
              ownerId,
              result.petEncounter,
            ),
        });
      }

      /**
       * ===============================================
       * BIA ĐÁ / CỔ VĂN
       * ===============================================
       */

      if (
        result.type ===
        'stone_tablet'
      ) {
        return interaction.update({
          embeds: [
            buildAncientTabletEmbed(),
          ],

          components:
            buildAncientTabletRows(
              ownerId,
            ),
        });
      }

      /**
       * ===============================================
       * CỔNG ĐÁ
       * ===============================================
       */

      if (
        result.type ===
        'stone_gate'
      ) {
        return interaction.update({
          embeds: [
            buildAncientGateEmbed(),
          ],

          components:
            buildAncientGateRows(
              ownerId,
            ),
        });
      }

      /**
       * ===============================================
       * V2.9.3 · BÍ CẢNH HIỆN THẾ
       * ===============================================
       */

      if (
        result.type ===
          'secret_realm' &&
        result.secretRealm
      ) {
        const {
          buildSecretRealmDiscoverEmbed,
          buildSecretRealmDiscoverRows,
        } = await import(
          '../../services/cultivationSecretRealmUI.js'
        );

        return interaction.update({
          embeds: [
            buildSecretRealmDiscoverEmbed(
              result.secretRealm,
            ),
          ],

          components:
            buildSecretRealmDiscoverRows(
              ownerId,
              result.secretRealm.id,
            ),
        });
      }

      /**
       * ===============================================
       * YÊU THÚ
       * ===============================================
       */

      if (
        result.type ===
        'monster'
      ) {
        return interaction.update({
          embeds: [
            buildAdventureV2MonsterEmbed(
              result,
            ),
          ],

          components:
            buildAdventureV2MonsterRows(
              ownerId,
            ),
        });
      }

      /**
       * ===============================================
       * KẾT QUẢ THƯỜNG
       * ===============================================
       */

      return interaction.update({
        embeds: [
          buildAdventureV2ResultEmbed(
            result,
          ),
        ],

        components:
          buildAdventureV2ResultRows(
            ownerId,
          ),
      });
    }

    /**
     * =====================================================
     * V2.9.4 · THƯƠNG NHÂN · MUA
     * =====================================================
     */

    if (
      action ===
      'adventure_v2_merchant_buy'
    ) {
      if (!extra) {
        return adventureError();
      }

      const {
        buyAdventureMerchantItem,
      } = await import(
        '../../services/cultivationAdventureV294.js'
      );

      const {
        buildAdventureMerchantPurchaseEmbed,
        buildAdventureMerchantInsufficientEmbed,
        buildAdventureMerchantRows,
        buildAdventureV294BackRows,
      } = await import(
        '../../services/cultivationAdventureV294UI.js'
      );

      const result =
        await buyAdventureMerchantItem(
          client,
          guildId,
          userId,
          extra,
        );

      /**
       * Không đủ Linh Thạch:
       * giữ nguyên session thương nhân
       * để người chơi có thể chọn món khác.
       */
      if (
        !result.ok &&
        result.reason ===
          'not_enough_stones'
      ) {
        return interaction.update({
          embeds: [
            buildAdventureMerchantInsufficientEmbed(
              result,
            ),
          ],

          components:
            buildAdventureMerchantRows(
              ownerId,
              result.stock,
            ),
        });
      }

      if (!result.ok) {
        return adventureError();
      }

      return interaction.update({
        embeds: [
          buildAdventureMerchantPurchaseEmbed(
            result,
          ),
        ],

        components:
          buildAdventureV294BackRows(
            ownerId,
          ),
      });
    }

    /**
     * =====================================================
     * V2.9.4 · THƯƠNG NHÂN · RỜI ĐI
     * =====================================================
     */

    if (
      action ===
      'adventure_v2_merchant_leave'
    ) {
      const {
        leaveAdventureMerchant,
      } = await import(
        '../../services/cultivationAdventureV294.js'
      );

      const {
        buildAdventureMerchantLeaveEmbed,
        buildAdventureV294BackRows,
      } = await import(
        '../../services/cultivationAdventureV294UI.js'
      );

      const result =
        await leaveAdventureMerchant(
          client,
          guildId,
          userId,
        );

      if (!result.ok) {
        return adventureError();
      }

      return interaction.update({
        embeds: [
          buildAdventureMerchantLeaveEmbed(),
        ],

        components:
          buildAdventureV294BackRows(
            ownerId,
          ),
      });
    }

    /**
 * =====================================================
 * V2.9.5 · LINH THÚ · REVEAL
 * =====================================================
 */

if (
  action ===
  'adventure_v2_pet_reveal'
) {
  const {
    revealAdventurePet,
  } = await import(
    '../../services/cultivationAdventureV295.js'
  );

  const {
    buildAdventurePetRevealEmbed,
    buildAdventurePetRevealRows,
  } = await import(
    '../../services/cultivationAdventureV295UI.js'
  );

  const result =
    await revealAdventurePet(
      client,
      guildId,
      userId,
    );

  if (!result.ok) {
    return adventureError();
  }

  return interaction.update({
    embeds: [
      buildAdventurePetRevealEmbed(
        result,
      ),
    ],

    components:
      buildAdventurePetRevealRows(
        ownerId,
        result.pet,
      ),
  });
}
    /**
 * =====================================================
 * V2.9.5 · LINH THÚ · BỎ QUA
 * =====================================================
 */

if (
  action ===
  'adventure_v2_pet_leave'
) {
  const {
    leaveAdventurePetEncounter,
  } = await import(
    '../../services/cultivationAdventureV295.js'
  );

  const {
    buildAdventurePetLeaveEmbed,
    buildAdventureV295BackRows,
  } = await import(
    '../../services/cultivationAdventureV295UI.js'
  );

  const result =
    await leaveAdventurePetEncounter(
      client,
      guildId,
      userId,
    );

  if (!result.ok) {
    return adventureError();
  }

  return interaction.update({
    embeds: [
      buildAdventurePetLeaveEmbed(),
    ],

    components:
      buildAdventureV295BackRows(
        ownerId,
      ),
  });
}
    /**
 * =====================================================
 * V2.9.5 · LINH THÚ · THU PHỤC
 * =====================================================
 */

if (
  action ===
  'adventure_v2_pet_capture'
) {
  if (!extra) {
    return adventureError();
  }

  /**
   * Capture service hiện tại giữ Mutex riêng,
   * vì handler này không nằm trong
   * resolveAdventureV2Choice lock nên dùng an toàn.
   */
  const captureResult =
    await captureCultivationPet(
      client,
      guildId,
      userId,
      extra,
    );

  const {
    finishAdventurePetEncounter,
  } = await import(
    '../../services/cultivationAdventureV295.js'
  );

  /**
   * Dù thành công hay thất bại,
   * encounter đã kết thúc.
   */
  await finishAdventurePetEncounter(
    client,
    guildId,
    userId,
  );

  return interaction.update({
    embeds: [
      buildPetCaptureResultEmbed(
        captureResult,
      ),
    ],

    components:
      buildPetResultRows(
        ownerId,
      ),
  });
}
    /**
     * =====================================================
     * THÁM HIỂM · LINH THÚ TRỢ CHIẾN
     * =====================================================
     */

    if (
      action ===
      'adventure_v2_assist'
    ) {
      const result =
        await getAdventureV2CombatInfo(
          client,
          guildId,
          userId,
          {
            petAssist: true,
          },
        );

      if (!result.ok) {
       return adventureError();
      }

      return interaction.update({
        embeds: [
          buildAdventureV2AssistEmbed(
            result,
          ),
        ],

        components:
          buildAdventureV2AssistRows(
            ownerId,
            Boolean(
              result.pet,
            ),
          ),
      });
    }

    /**
     * =====================================================
     * THÁM HIỂM · GIAO CHIẾN
     * =====================================================
     */

    if (
      action ===
      'adventure_v2_fight'
    ) {
      const result =
        await fightAdventureV2Monster(
          client,
          guildId,
          userId,
          {
            petAssist: false,
          },
        );

      if (!result.ok) {
       return adventureError();
      }

      return interaction.update({
        embeds: [
          buildAdventureV2CombatResultEmbed(
            result,
          ),
        ],

        components:
          buildAdventureV2ResultRows(
            ownerId,
          ),
      });
    }

    /**
     * =====================================================
     * THÁM HIỂM · TRỢ CHIẾN + GIAO CHIẾN
     * =====================================================
     */

    if (
      action ===
      'adventure_v2_fight_assist'
    ) {
      const result =
        await fightAdventureV2Monster(
          client,
          guildId,
          userId,
          {
            petAssist: true,
          },
        );

      if (!result.ok) {
        return adventureError();
      }

      return interaction.update({
        embeds: [
          buildAdventureV2CombatResultEmbed(
            result,
          ),
        ],

        components:
          buildAdventureV2ResultRows(
            ownerId,
          ),
      });
    }

    /**
     * =====================================================
     * THÁM HIỂM · RÚT LUI
     * =====================================================
     */

    if (
      action ===
      'adventure_v2_retreat'
    ) {
      const result =
        await retreatAdventureV2(
          client,
          guildId,
          userId,
        );

      if (!result.ok) {
        return adventureError();
      }

      return interaction.update({
        embeds: [
          buildAdventureV2RetreatEmbed(
            result,
          ),
        ],

        components:
          buildAdventureV2RetreatRows(
            ownerId,
            result.success,
          ),
      });
    }

    /**
     * =====================================================
     * V2.9.2 · THAM NGỘ CỔ VĂN
     * =====================================================
     */

    if (
      action ===
      'adventure_v2_comprehend'
    ) {
      const result =
        await comprehendAncientTablet(
          client,
          guildId,
          userId,
        );

      if (!result.ok) {
      return adventureError();
      }

      return interaction.update({
        embeds: [
          buildAdventureV2ResultEmbed(
            result,
          ),
        ],

        components:
          buildAdventureV2ResultRows(
            ownerId,
          ),
      });
    }

    /**
     * =====================================================
     * V2.9.2 · PHÁ GIẢI CỔNG ĐÁ
     * =====================================================
     */

    if (
      action ===
      'adventure_v2_gate_open'
    ) {
      const result =
        await openAncientStoneGate(
          client,
          guildId,
          userId,
        );

      if (!result.ok) {
        return adventureError();
      }

      if (
        result.type ===
        'monster'
      ) {
        return interaction.update({
          embeds: [
            buildAdventureV2MonsterEmbed(
              result,
            ),
          ],

          components:
            buildAdventureV2MonsterRows(
              ownerId,
            ),
        });
      }

      if (
        result.type ===
        'gate_failed'
      ) {
        return interaction.update({
          embeds: [
            buildAncientGateFailedEmbed(
              result,
            ),
          ],

          components:
            buildAdventureV2ResultRows(
              ownerId,
            ),
        });
      }

      if (
        result.type ===
        'ancient_chest'
      ) {
        return interaction.update({
          embeds: [
            buildAncientChestEmbed(),
          ],

          components:
            buildAncientChestRows(
              ownerId,
            ),
        });
      }

     return adventureError();
    }

    /**
     * =====================================================
     * V2.9.2 · KIỂM TRA RƯƠNG
     * =====================================================
     */

    if (
      action ===
      'adventure_v2_chest_inspect'
    ) {
      const result =
        await inspectAncientChest(
          client,
          guildId,
          userId,
        );

      if (!result.ok) {
        return adventureError();
      }

      return interaction.update({
        embeds: [
          buildAncientChestInspectEmbed(
            result,
          ),
        ],

        components:
          buildAncientChestInspectRows(
            ownerId,
            result.trapped,
          ),
      });
    }

    /**
     * =====================================================
     * V2.9.2 · PHÁ GIẢI CẤM CHẾ RƯƠNG
     * =====================================================
     */

    if (
      action ===
      'adventure_v2_chest_disarm'
    ) {
      const result =
        await disarmAncientChest(
          client,
          guildId,
          userId,
        );

      if (!result.ok) {
       return adventureError();
      }

      return interaction.update({
        embeds: [
          buildChestDisarmEmbed(
            result,
          ),
        ],

        components:
          buildChestDisarmRows(
            ownerId,
            result.success,
          ),
      });
    }

    /**
     * =====================================================
     * V2.9.2 · MỞ RƯƠNG
     * =====================================================
     */

    if (
      action ===
      'adventure_v2_chest_open'
    ) {
      const result =
        await openAncientChest(
          client,
          guildId,
          userId,
        );

      if (!result.ok) {
       return adventureError();
      }

      return interaction.update({
        embeds: [
          buildAncientChestResultEmbed(
            result,
          ),
        ],

        components:
          buildAdventureV2ResultRows(
            ownerId,
          ),
      });
    }

    /**
     * =====================================================
     * V2.9.2 · BỎ QUA RƯƠNG
     * =====================================================
     */

    if (
      action ===
      'adventure_v2_chest_leave'
    ) {
      const result =
        await leaveAncientChest(
          client,
          guildId,
          userId,
        );

      if (!result.ok) {
       return adventureError();
      }

      return interaction.update({
        embeds: [
          buildAncientChestLeaveEmbed(),
        ],

        components:
          buildAdventureV2ResultRows(
            ownerId,
          ),
      });
    }

    /**
     * =====================================================
     * V2.9.3 · TIẾN VÀO BÍ CẢNH
     * =====================================================
     */

    if (
  action ===
  'secret_realm_enter'
) {
  const {
    startSecretRealm,
    enterSecretRealmFloor,
  } = await import(
    '../../services/cultivationSecretRealm.js'
  );

  const {
    buildSecretRealmFloorEmbed,
    buildSecretRealmFloorRows,
  } = await import(
    '../../services/cultivationSecretRealmUI.js'
  );

  if (!extra) {
       return adventureError();
      }

      const started =
        await startSecretRealm(
          client,
          guildId,
          userId,
          extra,
        );

      if (!started.ok) {
       return adventureError();
      }

      /**
       * Chuyển từ session Thám Hiểm
       * sang session Bí Cảnh.
       */
      await clearAdventureV2Session(
        client,
        guildId,
        userId,
      );

      const result =
        await enterSecretRealmFloor(
          client,
          guildId,
          userId,
        );

      if (!result.ok) {
      return adventureError();
      }

      return interaction.update({
        embeds: [
          buildSecretRealmFloorEmbed(
            result,
          ),
        ],

        components:
          buildSecretRealmFloorRows(
            ownerId,
          ),
      });
    }

    /**
     * =====================================================
     * V2.9.3 · LINH THÚ TRỢ CHIẾN
     * =====================================================
     */

   if (
  action ===
  'secret_realm_assist'
) {
  const {
    getSecretRealmCombatInfo,
  } = await import(
    '../../services/cultivationSecretRealm.js'
  );

  const {
    buildSecretRealmAssistEmbed,
    buildSecretRealmAssistRows,
  } = await import(
    '../../services/cultivationSecretRealmUI.js'
  );

  const result =
        await getSecretRealmCombatInfo(
          client,
          guildId,
          userId,
          {
            petAssist: true,
          },
        );

      if (!result.ok) {
       return adventureError();
      }

      return interaction.update({
        embeds: [
          buildSecretRealmAssistEmbed(
            result,
          ),
        ],

        components:
          buildSecretRealmAssistRows(
            ownerId,
            Boolean(
              result.pet,
            ),
          ),
      });
    }

    /**
     * =====================================================
     * V2.9.3 · GIAO CHIẾN
     * =====================================================
     */

   if (
  action ===
  'secret_realm_fight'
) {
  const {
    fightSecretRealmMonster,
  } = await import(
    '../../services/cultivationSecretRealm.js'
  );

  const {
    buildSecretRealmFailEmbed,
    buildSecretRealmBackRows,
    buildSecretRealmWinEmbed,
    buildSecretRealmWinRows,
  } = await import(
    '../../services/cultivationSecretRealmUI.js'
  );

  const result =
    await fightSecretRealmMonster(
          client,
          guildId,
          userId,
          {
            petAssist: false,
          },
        );

      if (!result.ok) {
        return adventureError();
      }

      if (!result.success) {
        return interaction.update({
          embeds: [
            buildSecretRealmFailEmbed(
              result,
            ),
          ],

          components:
            buildSecretRealmBackRows(
              ownerId,
            ),
        });
      }

      return interaction.update({
        embeds: [
          buildSecretRealmWinEmbed(
            result,
          ),
        ],

        components:
          buildSecretRealmWinRows(
            ownerId,
            result.completed,
          ),
      });
    }

    /**
     * =====================================================
     * V2.9.3 · TRỢ CHIẾN + GIAO CHIẾN
     * =====================================================
     */

  if (
  action ===
  'secret_realm_fight_assist'
) {
  const {
    fightSecretRealmMonster,
  } = await import(
    '../../services/cultivationSecretRealm.js'
  );

  const {
    buildSecretRealmFailEmbed,
    buildSecretRealmBackRows,
    buildSecretRealmWinEmbed,
    buildSecretRealmWinRows,
  } = await import(
    '../../services/cultivationSecretRealmUI.js'
  );

  const result =
    await fightSecretRealmMonster(
          client,
          guildId,
          userId,
          {
            petAssist: true,
          },
        );

      if (!result.ok) {
       return adventureError();
      }

      if (!result.success) {
        return interaction.update({
          embeds: [
            buildSecretRealmFailEmbed(
              result,
            ),
          ],

          components:
            buildSecretRealmBackRows(
              ownerId,
            ),
        });
      }

      return interaction.update({
        embeds: [
          buildSecretRealmWinEmbed(
            result,
          ),
        ],

        components:
          buildSecretRealmWinRows(
            ownerId,
            result.completed,
          ),
      });
    }

    /**
     * =====================================================
     * V2.9.3 · ĐI TẦNG TIẾP
     * =====================================================
     */

   if (
  action ===
  'secret_realm_continue'
) {
  const {
    continueSecretRealm,
    enterSecretRealmFloor,
  } = await import(
    '../../services/cultivationSecretRealm.js'
  );

  const {
    buildSecretRealmFloorEmbed,
    buildSecretRealmFloorRows,
  } = await import(
    '../../services/cultivationSecretRealmUI.js'
  );

  const continued =
        await continueSecretRealm(
          client,
          guildId,
          userId,
        );

      if (!continued.ok) {
       return adventureError();
      }

      const result =
        await enterSecretRealmFloor(
          client,
          guildId,
          userId,
        );

      if (!result.ok) {
    return adventureError();
      }

      return interaction.update({
        embeds: [
          buildSecretRealmFloorEmbed(
            result,
          ),
        ],

        components:
          buildSecretRealmFloorRows(
            ownerId,
          ),
      });
    }

    /**
     * =====================================================
     * V2.9.3 · RỜI BÍ CẢNH
     * =====================================================
     */

   if (
  action ===
  'secret_realm_leave'
) {
  const {
    leaveSecretRealm,
  } = await import(
    '../../services/cultivationSecretRealm.js'
  );

  const {
    buildSecretRealmExitEmbed,
    buildSecretRealmBackRows,
  } = await import(
    '../../services/cultivationSecretRealmUI.js'
  );

  const result =
        await leaveSecretRealm(
          client,
          guildId,
          userId,
        );

      if (!result.ok) {
      return adventureError();
      }

      return interaction.update({
        embeds: [
          buildSecretRealmExitEmbed(
            result,
          ),
        ],

        components:
          buildSecretRealmBackRows(
            ownerId,
          ),
      });
    }

    /**
     * =====================================================
     * TÚI ĐỒ
     * =====================================================
     */

    if (
      action ===
      'inventory'
    ) {
      const profile =
        await getCultivationProfile(
          client,
          guildId,
          userId,
        );

      return interaction.update({
        embeds: [
          buildInventoryEmbed(
            interaction.user,
            profile,
          ),
        ],

        components:
          buildInventoryRows(
            ownerId,
            profile,
          ),
      });
    }

    /**
     * =====================================================
     * SỬ DỤNG VẬT PHẨM
     * =====================================================
     */

    if (
      action ===
      'use_item'
    ) {
      if (!extra) {
        return interaction.reply({
          content:
            'Không xác định được vật phẩm cần sử dụng.',

          flags:
            MessageFlags.Ephemeral,
        });
      }

      const result =
        await useCultivationItem(
          client,
          guildId,
          userId,
          extra,
        );

      return interaction.update({
        embeds: [
          buildUseItemResultEmbed(
            result,
          ),
        ],

        components:
          buildUseItemResultRows(
            ownerId,
          ),
      });
    }

    /**
     * =====================================================
     * LUYỆN ĐAN
     * =====================================================
     */

    if (
      action ===
      'alchemy'
    ) {
      const profile =
        await getCultivationProfile(
          client,
          guildId,
          userId,
        );

      return interaction.update({
        embeds: [
          buildAlchemyEmbed(
            interaction.user,
            profile,
          ),
        ],

        components:
          buildAlchemyRows(
            ownerId,
            profile,
          ),
      });
    }

    /**
     * =====================================================
     * LUYỆN ĐAN · MAKE
     * =====================================================
     */

    if (
      action ===
      'alchemy_make'
    ) {
      if (!extra) {
        return interaction.reply({
          content:
            'Không xác định được Đan Phương cần luyện.',

          flags:
            MessageFlags.Ephemeral,
        });
      }

      const result =
        await brewCultivationPill(
          client,
          guildId,
          userId,
          extra,
        );

      return interaction.update({
        embeds: [
          buildAlchemyResultEmbed(
            result,
          ),
        ],

        components:
          buildAlchemyResultRows(
            ownerId,
          ),
      });
    }

    /**
     * =====================================================
     * LUYỆN KHÍ
     * =====================================================
     */

    if (
      action ===
      'forge'
    ) {
      const profile =
        await getCultivationProfile(
          client,
          guildId,
          userId,
        );

      return interaction.update({
        embeds: [
          buildForgeEmbed(
            interaction.user,
            profile,
          ),
        ],

        components:
          buildForgeRows(
            ownerId,
          ),
      });
    }

    /**
     * =====================================================
     * LUYỆN KHÍ · MAKE
     * =====================================================
     */

    if (
      action ===
      'forge_make'
    ) {
      if (!extra) {
        return interaction.reply({
          content:
            'Không xác định được Pháp Khí cần luyện.',

          flags:
            MessageFlags.Ephemeral,
        });
      }

      const result =
        await forgeEquipment(
          client,
          guildId,
          userId,
          extra,
        );

      return interaction.update({
        embeds: [
          buildForgeResultEmbed(
            result,
          ),
        ],

        components:
          buildForgeResultRows(
            ownerId,
          ),
      });
    }

    /**
     * =====================================================
     * PHÁP KHÍ
     * =====================================================
     */

    if (
      action ===
      'equipment'
    ) {
      const profile =
        await getCultivationProfile(
          client,
          guildId,
          userId,
        );

      return interaction.update({
        embeds: [
          buildEquipmentEmbed(
            interaction.user,
            profile,
          ),
        ],

        components:
          buildEquipmentRows(
            ownerId,
            profile,
          ),
      });
    }

    /**
     * =====================================================
     * CÔNG PHÁP
     * =====================================================
     */

    if (
      action ===
      'technique'
    ) {
      const profile =
        await getCultivationProfile(
          client,
          guildId,
          userId,
        );

      return interaction.update({
        embeds: [
          buildTechniqueEmbed(
            interaction.user,
            profile,
          ),
        ],

        components:
          buildTechniqueRows(
            ownerId,
            profile,
          ),
      });
    }

    /**
     * =====================================================
     * LĨNH NGỘ CÔNG PHÁP
     * =====================================================
     */

    if (
      action ===
      'technique_learn'
    ) {
      if (!extra) {
        return interaction.reply({
          content:
            'Không xác định được Công Pháp cần lĩnh ngộ.',

          flags:
            MessageFlags.Ephemeral,
        });
      }

      const result =
        await learnCultivationTechnique(
          client,
          guildId,
          userId,
          extra,
        );

      return interaction.update({
        embeds: [
          buildTechniqueLearnResultEmbed(
            result,
          ),
        ],

        components:
          buildTechniqueResultRows(
            ownerId,
          ),
      });
    }

    /**
     * =====================================================
     * BÍ BẢO · V2.7
     * =====================================================
     */

    if (
      action ===
      'treasure'
    ) {
      const profile =
        await getCultivationProfile(
          client,
          guildId,
          userId,
        );

      return interaction.update({
        embeds: [
          buildTreasureEmbed(
            interaction.user,
            profile,
          ),
        ],

        components:
          buildTreasureRows(
            ownerId,
            profile,
          ),
      });
    }

    /**
     * =====================================================
     * KÍCH HOẠT BÍ BẢO
     * =====================================================
     */

    if (
      action ===
      'talisman_activate'
    ) {
      if (!extra) {
        return interaction.reply({
          content:
            'Không xác định được Phù Hiệu cần kích hoạt.',

          flags:
            MessageFlags.Ephemeral,
        });
      }

      const result =
        await activateCultivationTalisman(
          client,
          guildId,
          userId,
          extra,
        );

      return interaction.update({
        embeds: [
          buildTalismanResultEmbed(
            result,
          ),
        ],

        components:
          buildTalismanResultRows(
            ownerId,
          ),
      });
    }

    /**
     * =====================================================
     * LINH THÚ · V2.8
     * =====================================================
     */

    if (
      action ===
      'pet'
    ) {
      const profile =
        await getCultivationProfile(
          client,
          guildId,
          userId,
        );

      return interaction.update({
        embeds: [
          buildPetEmbed(
            interaction.user,
            profile,
          ),
        ],

        components:
          buildPetRows(
            ownerId,
            profile,
          ),
      });
    }

    /**
     * =====================================================
     * THU PHỤC LINH THÚ
     * =====================================================
     */

    if (
      action ===
      'pet_capture'
    ) {
      if (!extra) {
        return interaction.reply({
          content:
            'Không xác định được Linh Thú cần thu phục.',

          flags:
            MessageFlags.Ephemeral,
        });
      }

      const result =
        await captureCultivationPet(
          client,
          guildId,
          userId,
          extra,
        );

      return interaction.update({
        embeds: [
          buildPetCaptureResultEmbed(
            result,
          ),
        ],

        components:
          buildPetResultRows(
            ownerId,
          ),
      });
    }

    /**
     * =====================================================
     * HỒ SƠ
     * =====================================================
     */

    if (
      action ===
      'profile'
    ) {
      const profile =
        await getCultivationProfile(
          client,
          guildId,
          userId,
        );

      return interaction.update({
        embeds: [
          buildProfileEmbed(
            interaction.user,
            profile,
          ),
        ],

        components: [
          buildBackRow(
            ownerId,
            'profile',
          ),
        ],
      });
    }

    /**
     * =====================================================
     * TIÊN BẢNG
     * =====================================================
     */

    if (
      action ===
      'leaderboard'
    ) {
      const entries =
        await getCultivationLeaderboard(
          client,
          guildId,
          10,
        );

      return interaction.update({
        embeds: [
          buildLeaderboardEmbed(
            entries,
            interaction.guild,
          ),
        ],

        components: [
          buildBackRow(
            ownerId,
            'leaderboard',
          ),
        ],
      });
    }

    /**
     * =====================================================
     * UNKNOWN
     * =====================================================
     */

    return interaction.reply({
      content:
        'Không tìm thấy hành động Tiên Lộ tương ứng.',

      flags:
        MessageFlags.Ephemeral,
    });
  },
};
