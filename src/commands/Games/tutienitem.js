import {
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';

import {
  CULTIVATION_CONFIG,
  CULTIVATION_ITEMS,
} from '../../config/cultivationGame.js';

const TUTIEN_ADMIN_ROLE_ID =
  '1541303749916754001';

const ERROR_EMOJI =
  '<a:angryg1:1541441195144773652>';

const HEADER =
  '<a:trangtrig2:1546040703375904801> **TIÊN LỘ · GM** <a:trangtrig3:1546040818261954610>';

function hasTutienAdminRole(member) {
  return Boolean(
    member?.roles?.cache?.has(
      TUTIEN_ADMIN_ROLE_ID,
    ),
  );
}

function clampQuantity(value) {
  return Math.max(
    1,
    Math.min(
      99,
      Math.floor(Number(value) || 1),
    ),
  );
}

function formatError(message) {
  return `${ERROR_EMOJI} ${message}`;
}

function getItemEmoji(item) {
  const type = item?.type;

  return (
    CULTIVATION_CONFIG.ui?.itemEmojis?.[type] ||
    CULTIVATION_CONFIG.ui?.emojis?.spiritStone ||
    '✨'
  );
}

export default {
  data:
    new SlashCommandBuilder()
      .setName('tutienitem')
      .setDescription('GM: Cấp vật phẩm hoặc Linh Thú Tiên Lộ cho đạo hữu.')
      .addStringOption(
        (option) =>
          option
            .setName('item')
            .setDescription('Vật phẩm hoặc Linh Thú muốn cấp.')
            .setRequired(true)
            .addChoices(
              { name: 'Tụ Khí Đan', value: 'tu_khi_dan' },
              { name: 'Hồi Nguyên Đan', value: 'hoi_nguyen_dan' },
              { name: 'Phá Cảnh Đan', value: 'pha_canh_dan' },
              { name: 'Thiên Linh Thảo', value: 'thien_linh_thao' },
              { name: 'Huyền Thiết', value: 'huyen_thiet' },
              { name: 'Thượng Cổ Phù', value: 'co_phu' },
              { name: 'Vô Danh Kiếm Phổ', value: 'vo_danh_kiem_pho' },
              { name: 'Linh Thú · Thanh Phong Linh Hồ', value: 'pet:thanh_phong_linh_ho' },
              { name: 'Linh Thú · Xích Viêm Hỏa Điểu', value: 'pet:xich_viem_hoa_dieu' },
              { name: 'Linh Thú · Huyền Giáp Linh Quy', value: 'pet:huyen_giap_linh_quy' },
              { name: 'Linh Thú · Thiên Lôi Bạch Hổ', value: 'pet:thien_loi_bach_ho' },
            ),
      )
      .addIntegerOption(
        (option) =>
          option
            .setName('soluong')
            .setDescription('Số lượng vật phẩm muốn cấp. Linh Thú luôn cấp 1 con.')
            .setMinValue(1)
            .setMaxValue(99),
      )
      .addUserOption(
        (option) =>
          option
            .setName('member')
            .setDescription('Đạo hữu muốn nhận. Để trống = chính bạn.'),
      ),

  category: 'Games',

  async execute(interaction) {
    try {
      if (!interaction.guildId || !interaction.guild) {
        return interaction.reply({
          content: 'Lệnh này chỉ có thể sử dụng trong server.',
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!hasTutienAdminRole(interaction.member)) {
        return interaction.reply({
          content: formatError('Bạn không có quyền sử dụng lệnh quản lý Tiên Lộ.'),
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!CULTIVATION_CONFIG.enabled) {
        return interaction.reply({
          content: 'Tiên Lộ hiện đang tạm đóng.',
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

      if (!interaction.client?.db) {
        return interaction.reply({
          content: formatError('Database chưa sẵn sàng, thử lại sau một chút nhé.'),
          flags: MessageFlags.Ephemeral,
        });
      }

      const selectedId = interaction.options.getString('item', true);
      const quantity = clampQuantity(
        interaction.options.getInteger('soluong'),
      );
      const targetUser =
        interaction.options.getUser('member') ||
        interaction.user;

      if (targetUser.bot) {
        return interaction.reply({
          content: formatError('Không thể cấp vật phẩm hoặc Linh Thú cho bot.'),
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.deferReply();

      const {
        addInventoryItem,
        getCultivationProfile,
        saveCultivationProfile,
      } = await import('../../services/cultivationService.js');

      const userEmoji =
        CULTIVATION_CONFIG.ui?.emojis?.user ||
        '🐰';

      if (selectedId.startsWith('pet:')) {
        const petId = selectedId.slice(4);
        const {
          getCultivationPet,
          ensurePetData,
          ownsPet,
        } = await import('../../services/cultivationPet.js');

        const pet = getCultivationPet(petId);

        if (!pet) {
          return interaction.editReply({
            content: formatError('Không tìm thấy Linh Thú này.'),
          });
        }

        const profile = await getCultivationProfile(
          interaction.client,
          interaction.guildId,
          targetUser.id,
        );

        ensurePetData(profile);

        const alreadyOwned = ownsPet(
          profile,
          petId,
        );

        if (!alreadyOwned) {
          profile.pets.owned[petId] = true;

          if (!profile.pets.active) {
            profile.pets.active = petId;
          }

          await saveCultivationProfile(
            interaction.client,
            profile,
          );
        }

        return interaction.editReply({
          content: [
            HEADER,
            '',
            `${userEmoji} Đạo Hữu: <@${targetUser.id}>`,
            `${pet.emoji} Linh Thú: **${pet.name}**`,
            `${pet.emoji} Trạng Thái: **${alreadyOwned ? 'Đã sở hữu từ trước' : 'Đã ban tặng'}**`,
          ].join('\n'),
        });
      }

      const item = CULTIVATION_ITEMS[selectedId];

      if (!item) {
        return interaction.editReply({
          content: formatError('Không tìm thấy vật phẩm này trong Tiên Lộ.'),
        });
      }

      const profile = await getCultivationProfile(
        interaction.client,
        interaction.guildId,
        targetUser.id,
      );

      const added = addInventoryItem(
        profile,
        selectedId,
        quantity,
      );

      if (!added) {
        return interaction.editReply({
          content: formatError('Không thể thêm vật phẩm vào Túi Đồ.'),
        });
      }

      const saved = await saveCultivationProfile(
        interaction.client,
        profile,
      );

      const currentQuantity = Math.max(
        0,
        Number(saved.inventory?.[selectedId]) || 0,
      );

      const itemEmoji = getItemEmoji(item);

      return interaction.editReply({
        content: [
          HEADER,
          '',
          `${userEmoji} Đạo Hữu: <@${targetUser.id}>`,
          `${itemEmoji} Vật Phẩm: **${item.name}**`,
          `${itemEmoji} Đã Cấp: **×${quantity}**`,
          `${itemEmoji} Hiện Có: **×${currentQuantity}**`,
        ].join('\n'),
      });
    } catch (error) {
      console.error('[TU TIEN ITEM ERROR]', error);

      const message = formatError(
        `Lệnh cấp vật phẩm/Linh Thú bị lỗi: \`${error?.message || 'Unknown error'}\``,
      );

      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({ content: message }).catch(() => {});
      }

      return interaction.reply({
        content: message,
        flags: MessageFlags.Ephemeral,
      }).catch(() => {});
    }
  },
};
