import {
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';

import {
  CULTIVATION_CONFIG,
} from '../../config/cultivationGame.js';

/**
 * =========================================================
 * TU TIÊN TEST · GM COMMAND
 * =========================================================
 *
 * Lệnh test nội bộ cho Tiên Lộ.
 *
 * File này cố tình lazy-import các module Thám Hiểm.
 * Như vậy nếu một module adventure bị lỗi nhỏ,
 * bot vẫn không chết ngay lúc load toàn bộ command.
 */

const TUTIEN_ADMIN_ROLE_ID =
  '1541303749916754001';

const ADVENTURE_SESSION_PREFIX =
  'games:cultivation:adventureV2:';

const TEST_PETS = {
  pet_thanh_phong_linh_ho: {
    id: 'thanh_phong_linh_ho',
    label: 'Thanh Phong Linh Hồ',
  },

  pet_xich_viem_hoa_dieu: {
    id: 'xich_viem_hoa_dieu',
    label: 'Xích Viêm Hỏa Điểu',
  },

  pet_huyen_giap_linh_quy: {
    id: 'huyen_giap_linh_quy',
    label: 'Huyền Giáp Linh Quy',
  },

  pet_thien_loi_bach_ho: {
    id: 'thien_loi_bach_ho',
    label: 'Thiên Lôi Bạch Hổ',
  },

  pet_hau_tho_kim_long: {
    id: 'hau_tho_kim_long',
    label: 'Hậu Thổ Kim Long',
  },

  pet_tam_linh_mieu: {
    id: 'tam_linh_mieu',
    label: 'Tầm Linh Miêu',
  },

  pet_nguyet_quang_linh_tho: {
    id: 'nguyet_quang_linh_tho',
    label: 'Nguyệt Quang Linh Thố',
  },

  pet_han_ngoc_linh_xa: {
    id: 'han_ngoc_linh_xa',
    label: 'Hàn Ngọc Linh Xà',
  },

  pet_u_minh_huyen_xa: {
    id: 'u_minh_huyen_xa',
    label: 'U Minh Huyền Xà',
  },

  pet_bach_giac_linh_loc: {
    id: 'bach_giac_linh_loc',
    label: 'Bạch Giác Linh Lộc',
  },

  pet_thai_am_cuu_vi_ho: {
    id: 'thai_am_cuu_vi_ho',
    label: 'Thái Âm Cửu Vĩ Hồ',
  },

  pet_tu_dien_ky_lan: {
    id: 'tu_dien_ky_lan',
    label: 'Tử Điện Kỳ Lân',
  },

  pet_niet_ban_phuong_hoang: {
    id: 'niet_ban_phuong_hoang',
    label: 'Niết Bàn Phượng Hoàng',
  },

  pet_bach_vu_phong_lang: {
    id: 'bach_vu_phong_lang',
    label: 'Bạch Vũ Phong Lang',
  },

  pet_hu_khong_con_bang: {
    id: 'hu_khong_con_bang',
    label: 'Hư Không Côn Bằng',
  },
};

const FORMATION_SPIRIT_TEST_PETS = {
  formation_spirit_thanh_phong_linh_ho: TEST_PETS.pet_thanh_phong_linh_ho,
  formation_spirit_xich_viem_hoa_dieu: TEST_PETS.pet_xich_viem_hoa_dieu,
  formation_spirit_huyen_giap_linh_quy: TEST_PETS.pet_huyen_giap_linh_quy,
  formation_spirit_thien_loi_bach_ho: TEST_PETS.pet_thien_loi_bach_ho,
  formation_spirit_hau_tho_kim_long: TEST_PETS.pet_hau_tho_kim_long,
};

function getAdventureSessionKey(
  guildId,
  userId,
) {
  return `${ADVENTURE_SESSION_PREFIX}${guildId}:${userId}`;
}

async function loadAdventureBase() {
  return import(
    '../../services/cultivationAdventureV2.js'
  );
}

async function loadAdventure294() {
  return import(
    '../../services/cultivationAdventureV294.js'
  );
}

async function loadAdventure294UI() {
  return import(
    '../../services/cultivationAdventureV294UI.js'
  );
}

async function loadAdventure295UI() {
  return import(
    '../../services/cultivationAdventureV295UI.js'
  );
}

async function activateFormationSpiritTestPet(
  client,
  guildId,
  userId,
  petId,
) {
  const [service, petService] = await Promise.all([
    import('../../services/cultivationService.js'),
    import('../../services/cultivationPet.js'),
  ]);

  const pet = petService.getCultivationPet(
    petId,
  );

  if (!pet) {
    return {
      ok: false,
      reason: 'invalid_pet',
    };
  }

  const profile = await service.getCultivationProfile(
    client,
    guildId,
    userId,
  );

  petService.ensurePetData(
    profile,
  );

  const newlyGranted =
    profile.pets.owned[petId] !== true;

  profile.pets.owned[petId] = true;
  profile.pets.active = petId;

  const saved = await service.saveCultivationProfile(
    client,
    profile,
  );

  return {
    ok: true,
    pet,
    profile: saved,
    newlyGranted,
  };
}

async function clearFormationSpiritTestPet(
  client,
  guildId,
  userId,
) {
  const [service, petService] = await Promise.all([
    import('../../services/cultivationService.js'),
    import('../../services/cultivationPet.js'),
  ]);

  const profile = await service.getCultivationProfile(
    client,
    guildId,
    userId,
  );

  petService.ensurePetData(
    profile,
  );

  profile.pets.active = null;

  return service.saveCultivationProfile(
    client,
    profile,
  );
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
    version: 1,
    guildId,
    userId,
    monster: null,
    createdAt: now,
    updatedAt: now,
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

async function clearAdventureSession(
  client,
  guildId,
  userId,
) {
  const {
    clearAdventureV2Session,
  } = await loadAdventureBase();

  return clearAdventureV2Session(
    client,
    guildId,
    userId,
  );
}

async function createForcedPavilionSession(
  client,
  guildId,
  userId,
) {
  await clearAdventureSession(
    client,
    guildId,
    userId,
  );

  return setAdventureSession(
    client,
    guildId,
    userId,
    {
      locationId: 'dao_hoa_coc',
      state: 'location',
    },
  );
}

async function createForcedPetSession(
  client,
  guildId,
  userId,
  petId,
) {
  await clearAdventureSession(
    client,
    guildId,
    userId,
  );

  return setAdventureSession(
    client,
    guildId,
    userId,
    {
      locationId: 'loi_vuc',
      state: 'pet_encounter',
      petEncounter: {
        petId,
        revealed: false,
        testMode: true,
        createdAt: Date.now(),
      },
    },
  );
}

function formatError(error) {
  return String(
    error?.stack ||
      error?.message ||
      error ||
      'Unknown error',
  ).slice(
    0,
    1800,
  );
}

async function replyEphemeral(
  interaction,
  content,
) {
  return interaction.reply({
    content,
    flags: MessageFlags.Ephemeral,
  });
}

async function editError(
  interaction,
  error,
) {
  const message =
    formatError(
      error,
    );

  if (
    interaction.deferred ||
    interaction.replied
  ) {
    return interaction.editReply({
      content:
        `❌ **Lỗi khi test Tiên Lộ:**\n\`\`\`js\n${message}\n\`\`\``,
      embeds: [],
      components: [],
    });
  }

  return replyEphemeral(
    interaction,
    `❌ **Lỗi khi test Tiên Lộ:**\n\`\`\`js\n${message}\n\`\`\``,
  );
}

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
        (option) =>
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
              { name: 'Thương Nhân Thần Bí', value: 'merchant' },
              { name: 'Thiên Đạo Cơ Duyên', value: 'heavenly_fortune' },
              { name: 'Thanh Phong Linh Hồ', value: 'pet_thanh_phong_linh_ho' },
              { name: 'Xích Viêm Hỏa Điểu', value: 'pet_xich_viem_hoa_dieu' },
              { name: 'Huyền Giáp Linh Quy', value: 'pet_huyen_giap_linh_quy' },
              { name: 'Thiên Lôi Bạch Hổ', value: 'pet_thien_loi_bach_ho' },
              { name: 'Hậu Thổ Kim Long', value: 'pet_hau_tho_kim_long' },
              { name: 'Tầm Linh Miêu', value: 'pet_tam_linh_mieu' },
              { name: 'Nguyệt Quang Linh Thố', value: 'pet_nguyet_quang_linh_tho' },
              { name: 'Hàn Ngọc Linh Xà', value: 'pet_han_ngoc_linh_xa' },
              { name: 'U Minh Huyền Xà', value: 'pet_u_minh_huyen_xa' },
              { name: 'Bạch Giác Linh Lộc', value: 'pet_bach_giac_linh_loc' },
              { name: 'Thái Âm Cửu Vĩ Hồ', value: 'pet_thai_am_cuu_vi_ho' },
              { name: 'Tử Điện Kỳ Lân', value: 'pet_tu_dien_ky_lan' },
              { name: 'Niết Bàn Phượng Hoàng', value: 'pet_niet_ban_phuong_hoang' },
              { name: 'Bạch Vũ Phong Lang', value: 'pet_bach_vu_phong_lang' },
              { name: 'Hư Không Côn Bằng', value: 'pet_hu_khong_con_bang' },
              { name: 'Trận Linh · Tắt Linh Thú', value: 'formation_spirit_none' },
              { name: 'Trận Linh · Thanh Phong Linh Hồ', value: 'formation_spirit_thanh_phong_linh_ho' },
              { name: 'Trận Linh · Xích Viêm Hỏa Điểu', value: 'formation_spirit_xich_viem_hoa_dieu' },
              { name: 'Trận Linh · Huyền Giáp Linh Quy', value: 'formation_spirit_huyen_giap_linh_quy' },
              { name: 'Trận Linh · Thiên Lôi Bạch Hổ', value: 'formation_spirit_thien_loi_bach_ho' },
              { name: 'Trận Linh · Hậu Thổ Kim Long', value: 'formation_spirit_hau_tho_kim_long' },
            ),
      ),

  category: 'Games',

  async execute(
    interaction,
  ) {
    try {
      if (
        !interaction.guildId ||
        !interaction.guild
      ) {
        return replyEphemeral(
          interaction,
          'Lệnh này chỉ có thể sử dụng trong server.',
        );
      }

      const hasAdminRole =
        interaction.member
          ?.roles
          ?.cache
          ?.has(
            TUTIEN_ADMIN_ROLE_ID,
          );

      if (!hasAdminRole) {
        return replyEphemeral(
          interaction,
          'Bạn không có quyền sử dụng lệnh test Tiên Lộ.',
        );
      }

      if (
        CULTIVATION_CONFIG.channelId &&
        interaction.channelId !==
          CULTIVATION_CONFIG.channelId
      ) {
        return replyEphemeral(
          interaction,
          `Tiên Lộ chỉ mở tại <#${CULTIVATION_CONFIG.channelId}>.`,
        );
      }

      const client =
        interaction.client;

      if (!client?.db) {
        return replyEphemeral(
          interaction,
          'Database chưa sẵn sàng, thử lại sau vài giây nhé.',
        );
      }

      const event =
        interaction.options.getString(
          'event',
          true,
        );

      const guildId =
        interaction.guildId;

      const userId =
        interaction.user.id;

      await interaction.deferReply();

      if (event === 'formation_spirit_none') {
        await clearFormationSpiritTestPet(
          client,
          guildId,
          userId,
        );

        return interaction.editReply({
          content: [
            '<a:ttconghuong:1547830051951738960> **TRẬN LINH · GM TEST**',
            '',
            'Đã **tắt Linh Thú đang kích hoạt** để test baseline không có Trận Linh.',
            '• Linh Thú đã sở hữu vẫn được giữ nguyên.',
            '• Mở `/tutien` → **Trận Pháp** để so sánh Cộng Hưởng.',
          ].join('\n'),
          embeds: [],
          components: [],
        });
      }

      const formationSpiritPet =
        FORMATION_SPIRIT_TEST_PETS[event];

      if (formationSpiritPet) {
        const result =
          await activateFormationSpiritTestPet(
            client,
            guildId,
            userId,
            formationSpiritPet.id,
          );

        if (!result.ok) {
          return interaction.editReply({
            content:
              `❌ Không thể kích hoạt Trận Linh test: \`${result.reason || 'unknown'}\``,
            embeds: [],
            components: [],
          });
        }

        return interaction.editReply({
          content: [
            '<a:ttconghuong:1547830051951738960> **TRẬN LINH · GM TEST**',
            '',
            `${result.pet.emoji || ''} Đã kích hoạt **${result.pet.name}** làm Linh Thú hiện hành.`,
            result.newlyGranted
              ? '• Linh Thú chưa sở hữu trước đó nên đã được **cấp vào hồ sơ**.'
              : '• Linh Thú đã có sẵn trong hồ sơ.',
            '• Mở `/tutien` → **Trận Pháp** để kiểm tra Cộng Hưởng Trận Linh.',
          ].join('\n'),
          embeds: [],
          components: [],
        });
      }

      if (
        event === 'merchant'
      ) {
        const {
          startAdventureMerchant,
        } = await loadAdventure294();

        const {
          buildAdventureMerchantEmbed,
          buildAdventureMerchantRows,
        } = await loadAdventure294UI();

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
          await clearAdventureSession(
            client,
            guildId,
            userId,
          );

          return interaction.editReply({
            content:
              `❌ Không thể tạo Merchant test: \`${result.reason || 'unknown'}\``,
            embeds: [],
            components: [],
          });
        }

        return interaction.editReply({
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

      if (
        event === 'heavenly_fortune'
      ) {
        const {
          resolveHeavenlyFortune,
        } = await loadAdventure294();

        const {
          buildHeavenlyFortuneEmbed,
          buildAdventureV294BackRows,
        } = await loadAdventure294UI();

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
          await clearAdventureSession(
            client,
            guildId,
            userId,
          );

          return interaction.editReply({
            content:
              `❌ Không thể tạo Thiên Đạo Cơ Duyên test: \`${result.reason || 'unknown'}\``,
            embeds: [],
            components: [],
          });
        }

        return interaction.editReply({
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

      const testPet =
        TEST_PETS[event];

      if (testPet) {
        const {
          buildAdventurePetUnknownEmbed,
          buildAdventurePetUnknownRows,
        } = await loadAdventure295UI();

        await createForcedPetSession(
          client,
          guildId,
          userId,
          testPet.id,
        );

        return interaction.editReply({
          embeds: [
            buildAdventurePetUnknownEmbed(),
          ],

          components:
            buildAdventurePetUnknownRows(
              userId,
            ),
        });
      }

      return interaction.editReply({
        content:
          'Không tìm thấy event test tương ứng.',
        embeds: [],
        components: [],
      });
    } catch (error) {
      console.error(
        '[TU TIEN TEST ERROR]',
        error,
      );

      return editError(
        interaction,
        error,
      );
    }
  },
};
