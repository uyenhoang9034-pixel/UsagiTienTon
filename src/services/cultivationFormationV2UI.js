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
  FORMATION_EYE_ELEMENT_IDS,
  MAX_EYE_LEVEL,
  MAX_SLOT_LEVEL,
  getActiveFormation,
  getFormationEye,
  getFormationLayout,
  getFormationLevel,
  getFormationSlotLevels,
  getFormationUpgradeCost,
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

function number(value) {
  return Number(value || 0).toLocaleString('vi-VN');
}

function rawEmojiId(raw) {
  const match = String(raw || '').match(/:(\d+)>$/);
  return match?.[1] || null;
}

function formationButton(ownerId, action, label, emoji, disabled = false) {
  return new ButtonBuilder()
    .setCustomId(`tutien_formation:${ownerId}:${action}`)
    .setLabel(label)
    .setEmoji(emoji)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(disabled);
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
    return `${FORMATION_RESOURCE_EMOJIS.essence} Chưa đủ **Trận Văn**. Cần **${number(result.essenceCost)}**.`;
  }
  if (result.reason === 'not_enough_crystal') {
    return `${element?.emoji || '◈'} Chưa đủ **${element?.name || ''} Tinh Thạch**. Cần **${number(result.crystalCost)}**.`;
  }
  if (result.reason === 'formation_level_gate') {
    return `🔒 Cần nâng **Trận Đồ lên Lv.${number(result.requiredFormationLevel)}** trước.`;
  }
  if (result.reason === 'max_level') {
    return `${FORMATION_RESOURCE_EMOJIS.refine} Trận Vị đã đạt **Lv.${MAX_SLOT_LEVEL}**.`;
  }
  return 'Không thể thay đổi Trận Vị này.';
}

function eyeResultLine(result, element) {
  if (!result) return null;

  if (result.ok && result.unchanged) {
    return `${element?.emoji || FORMATION_RESOURCE_EMOJIS.eye} Mắt Trận đã dùng hệ này.`;
  }
  if (result.ok && result.eyeAction === 'refine') {
    return `${FORMATION_RESOURCE_EMOJIS.refine} **Tinh Luyện Mắt Trận thành công:** Lv.${result.level}`;
  }
  if (result.ok && result.eyeAction === 'change') {
    return `${element?.emoji || FORMATION_RESOURCE_EMOJIS.eye} **Đổi Mắt Trận thành công:** ${element?.name || 'Hệ mới'}`;
  }
  if (result.ok) {
    return `${element?.emoji || FORMATION_RESOURCE_EMOJIS.eye} **Mắt Trận đã được cập nhật.**`;
  }
  if (result.reason === 'not_enough_essence') {
    return `${FORMATION_RESOURCE_EMOJIS.essence} Chưa đủ **Trận Văn**. Cần **${number(result.essenceCost)}**.`;
  }
  if (result.reason === 'not_enough_crystal') {
    return `${element?.emoji || FORMATION_RESOURCE_EMOJIS.eye} Chưa đủ **${element?.name || ''} Tinh Thạch**. Cần **${number(result.crystalCost)}**.`;
  }
  if (result.reason === 'formation_level_gate') {
    return `🔒 Cần nâng **Trận Đồ lên Lv.${number(result.requiredFormationLevel)}** trước.`;
  }
  if (result.reason === 'max_level') {
    return `${FORMATION_RESOURCE_EMOJIS.eye} Mắt Trận đã đạt **Lv.${MAX_EYE_LEVEL}**.`;
  }
  return 'Không thể thay đổi Mắt Trận này.';
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
          .setDescription(`Cấp hiện tại: Lv.${levels[index]}/${MAX_SLOT_LEVEL}`)
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
  const formationLevel = getFormationLevel(state, formation.id);
  const layout = getFormationLayout(state, formation.id);
  const levels = getFormationSlotLevels(state, formation.id);
  const index = Math.max(0, Math.min(formation.slots - 1, Number(slotIndex) || 0));
  const elementId = layout[index];
  const element = FORMATION_ELEMENTS[elementId];
  const level = levels[index];
  const status = resultLine(result, FORMATION_ELEMENTS[result?.elementId] || element);
  const nextCost = level < MAX_SLOT_LEVEL
    ? getFormationUpgradeCost('slot', level)
    : null;
  const blockedByFormation = level >= formationLevel && level < MAX_SLOT_LEVEL;

  return style(new EmbedBuilder()
    .setTitle(title(`Trận Vị ${index + 1}`))
    .setDescription([
      `<a:ttrando:1547820131889979464> **${formation.name} · Lv.${formationLevel}**`,
      '',
      `${element?.emoji || '◈'} **Thuộc tính:** ${element?.name || 'Trống'}`,
      `${FORMATION_RESOURCE_EMOJIS.refine} **Tinh Luyện:** Lv.${level}/${MAX_SLOT_LEVEL}`,
      `${FORMATION_RESOURCE_EMOJIS.essence} **Trận Văn:** ${number(state.formationEssence)}`,
      `${element?.emoji || FORMATION_RESOURCE_EMOJIS.crystal} **${element?.name || ''} Tinh Thạch:** ${number(state.elementCrystals?.[elementId])}`,
      nextCost
        ? `${FORMATION_RESOURCE_EMOJIS.refine} **Cấp kế tiếp:** ${number(nextCost.essenceCost)} Trận Văn + ${number(nextCost.crystalCost)} ${element?.name || ''} Tinh Thạch`
        : `${FORMATION_RESOURCE_EMOJIS.refine} **Cấp kế tiếp:** Đã đạt cấp tối đa.`,
      blockedByFormation
        ? `🔒 **Khóa cấp:** phải nâng Trận Đồ lên Lv.${level + 1} trước.`
        : '',
      '',
      status ? `**Kết quả**\n${status}\n` : '',
      '*Trận Vị càng cao càng tốn nhiều Trận Văn và Tinh Thạch. Cấp Trận Vị không thể vượt Cấp Trận Đồ.*',
    ].filter(Boolean).join('\n')));
}

