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
  CULTIVATION_FORGE_QUANTITIES,
  getEquipment,
  getEquipmentList,
  getEquippedEquipment,
  getOreQuantity,
  getOwnedEquipment,
} from './cultivationEquipment.js';

const SEPARATOR = '꒷꒦︶꒷꒦︶ ๋ ࣭ ⭑꒷꒦';
const FORGE_BUTTON_EMOJI = { id: CULTIVATION_CONFIG.ui.buttonEmojis.forge };
const EQUIPMENT_BUTTON_EMOJI = { id: CULTIVATION_CONFIG.ui.buttonEmojis.equipment };
const USER_EMOJI = CULTIVATION_CONFIG.ui.emojis.user;
const ORE_EMOJI = CULTIVATION_CONFIG.ui.emojis.ore;
const FURNACE_EMOJI = CULTIVATION_CONFIG.ui.emojis.furnace;

function styleEmbed(embed) {
  embed.setColor(CULTIVATION_CONFIG.ui.color);
  embed.setFooter({ text: CULTIVATION_CONFIG.ui.footer });
  if (CULTIVATION_CONFIG.ui.image) {
    embed.setImage(CULTIVATION_CONFIG.ui.image);
  }
  return embed;
}

function percent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

function number(value) {
  return new Intl.NumberFormat('vi-VN').format(
    Math.max(0, Math.round(Number(value) || 0)),
  );
}

export function buildForgeEmbed(user, profile) {
  const ore = getOreQuantity(profile);
  const equipmentLines = getEquipmentList()
    .map((item) => [
      `${item.emoji} **${item.name}**`,
      `Cần: **${item.ingredientAmount} Huyền Thiết / lần**`,
      `Tỷ Lệ Thành Công: **${percent(item.successChance)}**`,
      `Hiệu Quả: **${item.effect}**`,
      '*Mỗi pháp khí thành công = 1 lượt sử dụng hiệu quả.*',
    ].join('\n'))
    .join('\n\n');

  return styleEmbed(
    new EmbedBuilder()
      .setTitle(`${FURNACE_EMOJI} LUYỆN KHÍ PHƯỜNG · 炼器`)
      .setDescription([
        `${USER_EMOJI} **Đạo Hữu**: <@${user.id}>`,
        '',
        SEPARATOR,
        '',
        `${ORE_EMOJI} **Khoáng Vật Hiện Có**`,
        `Huyền Thiết: **${number(ore)}**`,
        '',
        '**Pháp Khí Có Thể Luyện**',
        '',
        equipmentLines,
        '',
        '*Có thể luyện theo mẻ ×1, ×10, ×100 hoặc ×1000; mỗi lần trong mẻ roll thành công độc lập.*',
      ].join('\n')),
  );
}

