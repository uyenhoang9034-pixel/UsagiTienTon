import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';

import {
  CULTIVATION_CONFIG,
} from '../config/cultivationGame.js';

import {
  CULTIVATION_PET_RARITY_ORDER,
  getCultivationPet,
  getCultivationPetList,
  getOwnedPets,
  ownsPet,
} from './cultivationPet.js';

const TITLE_LEFT = '<a:trangtrig2:1546040703375904801>';
const TITLE_RIGHT = '<a:trangtrig3:1546040818261954610>';
const OWNED_EMOJI = '<a:trangtrig31:1546905996893626440>';
const LOCKED_EMOJI = '<a:ttlinhthu2:1547478815452954654>';
const PET_BUTTON_EMOJI_ID = '1547305016694669503';

const RARITIES = [
  'Phàm',
  'Lương Phẩm',
  'Hiếm',
  'Cực Hiếm',
  'Thần Thoại',
  'Tiên Phẩm',
];

function title(label) {
  return `${TITLE_LEFT} ${label} ${TITLE_RIGHT}`;
}

function style(embed) {
  embed.setColor(CULTIVATION_CONFIG.ui.color);
  embed.setFooter({ text: CULTIVATION_CONFIG.ui.footer });

  if (CULTIVATION_CONFIG.ui.image) {
    embed.setImage(CULTIVATION_CONFIG.ui.image);
  }

  return embed;
}

function formatPercent(chance) {
  const percent = Math.max(0, Number(chance) || 0) * 100;

  if (percent >= 1) {
    return `${Number.isInteger(percent)
      ? percent
      : percent.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}%`;
  }

  if (percent >= 0.01) {
    return `${percent.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}%`;
  }

  if (percent <= 0) {
    return '0%';
  }

  return `${percent.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')}%`;
}

function getRarityPets(rarity) {
  return getCultivationPetList()
    .filter((pet) => pet.rarity === rarity)
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}

function rarityCount(profile, rarity) {
  const pets = getRarityPets(rarity);
  const owned = pets.filter((pet) => ownsPet(profile, pet.id)).length;
  return { owned, total: pets.length };
}

function progressBar(current, total, size = 16) {
  if (!total) return '░'.repeat(size);
  const filled = Math.max(0, Math.min(size, Math.round((current / total) * size)));
  return `${'█'.repeat(filled)}${'░'.repeat(size - filled)}`;
}

function backToPetButton(ownerId) {
  return new ButtonBuilder()
    .setCustomId(`tutien_action:${ownerId}:pet`)
    .setLabel('Linh Thú')
    .setEmoji(PET_BUTTON_EMOJI_ID)
    .setStyle(ButtonStyle.Secondary);
}

export function buildPetCodexEmbed(user, profile) {
  const allPets = getCultivationPetList();
  const owned = getOwnedPets(profile);
  const percentage = allPets.length > 0
    ? Math.round((owned.length / allPets.length) * 100)
    : 0;

  const rarityLines = RARITIES.map((rarity) => {
    const count = rarityCount(profile, rarity);
    return `• **${rarity}** · ${count.owned}/${count.total}`;
  });

  return style(
    new EmbedBuilder()
      .setTitle(title('LINH THÚ ĐỒ GIÁM'))
      .setDescription([
        '*Vạn thú hữu linh, hữu duyên tương ngộ.*',
        '',
        `**Đạo Hữu:** <@${user.id}>`,
        `${OWNED_EMOJI} **Đã thu phục:** ${owned.length}/${allPets.length}`,
        `\`${progressBar(owned.length, allPets.length)}\` **${percentage}%**`,
        '',
        '**Phân loại theo phẩm chất**',
        ...rarityLines,
        '',
        '*Chọn phẩm chất bên dưới để tra cứu Linh Thú.*',
      ].join('\n')),
  );
}

export function buildPetCodexRows(ownerId, profile) {
  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`tutien_pet_codex_rarity:${ownerId}`)
        .setPlaceholder('Chọn Phẩm Chất Linh Thú')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(
          RARITIES.map((rarity) => {
            const count = rarityCount(profile, rarity);
            return {
              label: rarity,
              value: rarity,
              description: `Đã thu phục ${count.owned}/${count.total}`,
            };
          }),
        ),
    ),
    new ActionRowBuilder().addComponents(
      backToPetButton(ownerId),
    ),
  ];
}

