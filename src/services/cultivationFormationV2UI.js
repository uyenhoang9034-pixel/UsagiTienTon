import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';

import { CULTIVATION_CONFIG } from '../config/cultivationGame.js';
import {
  FORMATION_ELEMENTS,
  getActiveFormation,
  getFormationLayout,
  getFormationSlotLevels,
} from './cultivationFormation.js';
import {
  FORMATION_EMOJIS,
  FORMATION_RESOURCE_EMOJIS,
} from './cultivationFormationUI.js';

const TITLE_LEFT = '<a:trangtrig2:1546040703375904801>';
const TITLE_RIGHT = '<a:trangtrig3:1546040818261954610>';

function title(label) {
  return `${TITLE_LEFT} ${label} ${TITLE_RIGHT}`;
}

function style(embed) {
  embed.setColor(CULTIVATION_CONFIG.ui.color);
  embed.setFooter({ text: CULTIVATION_CONFIG.ui.footer });
  if (CULTIVATION_CONFIG.ui.image) embed.setImage(CULTIVATION_CONFIG.ui.image);
  return embed;
}

function rawEmojiId(raw) {
  const match = String(raw || '').match(/:(\d+)>$/);
  return match?.[1] || null;
}

function formationButton(ownerId, action, label, emoji) {
  return new ButtonBuilder()
    .setCustomId(`tutien_formation:${ownerId}:${action}`)
    .setLabel(label)
    .setEmoji(emoji)
    .setStyle(ButtonStyle.Secondary);
}

function resultLine(result, element) {
  if (!result) return null;

  if (result.ok && result.unchanged) {
    return '◈ Trận Vị này đã mang hệ thuộc tính đã chọn.';
  }

  if (result.ok && result.level) {
    return `${FORMATION_RESOURCE_EMOJIS.refine} **Tinh Luyện thành công:** Lv.${result.level}`;
  }

  if (result.ok) {
    return `${element?.emoji || '◈'} **Bố trí thành công:** ${element?.name || 'Hệ mới'}`;
  }

  if (result.reason === 'not_enough_essence') {
    return `${FORMATION_RESOURCE_EMOJIS.essence} Chưa đủ **Trận Văn**.`;
  }

  if (result.reason === 'not_enough_crystal') {
    return `${element?.emoji || '◈'} Chưa đủ **${element?.name || ''} Tinh Thạch**.`;
  }

  if (result.reason === 'max_level') {
    return `${FORMATION_RESOURCE_EMOJIS.refine} Trận Vị đã đạt **Lv.10**.`;
  }

  return 'Không thể thay đổi Trận Vị này.';
}

export function buildFormationSlotSelectRows(ownerId, state) {
  const formation = getActiveFormation(state);
  const layout = getFormationLayout(state, formation.id);
  const levels = getFormationSlotLevels(state, formation.id);

  const select = new StringSelectMenuBuilder()
    .setCustomId(`tutien_formation_v2:${ownerId}:slot`)
    .setPlaceholder('Chọn một Trận Vị để điều chỉnh')
    .addOptions(
      layout.map((elementId, index) => {
        const element = FORMATION_ELEMENTS[elementId];
        const option = new StringSelectMenuOptionBuilder()
          .setLabel(`Trận Vị ${index + 1} · ${element?.name || 'Trống'}`)
          .setDescription(`Cấp hiện tại: Lv.${levels[index]}`)
          .setValue(String(index));

        const emojiId = rawEmojiId(element?.emoji);
        if (emojiId) option.setEmoji({ id: emojiId });
        return option;
      }),
    );

  return [
    new ActionRowBuilder().addComponents(select),
    new ActionRowBuilder().addComponents(
      formationButton(ownerId, 'main', 'Trận Pháp', FORMATION_EMOJIS.formation),
    ),
  ];
}

export function buildFormationSlotDetailEmbed(state, slotIndex, result = null) {
  const formation = getActiveFormation(state);
  const layout = getFormationLayout(state, formation.id);
  const levels = getFormationSlotLevels(state, formation.id);
  const index = Math.max(0, Math.min(formation.slots - 1, Number(slotIndex) || 0));
  const elementId = layout[index];
  const element = FORMATION_ELEMENTS[elementId];
  const level = levels[index];
  const status = resultLine(result, FORMATION_ELEMENTS[result?.elementId] || element);

  return style(new EmbedBuilder()
    .setTitle(title(`Trận Vị ${index + 1}`))
    .setDescription([
      `<a:ttrando:1547820131889979464> **${formation.name}**`,
      '',
      `${element?.emoji || '◈'} **Thuộc tính:** ${element?.name || 'Trống'}`,
      `${FORMATION_RESOURCE_EMOJIS.refine} **Tinh Luyện:** Lv.${level}/10`,
      `${FORMATION_RESOURCE_EMOJIS.essence} **Trận Văn:** ${Number(state.formationEssence || 0).toLocaleString('vi-VN')}`,
      '',
      status ? `**Kết quả**\n${status}\n` : '',
      '*Chọn hệ mới bên dưới để thay đổi Trận Vị, hoặc Tinh Luyện để tăng cấp vị trí này.*',
    ].filter(Boolean).join('\n')));
}

export function buildFormationSlotDetailRows(ownerId, state, slotIndex) {
  const formation = getActiveFormation(state);
  const index = Math.max(0, Math.min(formation.slots - 1, Number(slotIndex) || 0));
  const layout = getFormationLayout(state, formation.id);
  const currentElementId = layout[index];

  const elementSelect = new StringSelectMenuBuilder()
    .setCustomId(`tutien_formation_v2:${ownerId}:element:${index}`)
    .setPlaceholder('Chọn hệ thuộc tính cho Trận Vị')
    .addOptions(
      Object.values(FORMATION_ELEMENTS).map((element) => {
        const option = new StringSelectMenuOptionBuilder()
          .setLabel(`${element.name}${element.id === currentElementId ? ' · Đang dùng' : ''}`)
          .setDescription(
            element.tier === 'rare'
              ? 'Hệ hiếm · 20 Trận Văn + 3 Tinh Thạch'
              : element.tier === 'variant'
                ? 'Hệ biến dị · 12 Trận Văn + 2 Tinh Thạch'
                : 'Hệ cơ bản · 6 Trận Văn + 1 Tinh Thạch',
          )
          .setValue(element.id);

        const emojiId = rawEmojiId(element.emoji);
        if (emojiId) option.setEmoji({ id: emojiId });
        return option;
      }),
    );

  return [
    new ActionRowBuilder().addComponents(elementSelect),
    new ActionRowBuilder().addComponents(
      formationButton(ownerId, `refine:${index}`, 'Tinh Luyện', FORMATION_EMOJIS.refine),
      formationButton(ownerId, 'slots', 'Trận Vị', FORMATION_EMOJIS.slots),
      formationButton(ownerId, 'main', 'Trận Pháp', FORMATION_EMOJIS.formation),
    ),
  ];
}