export function buildForgeRows(ownerId) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`tutien_equipment_select:${ownerId}`)
    .setPlaceholder('Chọn Pháp Khí muốn luyện')
    .addOptions(
      getEquipmentList().map((item) => ({
        label: item.name,
        value: item.id,
        description: `Cần ${item.ingredientAmount} Huyền Thiết/lần · ${percent(item.successChance)}`.slice(0, 100),
      })),
    );

  return [
    new ActionRowBuilder().addComponents(menu),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tutien_action:${ownerId}:equipment`)
        .setLabel('Pháp Khí')
        .setEmoji(EQUIPMENT_BUTTON_EMOJI)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`tutien_action:${ownerId}:dashboard`)
        .setLabel('Quay lại Tiên Lộ')
        .setEmoji(FORGE_BUTTON_EMOJI)
        .setStyle(ButtonStyle.Secondary),
    ),
  ];
}

export function buildForgeConfirmEmbed(user, profile, equipmentId) {
  const equipment = getEquipment(equipmentId);
  if (!equipment) {
    return styleEmbed(
      new EmbedBuilder().setTitle('KHÔNG TÌM THẤY PHÁP KHÍ'),
    );
  }

  const ore = getOreQuantity(profile);

  return styleEmbed(
    new EmbedBuilder()
      .setTitle(`${FURNACE_EMOJI} LUYỆN ${equipment.name.toUpperCase()}`)
      .setDescription([
        `${equipment.emoji} **${equipment.name}**`,
        '',
        `${ORE_EMOJI} **Huyền Thiết**: ${number(ore)}`,
        `${ORE_EMOJI} **Cần mỗi lần**: ${number(equipment.ingredientAmount)}`,
        `**Tỷ Lệ Thành Công mỗi lần**: ${percent(equipment.successChance)}`,
        '',
        '**Chọn số lượng luyện:**',
        ...CULTIVATION_FORGE_QUANTITIES.map(
          (quantity) => `×${quantity} — cần **${number(equipment.ingredientAmount * quantity)}** Huyền Thiết`,
        ),
        '',
        SEPARATOR,
        '',
        '**Hiệu Quả**',
        equipment.effect,
        '',
        '*Pháp Khí nay là vật phẩm tiêu hao: mỗi lần hiệu quả thực sự kích hoạt sẽ tiêu 1 chiếc. Hết số lượng sẽ tự tháo trang bị.*',
      ].join('\n')),
  );
}

export function buildForgeConfirmRows(ownerId, equipmentId) {
  return [
    new ActionRowBuilder().addComponents(
      ...CULTIVATION_FORGE_QUANTITIES.map((quantity) =>
        new ButtonBuilder()
          .setCustomId(`tutien_craft:${ownerId}:forge:${equipmentId}:${quantity}`)
          .setLabel(`Luyện ×${quantity}`)
          .setEmoji(FORGE_BUTTON_EMOJI)
          .setStyle(ButtonStyle.Success),
      ),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tutien_action:${ownerId}:forge`)
        .setLabel('Quay lại')
        .setEmoji(FORGE_BUTTON_EMOJI)
        .setStyle(ButtonStyle.Secondary),
    ),
  ];
}

export function buildForgeResultEmbed(result) {
  if (!result.ok && result.reason === 'not_enough_material') {
    return styleEmbed(
      new EmbedBuilder()
        .setTitle(`${FURNACE_EMOJI} HUYỀN THIẾT KHÔNG ĐỦ`)
        .setDescription([
          '**KHÔNG THỂ KHAI LÒ**',
          `Đạo hữu muốn luyện **×${number(result.quantity)}** nhưng khoáng vật chưa đủ.`,
          '',
          SEPARATOR,
          '',
          `${ORE_EMOJI} **Hiện Có**: ${number(result.available)}`,
          `${ORE_EMOJI} **Cần**: ${number(result.requiredMaterial)}`,
        ].join('\n')),
    );
  }

  if (!result.ok) {
    return styleEmbed(
      new EmbedBuilder()
        .setTitle(`${FURNACE_EMOJI} LUYỆN KHÍ KHÔNG THÀNH`)
        .setDescription('Không thể tiến hành luyện khí.'),
    );
  }

  return styleEmbed(
    new EmbedBuilder()
      .setTitle(`${FURNACE_EMOJI} KHAI LÒ HOÀN TẤT`)
      .setDescription([
        `${result.equipment.emoji} **${result.equipment.name}**`,
        '',
        `Đã luyện: **×${number(result.quantity)}**`,
        `Thành công: **×${number(result.successCount)}**`,
        `Thất bại: **×${number(result.failCount)}**`,
        `${result.equipment.emoji} Nhận được: **×${number(result.successCount)} lượt sử dụng**`,
        `${ORE_EMOJI} Huyền Thiết tiêu hao: **-${number(result.consumed)}**`,
        `${ORE_EMOJI} Còn lại: **${number(result.remainingOre)}**`,
        '',
        '*Mỗi pháp khí thành công sẽ được tiêu 1 chiếc khi hiệu quả của nó thực sự kích hoạt.*',
      ].join('\n')),
  );
}