export function buildPetCodexRarityEmbed(profile, rarity) {
  const pets = getRarityPets(rarity);
  const lines = pets.map((pet) => {
    if (ownsPet(profile, pet.id)) {
      return `${OWNED_EMOJI} ${pet.emoji} **${pet.name}**`;
    }

    return `${LOCKED_EMOJI} ❔ **?????**`;
  });

  return style(
    new EmbedBuilder()
      .setTitle(title(`ĐỒ GIÁM · ${rarity.toUpperCase()}`))
      .setDescription([
        `${OWNED_EMOJI} **Đã thu phục** · ${LOCKED_EMOJI} **Chưa thu phục**`,
        '',
        ...lines,
        '',
        '*Chọn một Linh Thú để xem ghi chép trong Đồ Giám.*',
      ].join('\n')),
  );
}

export function buildPetCodexRarityRows(ownerId, profile, rarity) {
  const pets = getRarityPets(rarity);

  const petOptions = pets.map((pet, index) => {
    const owned = ownsPet(profile, pet.id);

    return {
      label: owned ? pet.name : `????? · ${index + 1}`,
      value: pet.id,
      description: owned
        ? `Đã thu phục · ${pet.effect}`.slice(0, 100)
        : 'Chưa thu phục',
    };
  });

  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`tutien_pet_codex_pet:${ownerId}:${rarity}`)
        .setPlaceholder(`Chọn Linh Thú · ${rarity}`)
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(petOptions),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tutien_pet_codex:${ownerId}`)
        .setLabel('Đồ Giám')
        .setEmoji(PET_BUTTON_EMOJI_ID)
        .setStyle(ButtonStyle.Secondary),
      backToPetButton(ownerId),
    ),
  ];
}

export function buildPetCodexDetailEmbed(profile, petId) {
  const pet = getCultivationPet(petId);

  if (!pet || !ownsPet(profile, petId)) {
    return style(
      new EmbedBuilder()
        .setTitle(title('?????'))
        .setDescription([
          `${LOCKED_EMOJI} **Chưa thu phục**`,
          '',
          '**Phẩm chất**',
          '?????',
          '',
          '**Hiệu ứng**',
          '?????',
          '',
          '**Tỷ lệ gặp**',
          '?????',
          '',
          '**Tỷ lệ thu phục**',
          '?????',
          '',
          '**Lore**',
          '*Dấu vết của Linh Thú này vẫn chưa được ghi lại trong Đồ Giám.*',
          '',
          '*Tiếp tục Thám Hiểm để tìm kiếm cơ duyên.*',
        ].join('\n')),
    );
  }

  const encounterText = pet.encounterEnabled === false
    ? 'Không xuất hiện tự nhiên'
    : formatPercent(pet.encounterChance);

  const captureText = pet.captureChance > 0
    ? formatPercent(pet.captureChance)
    : 'Không thể thu phục tự nhiên';

  return style(
    new EmbedBuilder()
      .setTitle(title(pet.name.toUpperCase()))
      .setDescription([
        `${OWNED_EMOJI} **Đã thu phục**`,
        '',
        `${pet.emoji} **${pet.name}**`,
        '',
        '**Phẩm chất**',
        pet.rarity,
        '',
        '**Hiệu ứng**',
        pet.effect,
        '',
        '**Tỷ lệ gặp**',
        encounterText,
        '',
        '**Tỷ lệ thu phục**',
        captureText,
        '',
        '**Lore**',
        `*${pet.description}*`,
        '',
        '*Đã ghi nhận trong Linh Thú Đồ Giám.*',
      ].join('\n')),
  );
}

export function buildPetCodexDetailRows(ownerId, rarity) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tutien_pet_codex_rarity_button:${ownerId}:${rarity}`)
        .setLabel(rarity)
        .setEmoji(PET_BUTTON_EMOJI_ID)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`tutien_pet_codex:${ownerId}`)
        .setLabel('Đồ Giám')
        .setEmoji(PET_BUTTON_EMOJI_ID)
        .setStyle(ButtonStyle.Secondary),
      backToPetButton(ownerId),
    ),
  ];
}

export function normalizePetCodexRarity(value) {
  return RARITIES.includes(value) ? value : null;
}

export function getPetCodexRarityForPet(petId) {
  return getCultivationPet(petId)?.rarity || null;
}

export function getPetCodexRarityOrder() {
  return [...RARITIES].sort(
    (a, b) =>
      (CULTIVATION_PET_RARITY_ORDER[a] || 0) -
      (CULTIVATION_PET_RARITY_ORDER[b] || 0),
  );
}
