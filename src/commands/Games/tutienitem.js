import {
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';

import {
  CULTIVATION_CONFIG,
  CULTIVATION_ITEMS,
} from '../../config/cultivationGame.js';

import {
  addInventoryItem,
  getCultivationProfile,
  saveCultivationProfile,
} from '../../services/cultivationService.js';

/**
 * =========================================================
 * TUTIEN ITEM — GM COMMAND
 * =========================================================
 *
 * Lệnh quản lý vật phẩm Tiên Lộ.
 * Chỉ role được cấu hình bên dưới mới có thể sử dụng.
 */

const TUTIEN_ADMIN_ROLE_ID =
  '1541303749916754001';

export default {
  data:
    new SlashCommandBuilder()
      .setName('tutienitem')
      .setDescription(
        'Quản lý vật phẩm Tiên Lộ.',
      )

      .addStringOption(
        (option) =>
          option
            .setName('item')
            .setDescription(
              'Vật phẩm muốn cấp.',
            )
            .setRequired(true)

            .addChoices(
              {
                name:
                  'Tụ Khí Đan',
                value:
                  'tu_khi_dan',
              },

              {
                name:
                  'Hồi Nguyên Đan',
                value:
                  'hoi_nguyen_dan',
              },

              {
                name:
                  'Phá Cảnh Đan',
                value:
                  'pha_canh_dan',
              },

              {
                name:
                  'Thiên Linh Thảo',
                value:
                  'thien_linh_thao',
              },

              {
                name:
                  'Huyền Thiết',
                value:
                  'huyen_thiet',
              },

              {
                name:
                  'Thượng Cổ Phù',
                value:
                  'co_phu',
              },

              {
                name:
                  'Vô Danh Kiếm Phổ',
                value:
                  'vo_danh_kiem_pho',
              },
            ),
      )

      .addIntegerOption(
        (option) =>
          option
            .setName(
              'soluong',
            )
            .setDescription(
              'Số lượng muốn cấp.',
            )
            .setMinValue(1)
            .setMaxValue(99),
      )

      .addUserOption(
        (option) =>
          option
            .setName(
              'member',
            )
            .setDescription(
              'Đạo hữu muốn nhận vật phẩm. Để trống = chính bạn.',
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
      member?.roles?.cache?.has(
        TUTIEN_ADMIN_ROLE_ID,
      );

    if (
      !hasAdminRole
    ) {
      return interaction.reply({
        content:
          '<a:angryg1:1541441195144773652> Bạn không có quyền sử dụng lệnh quản lý Tiên Lộ.',

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
     * OPTIONS
     * =====================================================
     */

    const itemId =
      interaction.options
        .getString(
          'item',
          true,
        );

    const quantity =
      interaction.options
        .getInteger(
          'soluong',
        ) || 1;

    const targetUser =
      interaction.options
        .getUser(
          'member',
        ) ||
      interaction.user;

    /**
     * Không cấp vật phẩm cho bot.
     */

    if (
      targetUser.bot
    ) {
      return interaction.reply({
        content:
          '<a:angryg1:1541441195144773652> Không thể cấp vật phẩm Tiên Lộ cho bot.',

        flags:
          MessageFlags.Ephemeral,
      });
    }

    /**
     * =====================================================
     * ITEM CHECK
     * =====================================================
     */

    const item =
      CULTIVATION_ITEMS[
        itemId
      ];

    if (!item) {
      return interaction.reply({
        content:
          '<a:angryg1:1541441195144773652> Không tìm thấy vật phẩm này trong Tiên Lộ.',

        flags:
          MessageFlags.Ephemeral,
      });
    }

    /**
     * =====================================================
     * LOAD PROFILE
     * =====================================================
     */

    const profile =
      await getCultivationProfile(
        interaction.client,
        interaction.guildId,
        targetUser.id,
      );

    /**
     * =====================================================
     * GIVE ITEM
     * =====================================================
     */

    const added =
      addInventoryItem(
        profile,
        itemId,
        quantity,
      );

    if (!added) {
      return interaction.reply({
        content:
          '<a:angryg1:1541441195144773652> Không thể thêm vật phẩm vào Túi Đồ.',

        flags:
          MessageFlags.Ephemeral,
      });
    }

    /**
     * =====================================================
     * SAVE
     * =====================================================
     */

    const saved =
      await saveCultivationProfile(
        interaction.client,
        profile,
      );

    const currentQuantity =
      saved.inventory?.[
        itemId
      ] || 0;

    /**
     * =====================================================
     * SUCCESS
     * =====================================================
     */

    return interaction.reply({
      content: [
        '<a:trangtrig2:1546040703375904801> **TIÊN LỘ · GM** <a:trangtrig3:1546040818261954610>',
        '',
        `<a:catg11:1546058047393239151> Đạo Hữu: <@${targetUser.id}>`,
        `<a:trangtrig9:1546047064952148089> Vật Phẩm: **${item.name}**`,
        `<a:trangtrig9:1546047064952148089> Đã Cấp: **×${quantity}**`,
        `<a:trangtrig9:1546047064952148089> Hiện Có: **×${currentQuantity}**`,
      ].join('\n'),

      flags:
        MessageFlags.Ephemeral,
    });
  },
};
