import {
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';

import {
  CULTIVATION_CONFIG,
  CULTIVATION_ITEMS,
} from '../../config/cultivationGame.js';

const ERROR_EMOJI = '<a:angryg1:1541441195144773652>';
const HEADER = '<a:trangtrig2:1546040703375904801> **TIÊN LỘ · GM** <a:trangtrig3:1546040818261954610>';

const PET_CHOICES = [
  ['Thanh Phong Linh Hồ', 'thanh_phong_linh_ho'],
  ['Tầm Linh Miêu', 'tam_linh_mieu'],
  ['Nguyệt Quang Linh Thố', 'nguyet_quang_linh_tho'],
  ['Tầm Bảo Linh Thử', 'tam_bao_linh_thu'],
  ['Thanh Vũ Linh Tước', 'thanh_vu_linh_tuoc'],
  ['Hỏa Nhung Linh Thố', 'hoa_nhung_linh_tho'],
  ['Huyền Giáp Linh Quy', 'huyen_giap_linh_quy'],
  ['U Minh Huyền Xà', 'u_minh_huyen_xa'],
  ['Hàn Ngọc Linh Xà', 'han_ngoc_linh_xa'],
  ['Bạch Giác Linh Lộc', 'bach_giac_linh_loc'],
  ['Trấn Nhạc Linh Hùng', 'tran_nhac_linh_hung'],
  ['Kim Vũ Linh Ưng', 'kim_vu_linh_ung'],
  ['Thái Âm Cửu Vĩ Hồ', 'thai_am_cuu_vi_ho'],
  ['Xích Viêm Hỏa Điểu', 'xich_viem_hoa_dieu'],
  ['U Ảnh Linh Miêu', 'u_anh_linh_mieu'],
  ['Bích Ngọc Tiên Lộc', 'bich_ngoc_tien_loc'],
  ['Tử Điện Kỳ Lân', 'tu_dien_ky_lan'],
  ['Thiên Lôi Bạch Hổ', 'thien_loi_bach_ho'],
  ['Niết Bàn Phượng Hoàng', 'niet_ban_phuong_hoang'],
  ['Xích Lân Hỏa Mãng', 'xich_lan_hoa_mang'],
  ['Kim Diễm Toan Nghê', 'kim_diem_toan_nghe'],
  ['Hậu Thổ Kim Long', 'hau_tho_kim_long'],
  ['Hư Không Côn Bằng', 'hu_khong_con_bang'],
  ['Bạch Vũ Phong Lang', 'bach_vu_phong_lang'],
  ['Thái Cổ Long Tượng', 'thai_co_long_tuong'],
  ['Thái Hư Tiên Hạc', 'thai_hu_tien_hac'],
].map(([name, value]) => ({ name, value }));

function hasTutienAdminRole(member) {
  const adminRoleId = CULTIVATION_CONFIG.adminRoleId;
  return Boolean(adminRoleId && member?.roles?.cache?.has?.(adminRoleId));
}

function clampItemQuantity(value) {
  return Math.max(1, Math.min(99, Math.floor(Number(value) || 1)));
}

function clampLargeQuantity(value) {
  return Math.max(1, Math.min(1000000000, Math.floor(Number(value) || 1)));
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

function normalizeSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function isRevokeAction(action) {
  return action === 'revoke';
}

function actionLabel(action) {
  return isRevokeAction(action) ? 'Thu Hồi' : 'Cấp';
}

function actionVerb(action) {
  return isRevokeAction(action) ? 'Đã thu hồi' : 'Đã cấp';
}

export default {
  data:
    new SlashCommandBuilder()
      .setName('tutienitem')
      .setDescription('GM: Cấp hoặc thu hồi dữ liệu Tiên Lộ.')
      .addStringOption(
        (option) =>
          option
            .setName('hanhdong')
            .setDescription('Chọn cấp hoặc thu hồi.')
            .setRequired(true)
            .addChoices(
              { name: 'Cấp', value: 'give' },
              { name: 'Thu hồi', value: 'revoke' },
            ),
      )
      .addStringOption(
        (option) =>
          option
            .setName('item')
            .setDescription('Vật phẩm, Linh Thạch hoặc Trận Pháp.')
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
            .setDescription('Linh Thú muốn cấp hoặc thu hồi.')
            .setRequired(false)
            .setAutocomplete(true),
      )
      .addStringOption(
        (option) =>
          option
            .setName('tinhthach')
            .setDescription('Tinh Thạch Trận Pháp muốn cấp hoặc thu hồi.')
            .setRequired(false)
            .addChoices(
              { name: 'Tinh Thạch · Kim', value: 'metal' },
              { name: 'Tinh Thạch · Mộc', value: 'wood' },
              { name: 'Tinh Thạch · Thủy', value: 'water' },
              { name: 'Tinh Thạch · Hỏa', value: 'fire' },
              { name: 'Tinh Thạch · Thổ', value: 'earth' },
              { name: 'Tinh Thạch · Phong', value: 'wind' },
              { name: 'Tinh Thạch · Lôi', value: 'lightning' },
              { name: 'Tinh Thạch · Băng', value: 'ice' },
              { name: 'Tinh Thạch · Âm Dương', value: 'yin_yang' },
              { name: 'Tinh Thạch · Tinh Thần', value: 'spirit' },
              { name: 'Tinh Thạch · Hỗn Độn', value: 'chaos' },
            ),
      )
      .addIntegerOption(
        (option) =>
          option
            .setName('soluong')
            .setDescription('Số lượng cấp/thu hồi. Trận Đồ và Linh Thú luôn là 1.')
            .setMinValue(1)
            .setMaxValue(1000000000),
      )
      .addUserOption(
        (option) =>
          option
            .setName('member')
            .setDescription('Đạo hữu mục tiêu. Để trống = chính bạn.'),
      ),

  category: 'Games',

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);

    if (focused.name !== 'linhthu') {
      return interaction.respond([]);
    }

    const query = normalizeSearch(focused.value);
    const choices = PET_CHOICES
      .filter((choice) =>
        !query ||
        normalizeSearch(choice.name).includes(query) ||
        normalizeSearch(choice.value).includes(query),
      )
      .slice(0, 25);

    return interaction.respond(choices);
  },

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

      const action = interaction.options.getString('hanhdong', true);
      const baseSelectedId = interaction.options.getString('item');
      const selectedPetId = interaction.options.getString('linhthu');
      const selectedCrystalId = interaction.options.getString('tinhthach');
      const selectedCount = [
        baseSelectedId,
        selectedPetId,
        selectedCrystalId,
      ].filter(Boolean).length;

      if (selectedCount === 0) {
        return interaction.reply({
          content: formatError('Hãy chọn `item`, `linhthu` hoặc `tinhthach`.'),
          flags: MessageFlags.Ephemeral,
        });
      }

      if (selectedCount > 1) {
        return interaction.reply({
          content: formatError('Mỗi lần chỉ chọn một trong ba: `item`, `linhthu` hoặc `tinhthach`.'),
          flags: MessageFlags.Ephemeral,
        });
      }

      const selectedId = selectedPetId
        ? `pet:${selectedPetId}`
        : selectedCrystalId
          ? `crystal:${selectedCrystalId}`
          : baseSelectedId;
      const requestedQuantity = interaction.options.getInteger('soluong');
      const targetUser = interaction.options.getUser('member') || interaction.user;
      const revoke = isRevokeAction(action);

      if (targetUser.bot) {
        return interaction.reply({
          content: formatError('Không thể chỉnh dữ liệu Tiên Lộ của bot.'),
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.deferReply();

      const {
        addInventoryItem,
        getCultivationProfile,
        saveCultivationProfile,
      } = await import('../../services/cultivationService.js');

      const userEmoji = CULTIVATION_CONFIG.ui?.emojis?.user || '🐰';

      if (selectedId === 'currency:spirit_stones') {
        const quantity = clampLargeQuantity(requestedQuantity);
        const profile = await getCultivationProfile(
          interaction.client,
          interaction.guildId,
          targetUser.id,
        );
        const current = Math.max(0, Number(profile.spiritStones) || 0);
        const changed = revoke ? Math.min(current, quantity) : quantity;

        profile.spiritStones = revoke
          ? Math.max(0, current - changed)
          : current + changed;

        const saved = await saveCultivationProfile(interaction.client, profile);
        const emoji = CULTIVATION_CONFIG.ui?.emojis?.spiritStone || '💎';

        return interaction.editReply({
          content: [
            HEADER,
            '',
            `${userEmoji} Đạo Hữu: <@${targetUser.id}>`,
            `${emoji} ${actionVerb(action)} Linh Thạch: **${revoke ? '-' : '+'}${formatNumber(changed)}**`,
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
        const current = Math.max(0, Number(state.formationEssence) || 0);
        const changed = revoke ? Math.min(current, quantity) : quantity;

        state.formationEssence = revoke
          ? Math.max(0, current - changed)
          : current + changed;

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
            `<a:tttrankho:1547820098465824809> ${actionVerb(action)} Trận Văn: **${revoke ? '-' : '+'}${formatNumber(changed)}**`,
            `<a:tttrankho:1547820098465824809> Hiện có: **${formatNumber(saved.formationEssence)}**`,
          ].join('\n'),
        });
      }

      if (selectedId.startsWith('crystal:')) {
        const crystalId = selectedId.slice('crystal:'.length);
        const quantity = clampLargeQuantity(requestedQuantity);
        const {
          FORMATION_ELEMENTS,
          getFormationState,
          saveFormationState,
        } = await import('../../services/cultivationFormation.js');

        const crystal = FORMATION_ELEMENTS[crystalId];
        if (!crystal) {
          return interaction.editReply({
            content: formatError('Không tìm thấy loại Tinh Thạch Trận Pháp này.'),
          });
        }

        const state = await getFormationState(
          interaction.client,
          interaction.guildId,
          targetUser.id,
        );
        const current = Math.max(0, Number(state.elementCrystals?.[crystalId]) || 0);
        const changed = revoke ? Math.min(current, quantity) : quantity;

        state.elementCrystals[crystalId] = revoke
          ? Math.max(0, current - changed)
          : current + changed;

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
            `${crystal.emoji || '💎'} Tinh Thạch: **${crystal.name}**`,
            `${crystal.emoji || '💎'} ${actionLabel(action)}: **${revoke ? '-' : '+'}${formatNumber(changed)}**`,
            `${crystal.emoji || '💎'} Hiện có: **${formatNumber(saved.elementCrystals?.[crystalId])}**`,
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

        if (revoke) {
          if (formationId === 'five_elements') {
            return interaction.editReply({
              content: formatError('Tiểu Ngũ Hành Trận là Trận Đồ nền tảng mặc định nên không thể thu hồi.'),
            });
          }

          if (alreadyUnlocked) {
            state.unlockedFormationIds = state.unlockedFormationIds.filter(
              (id) => id !== formationId,
            );

            if (state.activeFormationId === formationId) {
              state.activeFormationId = 'five_elements';
            }

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
              `<a:trangtrig43:1547238351869059082> Trạng Thái: **${alreadyUnlocked ? 'Đã thu hồi' : 'Không sở hữu'}**`,
              state.activeFormationId === 'five_elements'
                ? '<a:ttrando:1547820131889979464> Nếu Trận Đồ này đang dùng, hệ thống đã chuyển về **Tiểu Ngũ Hành Trận**.'
                : null,
            ].filter(Boolean).join('\n'),
          });
        }

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
          announceThaiHuTienHacAcquisition,
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
        const alreadyOwned = ownsPet(profile, petId);

        if (revoke) {
          if (alreadyOwned) {
            delete profile.pets.owned[petId];

            if (profile.pets.active === petId) {
              profile.pets.active = null;
            }

            await saveCultivationProfile(interaction.client, profile);
          }

          return interaction.editReply({
            content: [
              HEADER,
              '',
              `${userEmoji} Đạo Hữu: <@${targetUser.id}>`,
              `${pet.emoji} Linh Thú: **${pet.name}**`,
              `${pet.emoji} Phẩm Chất: **${pet.rarity}**`,
              `${pet.emoji} Trạng Thái: **${alreadyOwned ? 'Đã thu hồi' : 'Không sở hữu'}**`,
              profile.pets.active === null && alreadyOwned
                ? `${pet.emoji} Nếu Linh Thú này đang xuất chiến, hệ thống đã tự bỏ trạng thái active.`
                : null,
            ].filter(Boolean).join('\n'),
          });
        }

        if (!alreadyOwned) {
          profile.pets.owned[petId] = true;

          if (!profile.pets.active) {
            profile.pets.active = petId;
          }

          await saveCultivationProfile(interaction.client, profile);

          if (petId === 'thai_hu_tien_hac') {
            await announceThaiHuTienHacAcquisition(
              interaction.client,
              targetUser.id,
            );
          }
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
      const itemEmoji = getItemEmoji(item);

      if (revoke) {
        const current = Math.max(0, Number(profile.inventory?.[selectedId]) || 0);
        const changed = Math.min(current, quantity);
        const remaining = Math.max(0, current - changed);

        profile.inventory ||= {};
        if (remaining > 0) {
          profile.inventory[selectedId] = remaining;
        } else {
          delete profile.inventory[selectedId];
        }

        const saved = await saveCultivationProfile(interaction.client, profile);
        const currentQuantity = Math.max(
          0,
          Number(saved.inventory?.[selectedId]) || 0,
        );

        return interaction.editReply({
          content: [
            HEADER,
            '',
            `${userEmoji} Đạo Hữu: <@${targetUser.id}>`,
            `${itemEmoji} Vật Phẩm: **${item.name}**`,
            `${itemEmoji} Đã Thu Hồi: **×${changed}**`,
            `${itemEmoji} Hiện Có: **×${currentQuantity}**`,
          ].join('\n'),
        });
      }

      const added = addInventoryItem(profile, selectedId, quantity);
      if (!added) {
        return interaction.editReply({
          content: formatError('Không thể thêm vật phẩm vào Túi Đồ.'),
        });
      }

      const saved = await saveCultivationProfile(interaction.client, profile);
      const currentQuantity = Math.max(
        0,
        Number(saved.inventory?.[selectedId]) || 0,
      );

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
        `Lệnh quản lý dữ liệu Tiên Lộ bị lỗi: \`${error?.message || 'Unknown error'}\``,
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
