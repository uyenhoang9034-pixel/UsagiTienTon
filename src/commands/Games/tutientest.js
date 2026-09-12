import {
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';

import {
  CULTIVATION_CONFIG,
} from '../../config/cultivationGame.js';

const TUTIEN_ADMIN_ROLE_ID =
  '1541303749916754001';

const ADVENTURE_SESSION_PREFIX =
  'games:cultivation:adventureV2:';

const PETS = [
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
];

const TEST_PETS = Object.fromEntries(
  PETS.map(([label, id]) => [
    `pet_${id}`,
    { id, label },
  ]),
);

const FORMATION_SPIRIT_TEST_PETS = Object.fromEntries(
  PETS.map(([label, id]) => [
    `formation_spirit_${id}`,
    { id, label },
  ]),
);

const TEST_EVENT_CHOICES = [
  { name: 'Thương Nhân Thần Bí', value: 'merchant' },
  { name: 'Thiên Đạo Cơ Duyên', value: 'heavenly_fortune' },
  ...PETS.map(([name, id]) => ({
    name: `Linh Thú · ${name}`,
    value: `pet_${id}`,
  })),
  { name: 'Trận Linh · Tắt Linh Thú', value: 'formation_spirit_none' },
  ...PETS.map(([name, id]) => ({
    name: `Trận Linh · ${name}`,
    value: `formation_spirit_${id}`,
  })),
];

function normalizeSearch(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getAdventureSessionKey(guildId, userId) {
  return `${ADVENTURE_SESSION_PREFIX}${guildId}:${userId}`;
}

async function loadAdventureBase() {
  return import('../../services/cultivationAdventureV2.js');
}

async function loadAdventure294() {
  return import('../../services/cultivationAdventureV294.js');
}

async function loadAdventure294UI() {
  return import('../../services/cultivationAdventureV294UI.js');
}

async function loadAdventure295UI() {
  return import('../../services/cultivationAdventureV295UI.js');
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

  const pet = petService.getCultivationPet(petId);

  if (!pet) {
    return { ok: false, reason: 'invalid_pet' };
  }

  const profile = await service.getCultivationProfile(
    client,
    guildId,
    userId,
  );

  petService.ensurePetData(profile);

  const newlyGranted = profile.pets.owned[petId] !== true;
  profile.pets.owned[petId] = true;
  profile.pets.active = petId;

  const saved = await service.saveCultivationProfile(
    client,
    profile,
  );

  if (newlyGranted && petId === 'thai_hu_tien_hac') {
    await petService.announceThaiHuTienHacAcquisition(
      client,
      userId,
    );
  }

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

  petService.ensurePetData(profile);
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
  const now = Date.now();
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
    getAdventureSessionKey(guildId, userId),
    session,
  );

  return session;
}

async function clearAdventureSession(
  client,
  guildId,
  userId,
) {
  const { clearAdventureV2Session } = await loadAdventureBase();
  return clearAdventureV2Session(client, guildId, userId);
}

async function createForcedPavilionSession(
  client,
  guildId,
  userId,
) {
  await clearAdventureSession(client, guildId, userId);

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
  await clearAdventureSession(client, guildId, userId);

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
  ).slice(0, 1800);
}

async function replyEphemeral(interaction, content) {
  return interaction.reply({
    content,
    flags: MessageFlags.Ephemeral,
  });
}

async function editError(interaction, error) {
  const message = formatError(error);

  if (interaction.deferred || interaction.replied) {
    return interaction.editReply({
      content: `❌ **Lỗi khi test Tiên Lộ:**\n\`\`\`js\n${message}\n\`\`\``,
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
      .setName('tutientest')
      .setDescription('GM: Ép event để test hệ thống Thám Hiểm Tiên Lộ.')
      .addStringOption(
        (option) =>
          option
            .setName('event')
            .setDescription('Chọn event muốn test.')
            .setRequired(true)
            .setAutocomplete(true),
      ),

  category: 'Games',

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused(true);

    if (focused.name !== 'event') {
      return interaction.respond([]);
    }

    const query = normalizeSearch(focused.value);
    const choices = TEST_EVENT_CHOICES
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
        return replyEphemeral(
          interaction,
          'Lệnh này chỉ có thể sử dụng trong server.',
        );
      }

      const hasAdminRole = interaction.member
        ?.roles
        ?.cache
        ?.has(TUTIEN_ADMIN_ROLE_ID);

      if (!hasAdminRole) {
        return replyEphemeral(
          interaction,
          'Bạn không có quyền sử dụng lệnh test Tiên Lộ.',
        );
      }

      if (
        CULTIVATION_CONFIG.channelId &&
        interaction.channelId !== CULTIVATION_CONFIG.channelId
      ) {
        return replyEphemeral(
          interaction,
          `Tiên Lộ chỉ mở tại <#${CULTIVATION_CONFIG.channelId}>.`,
        );
      }

      const client = interaction.client;

      if (!client?.db) {
        return replyEphemeral(
          interaction,
          'Database chưa sẵn sàng, thử lại sau vài giây nhé.',
        );
      }

      const event = interaction.options.getString('event', true);
      const guildId = interaction.guildId;
      const userId = interaction.user.id;

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

      const formationSpiritPet = FORMATION_SPIRIT_TEST_PETS[event];

      if (formationSpiritPet) {
        const result = await activateFormationSpiritTestPet(
          client,
          guildId,
          userId,
          formationSpiritPet.id,
        );

        if (!result.ok) {
          return interaction.editReply({
            content: `❌ Không thể kích hoạt Trận Linh test: \`${result.reason || 'unknown'}\``,
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

      if (event === 'merchant') {
        const { startAdventureMerchant } = await loadAdventure294();
        const {
          buildAdventureMerchantEmbed,
          buildAdventureMerchantRows,
        } = await loadAdventure294UI();

        await createForcedPavilionSession(client, guildId, userId);

        const result = await startAdventureMerchant(
          client,
          guildId,
          userId,
        );

        if (!result.ok) {
          await clearAdventureSession(client, guildId, userId);
          return interaction.editReply({
            content: `❌ Không thể tạo Merchant test: \`${result.reason || 'unknown'}\``,
            embeds: [],
            components: [],
          });
        }

        return interaction.editReply({
          embeds: [buildAdventureMerchantEmbed(result)],
          components: buildAdventureMerchantRows(userId, result.stock),
        });
      }

      if (event === 'heavenly_fortune') {
        const { resolveHeavenlyFortune } = await loadAdventure294();
        const {
          buildHeavenlyFortuneEmbed,
          buildAdventureV294BackRows,
        } = await loadAdventure294UI();

        await createForcedPavilionSession(client, guildId, userId);

        const result = await resolveHeavenlyFortune(
          client,
          guildId,
          userId,
        );

        if (!result.ok) {
          await clearAdventureSession(client, guildId, userId);
          return interaction.editReply({
            content: `❌ Không thể tạo Thiên Đạo Cơ Duyên test: \`${result.reason || 'unknown'}\``,
            embeds: [],
            components: [],
          });
        }

        return interaction.editReply({
          embeds: [buildHeavenlyFortuneEmbed(result)],
          components: buildAdventureV294BackRows(userId),
        });
      }

      const testPet = TEST_PETS[event];

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
          embeds: [buildAdventurePetUnknownEmbed()],
          components: buildAdventurePetUnknownRows(userId),
        });
      }

      return interaction.editReply({
        content: 'Không tìm thấy event test tương ứng.',
        embeds: [],
        components: [],
      });
    } catch (error) {
      console.error('[TU TIEN TEST ERROR]', error);
      return editError(interaction, error);
    }
  },
};
