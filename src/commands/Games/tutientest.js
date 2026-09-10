import {
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';

import {
  CULTIVATION_CONFIG,
} from '../../config/cultivationGame.js';

import {
  clearAdventureV2Session,
} from '../../services/cultivationAdventureV2.js';

import {
  startAdventureMerchant,
  resolveHeavenlyFortune,
} from '../../services/cultivationAdventureV294.js';

import {
  buildAdventureMerchantEmbed,
  buildAdventureMerchantRows,
  buildHeavenlyFortuneEmbed,
  buildAdventureV294BackRows,
} from '../../services/cultivationAdventureV294UI.js';

import {
  buildAdventurePetUnknownEmbed,
  buildAdventurePetUnknownRows,
} from '../../services/cultivationAdventureV295UI.js';

/**
 * =========================================================
 * TU TIÊN TEST · GM COMMAND
 * =========================================================
 *
 * Dùng để ép event Thám Hiểm phục vụ test.
 *
 * Không cần:
 * - random map
 * - random event
 * - chờ cooldown
 * - xóa Linh Thú đang sở hữu
 *
 * Gameplay bình thường không bị ảnh hưởng.
 */

const TUTIEN_ADMIN_ROLE_ID =
  '1541303749916754001';

const ADVENTURE_SESSION_PREFIX =
  'games:cultivation:adventureV2:';

/**
 * =========================================================
 * PET IDS
 * =========================================================
 *
 * Phải trùng ID trong cultivationPet.js.
 */

const TEST_PETS = {
  pet_thanh_phong_linh_ho: {
    id:
      'thanh_phong_linh_ho',

    label:
      'Thanh Phong Linh Hồ',
  },

  pet_xich_viem_hoa_dieu: {
    id:
      'xich_viem_hoa_dieu',

    label:
      'Xích Viêm Hỏa Điểu',
  },

  pet_huyen_giap_linh_quy: {
    id:
      'huyen_giap_linh_quy',

    label:
      'Huyền Giáp Linh Quy',
  },

  pet_thien_loi_bach_ho: {
    id:
      'thien_loi_bach_ho',

    label:
      'Thiên Lôi Bạch Hổ',
  },
};

/**
 * =========================================================
 * SESSION HELPERS
 * =========================================================
 */

function getAdventureSessionKey(
  guildId,
  userId,
) {
  return `${ADVENTURE_SESSION_PREFIX}${guildId}:${userId}`;
}

async function setAdventureSession(
  client,
  guildId,
  userId,
  data,
) {
  const now =
    Date.now();

  const session = {
    version:
      1,

    guildId,
    userId,

    monster:
      null,

    createdAt:
      now,

    updatedAt:
      now,

    ...data,
  };

  await client.db.set(
    getAdventureSessionKey(
      guildId,
      userId,
    ),
    session,
  );

  return session;
}

/**
 * =========================================================
 * FORCED PAVILION
 * =========================================================
 */

async function createForcedPavilionSession(
  client,
  guildId,
  userId,
) {
  await clearAdventureV2Session(
    client,
    guildId,
    userId,
  );

  return setAdventureSession(
    client,
    guildId,
    userId,
    {
      locationId:
        'dao_hoa_coc',

      state:
        'location',
    },
  );
}

/**
 * =========================================================
 * FORCED PET
 * =========================================================
 *
 * Không gọi startAdventurePetEncounter().
 *
 * Lý do:
 * startAdventurePetEncounter() cố tình loại những pet
 * người chơi đã sở hữu.
 *
 * GM test cần bỏ qua điều đó.
 */

async function createForcedPetSession(
  client,
  guildId,
  userId,
  petId,
) {
  await clearAdventureV2Session(
    client,
    guildId,
    userId,
  );

  return setAdventureSession(
    client,
    guildId,
    userId,
    {
      locationId:
        'loi_vuc',

      state:
        'pet_encounter',

      petEncounter: {
        petId,

        revealed:
          false,

        testMode:
          true,

        createdAt:
          Date.now(),
      },
    },
  );
}

/**
 * =========================================================
 * COMMAND
 * =========================================================
 */

export default {
  data:
    new SlashCommandBuilder()
      .setName(
        'tutientest',
      )

      .setDescription(
        'GM: Ép event để test hệ thống Thám Hiểm Tiên Lộ.',
      )

      .addStringOption(
        option =>
          option
            .setName(
              'event',
            )

            .setDescription(
              'Chọn event muốn test.',
            )

            .setRequired(
              true,
            )

            .addChoices(
              {
                name:
                  'Thương Nhân Thần Bí',

                value:
                  'merchant',
              },

              {
                name:
                  'Thiên Đạo Cơ Duyên',

                value:
                  'heavenly_fortune',
              },

              {
                name:
                  'Thanh Phong Linh Hồ',

                value:
                  'pet_thanh_phong_linh_ho',
              },

              {
                name:
                  'Xích Viêm Hỏa Điểu',

                value:
                  'pet_xich_viem_hoa_dieu',
              },

              {
                name:
                  'Huyền Giáp Linh Quy',

                value:
                  'pet_huyen_giap_linh_quy',
              },

              {
                name:
                  'Thiên Lôi Bạch Hổ',

                value:
                  'pet_thien_loi_bach_ho',
              },
            ),
      ),

  category:
    'Games',

  async execute(
    interaction,
  ) {
    /**
     * =====================================================
     * SERVER ONLY
     * =====================================================
     */

    if (
      !interaction.guildId ||
      !interaction.guild
    ) {
      return interaction.reply({
        content:
          'Lệnh này chỉ có thể sử dụng trong server.',

        flags:
          MessageFlags.Ephemeral,
      });
    }

    /**
     * =====================================================
     * ADMIN ROLE
     * =====================================================
     */

    const member =
      interaction.member;

    const hasAdminRole =
      member
        ?.roles
        ?.cache
        ?.has(
          TUTIEN_ADMIN_ROLE_ID,
        );

    if (!hasAdminRole) {
      return interaction.reply({
        content:
          'Bạn không có quyền sử dụng lệnh test Tiên Lộ.',

        flags:
          MessageFlags.Ephemeral,
      });
    }

    /**
     * =====================================================
     * GAME ENABLED
     * =====================================================
     */

    if (
      !CULTIVATION_CONFIG
        .enabled
    ) {
      return interaction.reply({
        content:
          'Tiên Lộ hiện đang tạm đóng.',

        flags:
          MessageFlags.Ephemeral,
      });
    }

    /**
     * =====================================================
     * CHANNEL CHECK
     * =====================================================
     */

    if (
      CULTIVATION_CONFIG
        .channelId &&
      interaction.channelId !==
        CULTIVATION_CONFIG
          .channelId
    ) {
      return interaction.reply({
        content:
          `Tiên Lộ chỉ mở tại <#${CULTIVATION_CONFIG.channelId}>.`,

        flags:
          MessageFlags.Ephemeral,
      });
    }

    const event =
      interaction.options
        .getString(
          'event',
          true,
        );

    const client =
      interaction.client;

    const guildId =
      interaction.guildId;

    const userId =
      interaction.user.id;

    /**
     * =====================================================
     * MERCHANT
     * =====================================================
     */

    if (
      event ===
      'merchant'
    ) {
      await createForcedPavilionSession(
        client,
        guildId,
        userId,
      );

      const result =
        await startAdventureMerchant(
          client,
          guildId,
          userId,
        );

      if (!result.ok) {
        await clearAdventureV2Session(
          client,
          guildId,
          userId,
        );

        return interaction.reply({
          content:
            `❌ Không thể tạo Merchant test: \`${result.reason || 'unknown'}\``,

          flags:
            MessageFlags.Ephemeral,
        });
      }

      return interaction.reply({
        embeds: [
          buildAdventureMerchantEmbed(
            result,
          ),
        ],

        components:
          buildAdventureMerchantRows(
            userId,
            result.stock,
          ),
      });
    }

    /**
     * =====================================================
     * HEAVENLY FORTUNE
     * =====================================================
     */

    if (
      event ===
      'heavenly_fortune'
    ) {
      await createForcedPavilionSession(
        client,
        guildId,
        userId,
      );

      const result =
        await resolveHeavenlyFortune(
          client,
          guildId,
          userId,
        );

      if (!result.ok) {
        await clearAdventureV2Session(
          client,
          guildId,
          userId,
        );

        return interaction.reply({
          content:
            `❌ Không thể tạo Thiên Đạo Cơ Duyên test: \`${result.reason || 'unknown'}\``,

          flags:
            MessageFlags.Ephemeral,
        });
      }

      return interaction.reply({
        embeds: [
          buildHeavenlyFortuneEmbed(
            result,
          ),
        ],

        components:
          buildAdventureV294BackRows(
            userId,
          ),
      });
    }

    /**
     * =====================================================
     * V2.9.5 · FORCED PET ENCOUNTER
     * =====================================================
     */

    const testPet =
      TEST_PETS[event];

    if (testPet) {
      /**
       * Tạo thẳng encounter.
       *
       * Không kiểm tra ownedPets.
       */
      await createForcedPetSession(
        client,
        guildId,
        userId,
        testPet.id,
      );

      return interaction.reply({
        embeds: [
          buildAdventurePetUnknownEmbed(),
        ],

        components:
          buildAdventurePetUnknownRows(
            userId,
          ),
      });
    }

    /**
     * =====================================================
     * UNKNOWN
     * =====================================================
     */

    return interaction.reply({
      content:
        'Không tìm thấy event test tương ứng.',

      flags:
        MessageFlags.Ephemeral,
    });
  },
};