export function buildForgeResultRows(ownerId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tutien_action:${ownerId}:forge`)
        .setLabel('Tiếp tục Luyện Khí')
        .setEmoji(FORGE_BUTTON_EMOJI)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`tutien_action:${ownerId}:equipment`)
        .setLabel('Pháp Khí')
        .setEmoji(EQUIPMENT_BUTTON_EMOJI)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`tutien_action:${ownerId}:dashboard`)
        .setLabel('Tiên Lộ')
        .setEmoji(FORGE_BUTTON_EMOJI)
        .setStyle(ButtonStyle.Secondary),
    ),
  ];
}

export function buildEquipmentEmbed(user, profile) {
  const owned = getOwnedEquipment(profile);
  const equipped = getEquippedEquipment(profile);

  const ownedText = owned.length
    ? owned.map((item) => {
        const quantity = profile.equipment?.owned?.[item.id] || 0;
        const active = equipped?.id === item.id ? ' · **Đang Trang Bị**' : '';
        return [
          `${item.emoji} **${item.name}** · **${number(quantity)} lượt**${active}`,
          `└ ${item.effect}`,
        ].join('\n');
      }).join('\n\n')
    : '*Chưa sở hữu Pháp Khí nào.*';

  return styleEmbed(
    new EmbedBuilder()
      .setTitle('PHÁP KHÍ · 法器')
      .setDescription([
        `${USER_EMOJI} **Đạo Hữu**: <@${user.id}>`,
        '',
        '**Pháp Khí Đang Trang Bị**',
        equipped
          ? `${equipped.emoji} **${equipped.name}** · còn **${number(profile.equipment?.owned?.[equipped.id] || 0)} lượt**`
          : '**Chưa Trang Bị**',
        '',
        SEPARATOR,
        '',
        '**Pháp Khí Sở Hữu / Lượt Còn Lại**',
        ownedText,
        '',
        '*Giống Đan Dược và Phù, Pháp Khí là vật phẩm tiêu hao. Mỗi lần hiệu quả kích hoạt sẽ mất 1 lượt; về 0 sẽ tự tháo.*',
      ].join('\n')),
  );
}

export function buildEquipmentRows(ownerId, profile) {
  const owned = getOwnedEquipment(profile);
  const rows = [];

  if (owned.length > 0) {
    rows.push(
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(`tutien_equip_select:${ownerId}`)
          .setPlaceholder('Chọn Pháp Khí để trang bị')
          .addOptions(
            owned.map((item) => ({
              label: item.name,
              value: item.id,
              description: `${item.effect} · ${number(profile.equipment?.owned?.[item.id] || 0)} lượt`.slice(0, 100),
            })),
          ),
      ),
    );
  }

  rows.push(
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tutien_action:${ownerId}:forge`)
        .setLabel('Luyện Khí')
        .setEmoji(FORGE_BUTTON_EMOJI)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`tutien_action:${ownerId}:dashboard`)
        .setLabel('Quay lại Tiên Lộ')
        .setEmoji(EQUIPMENT_BUTTON_EMOJI)
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  return rows;
}

export function buildEquipResultEmbed(result) {
  if (!result.ok) {
    return styleEmbed(
      new EmbedBuilder()
        .setTitle('KHÔNG THỂ TRANG BỊ')
        .setDescription('Đạo hữu chưa sở hữu Pháp Khí này.'),
    );
  }

  const remaining = result.profile.equipment?.owned?.[result.equipment.id] || 0;

  return styleEmbed(
    new EmbedBuilder()
      .setTitle('PHÁP KHÍ NHẬN CHỦ')
      .setDescription([
        `${result.equipment.emoji} Đã trang bị **${result.equipment.name}**`,
        `Số lượt hiện có: **${number(remaining)}**`,
        '',
        SEPARATOR,
        '',
        '**Hiệu Quả**',
        result.equipment.effect,
        '',
        '*Mỗi lần hiệu quả kích hoạt sẽ tiêu 1 pháp khí.*',
      ].join('\n')),
  );
}
