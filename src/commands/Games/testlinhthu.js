import {
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';

import {
  CULTIVATION_CONFIG,
} from '../../config/cultivationGame.js';

import {
  getCultivationPet,
} from '../../services/cultivationPet.js';

import {
  buildPetEncounterEmbed,
  buildPetEncounterRows,
} from '../../services/cultivationPetUI.js';

/**
 * =========================================================
 * TEST LINH THÚ · GM COMMAND
 * =========================================================
 *
 * Chỉ dành cho role quản lý Tiên Lộ.
 *
 * Công dụng:
 * - Ép xuất hiện một Linh Thú để test.
 * - Không kích hoạt cooldown Thám Hiểm.
 * - Không nhận reward Thám Hiểm.
 * - Không sửa profile.
 * - Button Thu Phục vẫn chạy logic thật.
 */

const TUTIEN_ADMIN_ROLE_ID =
  '1541303749916754001';

export default {
  data:
    new SlashCommandBuilder()
      .setName(
        'testlinhthu',
      )
      .setDescription(
        'Ép xuất hiện Linh Thú để test hệ thống Tiên Lộ.',
      )

      .addStringOption(
        (option) =>
          option
            .setName(
              'linhthu',
            )
            .setDescription(
              'Chọn Linh Thú muốn test.',
            )
            .setRequired(
              true,
            )
            .addChoices(
              {
                name:
                  'Thanh Phong Linh Hồ',
                value:
                  'thanh_phong_linh_ho',
              },

              {
                name:
                  'Xích Viêm Hỏa Điểu',
                value:
                  'xich_viem_hoa_dieu',
              },

              {
                name:
                  'Huyền Giáp Linh Quy',
                value:
                  'huyen_giap_linh_quy',
              },

              {
                name:
                  'Thiên Lôi Bạch Hổ',
                value:
                  'thien_loi_bach_ho',
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
     * ROLE PERMISSION
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

    if (
      !hasAdminRole
    ) {
      return interaction.reply({
        content:
          '<a:angryg1:1541441195144773652> Bạn không có quyền sử dụng lệnh test Tiên Lộ.',

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

    /**
     * =====================================================
     * GET OPTION
     * =====================================================
     */

    const petId =
      interaction.options
        .getString(
          'linhthu',
          true,
        );

    /**
     * =====================================================
     * PET CHECK
     * =====================================================
     */

    const pet =
      getCultivationPet(
        petId,
      );

    if (!pet) {
      return interaction.reply({
        content:
          '<a:angryg1:1541441195144773652> Không tìm thấy Linh Thú này.',

        flags:
          MessageFlags.Ephemeral,
      });
    }

    /**
     * =====================================================
     * TEST ENCOUNTER
     * =====================================================
     *
     * Không gọi adventure().
     *
     * Vì vậy:
     * - không cooldown
     * - không cộng stats adventure
     * - không nhận reward
     * - không làm mất Bí Bảo
     */

    return interaction.reply({
      embeds: [
        buildPetEncounterEmbed(
          pet.id,
        ),
      ],

      components:
        buildPetEncounterRows(
          interaction.user.id,
          pet.id,
        ),
    });
  },
};