export function buildFormationSlotDetailRows(ownerId, state, slotIndex) {
  const formation = getActiveFormation(state);
  const formationLevel = getFormationLevel(state, formation.id);
  const index = Math.max(0, Math.min(formation.slots - 1, Number(slotIndex) || 0));
  const layout = getFormationLayout(state, formation.id);
  const levels = getFormationSlotLevels(state, formation.id);
  const currentElementId = layout[index];
  const isMaxLevel = levels[index] >= MAX_SLOT_LEVEL;
  const blockedByFormation = levels[index] >= formationLevel && !isMaxLevel;

  const elementSelect = new StringSelectMenuBuilder()
    .setCustomId(`tutien_formation_v2:${ownerId}:element:${index}`)
    .setPlaceholder('Chọn hệ thuộc tính cho Trận Vị')
    .addOptions(
      Object.values(FORMATION_ELEMENTS).map((element) => {
        const option = new StringSelectMenuOptionBuilder()
          .setLabel(`${element.name}${element.id === currentElementId ? ' · Đang dùng' : ''}`)
          .setDescription(
            element.tier === 'rare'
              ? 'Hệ hiếm · đổi vị trí tốn 20 Trận Văn + 3 Tinh Thạch'
              : element.tier === 'variant'
                ? 'Hệ biến dị · đổi vị trí tốn 12 Trận Văn + 2 Tinh Thạch'
                : 'Hệ cơ bản · đổi vị trí tốn 6 Trận Văn + 1 Tinh Thạch',
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
      formationButton(
        ownerId,
        `refine:${index}`,
        isMaxLevel ? 'Đã Viên Mãn' : blockedByFormation ? 'Cần nâng Trận Đồ' : 'Tinh Luyện',
        FORMATION_EMOJIS.refine,
        isMaxLevel || blockedByFormation,
      ),
      formationButton(ownerId, 'slots', 'Trận Vị', FORMATION_EMOJIS.slots),
      formationButton(ownerId, 'main', 'Trận Pháp', FORMATION_EMOJIS.formation),
    ),
  ];
}

export function buildFormationEyeEmbed(state, result = null) {
  const formation = getActiveFormation(state);
  const formationLevel = getFormationLevel(state, formation.id);
  const eye = getFormationEye(state, formation.id);
  const element = FORMATION_ELEMENTS[eye.elementId];
  const status = eyeResultLine(
    result,
    FORMATION_ELEMENTS[result?.elementId] || element,
  );
  const crystalAmount = Math.max(0, Number(state.elementCrystals?.[eye.elementId]) || 0);
  const eyeEffect =
    0.02 * Math.min(eye.level, 10)
    + 0.0028 * Math.max(0, eye.level - 10);
  const nextCost = eye.level < MAX_EYE_LEVEL
    ? getFormationUpgradeCost('eye', eye.level)
    : null;
  const blockedByFormation = eye.level >= formationLevel && eye.level < MAX_EYE_LEVEL;

  return style(new EmbedBuilder()
    .setTitle(title('Trận Nhãn'))
    .setDescription([
      `<a:ttrando:1547820131889979464> **${formation.name} · Lv.${formationLevel}**`,
      '',
      `${FORMATION_RESOURCE_EMOJIS.eye} **Mắt Trận:** ${element?.emoji || ''} **${element?.name || 'Tinh Thần'}**`,
      `${FORMATION_RESOURCE_EMOJIS.refine} **Cấp Mắt Trận:** Lv.${eye.level}/${MAX_EYE_LEVEL}`,
      `${FORMATION_RESOURCE_EMOJIS.essence} **Trận Văn:** ${number(state.formationEssence)}`,
      `${element?.emoji || FORMATION_RESOURCE_EMOJIS.crystal} **${element?.name || 'Tinh Thần'} Tinh Thạch:** ${number(crystalAmount)}`,
      nextCost
        ? `${FORMATION_RESOURCE_EMOJIS.refine} **Tinh Luyện kế tiếp:** ${number(nextCost.essenceCost)} Trận Văn + ${number(nextCost.crystalCost)} ${element?.name || 'Tinh Thần'} Tinh Thạch`
        : `${FORMATION_RESOURCE_EMOJIS.refine} **Tinh Luyện kế tiếp:** Đã đạt cấp tối đa.`,
      blockedByFormation
        ? `🔒 **Khóa cấp:** phải nâng Trận Đồ lên Lv.${eye.level + 1} trước.`
        : '',
      '',
      eye.elementId === 'chaos'
        ? `• **Hỗn Độn:** khuếch đại toàn bộ hiệu quả Cộng Hưởng thêm khoảng **${Math.round(eyeEffect * 100)}%**.`
        : `• **Tinh Thần:** tăng hiệu quả Lĩnh Ngộ Trận Đạo thêm khoảng **${Math.round(eyeEffect * 100)}%**.`,
      '',
      status ? `**Kết quả**\n${status}\n` : '',
      '*Tinh Thần và Hỗn Độn là hai hệ Trận Nhãn. Cấp Trận Nhãn không thể vượt Cấp Trận Đồ.*',
    ].filter(Boolean).join('\n')));
}

export function buildFormationEyeRows(ownerId, state) {
  const formation = getActiveFormation(state);
  const formationLevel = getFormationLevel(state, formation.id);
  const eye = getFormationEye(state, formation.id);
  const isMaxLevel = eye.level >= MAX_EYE_LEVEL;
  const blockedByFormation = eye.level >= formationLevel && !isMaxLevel;

  const eyeSelect = new StringSelectMenuBuilder()
    .setCustomId(`tutien_formation_v2:${ownerId}:eye`)
    .setPlaceholder('Chọn hệ Mắt Trận')
    .addOptions(
      FORMATION_EYE_ELEMENT_IDS.map((elementId) => {
        const element = FORMATION_ELEMENTS[elementId];
        const option = new StringSelectMenuOptionBuilder()
          .setLabel(`${element.name}${element.id === eye.elementId ? ' · Đang dùng' : ''}`)
          .setDescription(
            element.id === 'chaos'
              ? 'Hỗn Độn · đổi Mắt Trận tốn 60 Trận Văn + 6 Tinh Thạch'
              : 'Tinh Thần · đổi Mắt Trận tốn 30 Trận Văn + 3 Tinh Thạch',
          )
          .setValue(element.id);

        const emojiId = rawEmojiId(element.emoji);
        if (emojiId) option.setEmoji({ id: emojiId });
        return option;
      }),
    );

  return [
    new ActionRowBuilder().addComponents(eyeSelect),
    new ActionRowBuilder().addComponents(
      formationButton(
        ownerId,
        'eye_refine',
        isMaxLevel ? 'Đã Viên Mãn' : blockedByFormation ? 'Cần nâng Trận Đồ' : 'Tinh Luyện Mắt Trận',
        FORMATION_EMOJIS.refine,
        isMaxLevel || blockedByFormation,
      ),
      formationButton(ownerId, 'main', 'Trận Pháp', FORMATION_EMOJIS.formation),
    ),
  ];
}
