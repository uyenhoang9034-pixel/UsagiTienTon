import {
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';

import {
  CULTIVATION_CONFIG,
  CULTIVATION_ITEMS,
} from '../../config/cultivationGame.js';

const ERROR_EMOJI =
  '<a:angryg1:1541441195144773652>';

const HEADER =
  '<a:trangtrig2:1546040703375904801> **TIÊN LỘ · GM** <a:trangtrig3:1546040818261954610>';

function hasTutienAdminRole(member) {
  const adminRoleId =
    CULTIVATION_CONFIG.adminRoleId;

  return Boolean(
    adminRoleId &&
    member?.roles?.cache?.has?.(
      adminRoleId,
    ),
  );
}

function clampItemQuantity(value) {
  return Math.max(
    1,
    Math.min(
      99,
      Math.floor(Number(value) || 1),
    ),
  );
}

function clampLargeQuantity(value) {
  return Math.max(
    1,
    Math.min(
      1000000000,
      Math.floor(Number(value) || 1),
    ),
  );
}

function formatNumber(value) {
  return new Intl.NumberFormat('vi-VN').format(
    Math.max(0, Math.floor(Number(value) || 0)),
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
      .setDescription('GM: Cấp vật phẩm, Linh Thú, Linh Thạch hoặc Trận Pháp.')
      .addStringOption(
        (option) =>
          option
            .setName('item')
            .setDescription('Vật phẩm, Linh Thạch hoặc Trận Pháp muốn cấp.')
            .setRequired(false)
            .addChoices(
              { name: 'Tụ Khí Đan', value: 'tu_khi_dan' },
              { name: 'Hồi Nguyên Đan', value: 'hoi_nguyen_dan' },
              { name: 'Phá Cảnh Đan', value: 'pha_canh_dan' },
              { name: 'Thiên Linh Thảo', value: 'thien_linh_thao' },
              { name: 'Huyền Thiết', value: 'huyen_thiet' },
              { name: 'Thượng Cổ Phù', value: 'co_phu' },
              { name: 'Vô Danh Kiếm Phổ', value: 'vo_danh_kiem_pho' },
              { name: 'Linh Thạch', value: 'currency:spirit_stones' },
              { name: 'Trận Văn', value: 'formation_essence' },
              { name: 'Trận Đồ · Tiểu Ngũ Hành Trận', value: 'formation:five_elements' },
              { name: 'Trận Đồ · Phong Lôi Dẫn Thiên Trận', value: 'formation:wind_lightning' },
              { name: 'Trận Đồ · Huyền Băng Tỏa Linh Trận', value: 'formation:frozen_spirit' },
              { name: 'Trận Đồ · Âm Dương Lưỡng Nghi Trận', value: 'formation:yin_yang' },
              { name: 'Trận Đồ · Hỗn Độn Quy Nhất Trận', value: 'formation:chaos_unity' },
            ),
      )
      .addStringOption(
        (option) =>
          option
            .setName('linhthu')
            .setDescription('Linh Thú muốn ban tặng trực tiếp.')
            .setRequired(false)
            .addChoices(
              { name: 'Thanh Phong Linh Hồ', value: 'thanh_phong_linh_ho' },
              { name: 'Xích Viêm Hỏa Điểu', value: 'xich_viem_hoa_dieu' },
              { name: 'Huyền Giáp Linh Quy', value: 'huyen_giap_linh_quy' },
              { name: 'Thiên Lôi Bạch Hổ', value: 'thien_loi_bach_ho' },
              { name: 'Hậu Thổ Kim Long', value: 'hau_tho_kim_long' },
              { name: 'Tầm Linh Miêu', value: 'tam_linh_mieu' },
              { name: 'Nguyệt Quang Linh Thố', value: 'nguyet_quang_linh_tho' },
              { name: 'Hàn Ngọc Linh Xà', value: 'han_ngoc_linh_xa' },
              { name: 'U Minh Huyền Xà', value: 'u_minh_huyen_xa' },
              { name: 'Bạch Giác Linh Lộc', value: 'bach_giac_linh_loc' },
              { name: 'Thái Âm Cửu Vĩ Hồ', value: 'thai_am_cuu_vi_ho' },
              { name: 'Tử Điện Kỳ Lân', value: 'tu_dien_ky_lan' },
              { name: 'Niết Bàn Phượng Hoàng', value: 'niet_ban_phuong_hoang' },
              { name: 'Bạch Vũ Phong Lang', value: 'bach_vu_phong_lang' },
              { name: 'Hư Không Côn Bằng', value: 'hu_khong_con_bang' },
            ),
      )
      .addIntegerOption(
        (option) =>
          option
            .setName('soluong')
            .setDescription('Số lượng muốn cấp. Trận Đồ/Linh Thú luôn cấp 1.')
            .setMinValue(1)
            .setMaxValue(1000000000),
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

      if (!interaction.client?.db) {
        return interaction.reply({
          content: formatError('Database chưa sẵn sàng, thử lại sau một chút nhé.'),
          flags: MessageFlags.Ephemeral,
        });
      }

      const baseSelectedId = interaction.options.getString('item');
      const selectedPetId = interaction.options.getString('linhthu');

      if (!baseSelectedId && !selectedPetId) {
        return interaction.reply({
          content: formatError('Hãy chọn `item` hoặc `linhthu` muốn cấp.'),
          flags: MessageFlags.Ephemeral,
        });
      }

      if (baseSelectedId && selectedPetId) {
        return interaction.reply({
          content: formatError('Mỗi lần chỉ chọn một trong hai: `item` hoặc `linhthu`.'),
          flags: MessageFlags.Ephemeral,
        });
      }

      const selectedId = selectedPetId
        ? `pet:${selectedPetId}`
        : baseSelectedId;
      const requestedQuantity = interaction.options.getInteger('soluong');
      const targetUser =
        interaction.options.getUser('member') ||
        interaction.user;

      if (targetUser.bot) {
        return interaction.reply({
          content: formatError('Không thể cấp dữ liệu Tiên Lộ cho bot.'),
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

      if (selectedId === 'currency:spirit_stones') {
        const quantity = clampLargeQuantity(requestedQuantity);
        const profile = await getCultivationProfile(
          interaction.client,
          interaction.guildId,
          targetUser.id,
        );

        profile.spiritStones =
          Math.max(0, Number(profile.spiritStones) || 0) + quantity;

        const saved = await saveCultivationProfile(
          interaction.client,
          profile,
        );

        const emoji = CULTIVATION_CONFIG.ui?.emojis?.spiritStone || '💎';

        return interaction.editReply({
          content: [
            HEADER,
            '',
            `${userEmoji} Đạo Hữu: <@${targetUser.id}>`,
            `${emoji} Đã cấp Linh Thạch: **+${formatNumber(quantity)}**`,
            `${emoji} Hiện có: **${formatNumber(saved.spiritStones)}**`,
          ].join('\n'),
        });
      }

      if (selectedId === 'formation_essence') {
        const quantity = clampLargeQuantity(requestedQuantity);
        const {
          getFormationState,
          saveFormationState,
        } = await import('../../services/cultivationFormation.js');

        const state = await getFormationState(
          interaction.client,
          interaction.guildId,
          targetUser.id,
        );

        state.formationEssence =
          Math.max(0, Number(state.formationEssence) || 0) + quantity;

        const saved = await saveFormationState(
          interaction.client,
          interaction.guildId,
          targetUser.id,
          state,
        );

        return interaction.editReply({
          content: [
            HEADER,
            '',
            `${userEmoji} Đạo Hữu: <@${targetUser.id}>`,
            `<a:tttrankho:1547820098465824809> Đã cấp Trận Văn: **+${formatNumber(quantity)}**`,
            `<a:tttrankho:1547820098465824809> Hiện có: **${formatNumber(saved.formationEssence)}**`,
          ].join('\n'),
        });
      }

      if (selectedId.startsWith('formation:')) {
        const formationId = selectedId.slice('formation:'.length);
        const {
          FORMATION_DEFINITIONS,
          getFormationState,
          saveFormationState,
        } = await import('../../services/cultivationFormation.js');

        const formation = FORMATION_DEFINITIONS[formationId];

        if (!formation) {
          return interaction.editReply({
            content: formatError('Không tìm thấy Trận Đồ này.'),
          });
        }

        const state = await getFormationState(
          interaction.client,
          interaction.guildId,
          targetUser.id,
        );

        const alreadyUnlocked = state.unlockedFormationIds.includes(formationId);

        if (!alreadyUnlocked) {
          state.unlockedFormationIds.push(formationId);
          state.formationLevels[formationId] ||= 1;
          state.layouts[formationId] ||= [...formation.pattern];

          await saveFormationState(
            interaction.client,
            interaction.guildId,
            targetUser.id,
            state,
          );
        }

        return interaction.editReply({
          content: [
            HEADER,
            '',
            `${userEmoji} Đạo Hữu: <@${targetUser.id}>`,
            `<a:ttrando:1547820131889979464> Trận Đồ: **${formation.name}**`,
            `<a:trangtrig43:1547238351869059082> Trạng Thái: **${alreadyUnlocked ? 'Đã mở khóa từ trước' : 'Đã mở khóa'}**`,
          ].join('\n'),
        });
      }

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
            `${pet.emoji} Phẩm Chất: **${pet.rarity}**`,
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

      const quantity = clampItemQuantity(requestedQuantity);
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
        `Lệnh cấp dữ liệu Tiên Lộ bị lỗi: \`${error?.message || 'Unknown error'}\``,
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
