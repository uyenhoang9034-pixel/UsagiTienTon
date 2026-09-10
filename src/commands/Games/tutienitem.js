import {
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';

import {
  CULTIVATION_CONFIG,
  CULTIVATION_ITEMS,
} from '../../config/cultivationGame.js';

/**
 * =========================================================
 * TU TIÊN ITEM · GM COMMAND
 * =========================================================
 *
 * Lệnh cấp vật phẩm Tiên Lộ cho người chơi.
 * Chỉ role quản lý Tiên Lộ mới có thể dùng.
 */

const TUTIEN_ADMIN_ROLE_ID =
  '1541303749916754001';

const ERROR_EMOJI =
  '<a:angryg1:1541441195144773652>';

const HEADER =
  '<a:trangtrig2:1546040703375904801> **TIÊN LỘ · GM** <a:trangtrig3:1546040818261954610>';

function hasTutienAdminRole(
  member,
) {
  return Boolean(
    member
      ?.roles
      ?.cache
      ?.has(
        TUTIEN_ADMIN_ROLE_ID,
      ),
  );
}

function clampQuantity(
  value,
) {
  return Math.max(
    1,
    Math.min(
      99,
      Math.floor(
        Number(
          value,
        ) || 1,
      ),
    ),
  );
}

function formatError(
  message,
) {
  return `${ERROR_EMOJI} ${message}`;
}

function getItemEmoji(
  item,
) {
  const type =
    item?.type;

  return (
    CULTIVATION_CONFIG
      .ui
      ?.itemEmojis
      ?.[type] ||
    CULTIVATION_CONFIG
      .ui
      ?.emojis
      ?.spiritStone ||
    '✨'
  );
}

export default {
  data:
    new SlashCommandBuilder()
      .setName(
        'tutienitem',
      )
      .setDescription(
        'GM: Cấp vật phẩm Tiên Lộ cho đạo hữu.',
      )
      .addStringOption(
        (option) =>
          option
            .setName(
              'item',
            )
            .setDescription(
              'Vật phẩm muốn cấp.',
            )
            .setRequired(
              true,
            )
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
            .setMinValue(
              1,
            )
            .setMaxValue(
              99,
            ),
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
    try {
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

      if (
        !hasTutienAdminRole(
          interaction.member,
        )
      ) {
        return interaction.reply({
          content:
            formatError(
              'Bạn không có quyền sử dụng lệnh quản lý Tiên Lộ.',
            ),

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
       *
       * interactionCreate hiện đã cho phép các lệnh GM Tiên Lộ
       * dùng ở mọi kênh trong server bằng compatibility routing.
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
       * DATABASE CHECK
       * =====================================================
       */

      if (
        !interaction.client
          ?.db
      ) {
        return interaction.reply({
          content:
            formatError(
              'Database chưa sẵn sàng, thử lại sau một chút nhé.',
            ),

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
        clampQuantity(
          interaction.options
            .getInteger(
              'soluong',
            ),
        );

      const targetUser =
        interaction.options
          .getUser(
            'member',
          ) ||
        interaction.user;

      if (
        targetUser.bot
      ) {
        return interaction.reply({
          content:
            formatError(
              'Không thể cấp vật phẩm Tiên Lộ cho bot.',
            ),

          flags:
            MessageFlags.Ephemeral,
        });
      }

      const item =
        CULTIVATION_ITEMS[
          itemId
        ];

      if (!item) {
        return interaction.reply({
          content:
            formatError(
              'Không tìm thấy vật phẩm này trong Tiên Lộ.',
            ),

          flags:
            MessageFlags.Ephemeral,
        });
      }

      /**
       * Thành công của /tutienitem là tin nhắn công khai.
       * Không dùng Ephemeral để người nhận và mọi người đều thấy.
       */
      await interaction.deferReply();

      /**
       * =====================================================
       * LAZY LOAD SERVICE
       * =====================================================
       *
       * Tránh lỗi service phụ làm bot chết ngay lúc load command.
       */

      const {
        addInventoryItem,
        getCultivationProfile,
        saveCultivationProfile,
      } = await import(
        '../../services/cultivationService.js'
      );

      const profile =
        await getCultivationProfile(
          interaction.client,
          interaction.guildId,
          targetUser.id,
        );

      const added =
        addInventoryItem(
          profile,
          itemId,
          quantity,
        );

      if (!added) {
        return interaction.editReply({
          content:
            formatError(
              'Không thể thêm vật phẩm vào Túi Đồ.',
            ),
        });
      }

      const saved =
        await saveCultivationProfile(
          interaction.client,
          profile,
        );

      const currentQuantity =
        Math.max(
          0,
          Number(
            saved.inventory?.[
              itemId
            ],
          ) || 0,
        );

      const userEmoji =
        CULTIVATION_CONFIG
          .ui
          ?.emojis
          ?.user ||
        '🐰';

      const itemEmoji =
        getItemEmoji(
          item,
        );

      return interaction.editReply({
        content: [
          HEADER,
          '',
          `${userEmoji} Đạo Hữu: <@${targetUser.id}>`,
          `${itemEmoji} Vật Phẩm: **${item.name}**`,
          `${itemEmoji} Đã Cấp: **×${quantity}**`,
          `${itemEmoji} Hiện Có: **×${currentQuantity}**`,
        ].join(
          '\n',
        ),
      });
    } catch (error) {
      console.error(
        '[TU TIEN ITEM ERROR]',
        error,
      );

      const message =
        formatError(
          `Lệnh cấp vật phẩm bị lỗi: \`${error?.message || 'Unknown error'}\``,
        );

      if (
        interaction.deferred ||
        interaction.replied
      ) {
        return interaction.editReply({
          content:
            message,
        }).catch(
          () => {},
        );
      }

      return interaction.reply({
        content:
          message,

        flags:
          MessageFlags.Ephemeral,
      }).catch(
        () => {},
      );
    }
  },
};
