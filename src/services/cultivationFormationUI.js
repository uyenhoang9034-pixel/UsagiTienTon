import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';

import { CULTIVATION_CONFIG } from '../config/cultivationGame.js';
import {
  FORMATION_DEFINITIONS,
  FORMATION_ELEMENTS,
  getActiveFormation,
  getFormationEye,
  getFormationLayout,
  getFormationLevel,
  getFormationProgress,
  getFormationResonance,
  getFormationSlotLevels,
} from './cultivationFormation.js';

export const FORMATION_EMOJIS = {
  formation: { id: '1547820164291240076' },
  dashboardFormation: { id: '1547915911497785435' },
  diagrams: { id: '1547820131889979464' },
  storage: { id: '1547820098465824809' },
  slots: { id: '1547820065292943421' },
  comprehend: { id: '1547820024440291389' },
  arrange: { id: '1547829974025773117' },
  upgrade: { id: '1547830013473067148' },
  resonance: { id: '1547830051951738960' },
  elements: { id: '1547830093747982376' },
  refine: { id: '1547960553950158848' },
  eye: { id: '1547959565490855946' },
};

export const FORMATION_RESOURCE_EMOJIS = {
  essence: '<a:ttranvan:1547959053114671297>',
  fragment: '<a:ttmanhtrando:1547960167667081276>',
  crystal: '<a:ttmanhtrando:1547960167667081276>',
  eye: '<a:tttrannhan:1547959565490855946>',
  refine: '<a:tttinhluyen:1547960553950158848>',
};

const TITLE_LEFT = '<a:trangtrig2:1546040703375904801>';
const TITLE_RIGHT = '<a:trangtrig3:1546040818261954610>';
const FORMATION_STATUS_EMOJI = '<a:trangtrig43:1547238351869059082>';
const UPGRADE_SUCCESS_EMOJI = '<a:trangtrig38:1547237720332439574>';
const SEPARATOR = '꒷꒦︶꒷꒦︶ ๋ ࣭ ⭑꒷꒦';

function formationTitle(label) {
  return `${TITLE_LEFT} ${label} ${TITLE_RIGHT}`;
}

function style(embed) {
  embed.setColor(CULTIVATION_CONFIG.ui.color);
  embed.setFooter({ text: CULTIVATION_CONFIG.ui.footer });
  if (CULTIVATION_CONFIG.ui.image) embed.setImage(CULTIVATION_CONFIG.ui.image);
  return embed;
}

function number(value) {
  return new Intl.NumberFormat('vi-VN').format(Math.max(0, Math.round(Number(value) || 0)));
}

function percent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

function duration(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (!minutes) return `${seconds}s`;
  if (!seconds) return `${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

function button(ownerId, action, label, emoji) {
  return new ButtonBuilder()
    .setCustomId(`tutien_formation:${ownerId}:${action}`)
    .setLabel(label)
    .setEmoji(emoji)
    .setStyle(ButtonStyle.Secondary);
}

function resolveTienPhuongEmoji(guild) {
  const emoji = guild?.emojis?.cache?.find?.(
    (item) => item.name === 'tttienphuong',
  );

  if (!emoji?.id) {
    return null;
  }

  return {
    id: emoji.id,
    name: emoji.name,
    animated: emoji.animated,
  };
}

function shopDashboardButton(ownerId, guild = null) {
  const component = new ButtonBuilder()
    .setCustomId(`tutien_shop:${ownerId}:main`)
    .setLabel('Tiên Phường')
    .setStyle(ButtonStyle.Secondary);

  const emoji = resolveTienPhuongEmoji(guild);

  if (emoji) {
    component.setEmoji(emoji);
  }

  return component;
}

export function appendFormationButton(rows, ownerId, guild = null) {
  const cloned = [...rows];
  const target = cloned[2];

  if (target?.components?.length < 5) {
    target.addComponents(
      button(ownerId, 'main', 'Trận Pháp', FORMATION_EMOJIS.dashboardFormation),
    );
  } else {
    cloned.push(
      new ActionRowBuilder().addComponents(
        button(ownerId, 'main', 'Trận Pháp', FORMATION_EMOJIS.dashboardFormation),
      ),
    );
  }

  let shopTarget = cloned[2];

  if (!shopTarget || shopTarget.components.length >= 5) {
    shopTarget = new ActionRowBuilder();
    cloned.push(shopTarget);
  }

  shopTarget.addComponents(
    shopDashboardButton(ownerId, guild),
  );

  return cloned;
}

export function buildFormationMainEmbed(user, state) {
  const active = getActiveFormation(state);
  const level = getFormationLevel(state, active.id);
  const resonance = getFormationResonance(state);
  const next = getFormationProgress(state);
  const eye = getFormationEye(state, active.id);
  const eyeElement = FORMATION_ELEMENTS[eye.elementId];

  return style(new EmbedBuilder()
    .setTitle(formationTitle('Trận Pháp'))
    .setDescription([
      `${FORMATION_ELEMENTS.spirit.emoji} **Trận Sư:** <@${user.id}>`,
      '',
      `<a:ttrando:1547820131889979464> **Trận Đồ đang dùng:** **${active.name}**`,
      `<a:ttnangcap:1547830013473067148> **Cấp Trận:** Lv.${level}`,
      `<a:tttranvi:1547820065292943421> **Trận Vị:** ${active.slots}/${active.slots}`,
      `${FORMATION_RESOURCE_EMOJIS.eye} **Trận Nhãn:** ${eyeElement?.emoji || ''} **${eyeElement?.name || 'Tinh Thần'} · Lv.${eye.level}**`,
      `<a:ttlinhngo:1547820024440291389> **Trận Đạo Lĩnh Ngộ:** ${number(state.insight)}`,
      `${FORMATION_RESOURCE_EMOJIS.essence} **Trận Văn:** ${number(state.formationEssence)}`,
      '',
      `<a:ttconghuong:1547830051951738960> **Cộng Hưởng**`,
      ...(resonance.lines.length ? resonance.lines.map((line) => `• ${line}`) : ['• Chưa hình thành cộng hưởng.']),
      `• Hiệu suất trận: **${Math.round(resonance.multiplier * 100)}%**`,
      '',
      next
        ? `*Lĩnh ngộ tiếp theo: **${next.name}** tại **${number(next.unlockInsight)}** điểm.*`
        : '*Đạo hữu đã lĩnh ngộ toàn bộ Trận Đồ hiện có.*',
      '', SEPARATOR, '',
      '*Một niệm bố trận, vạn tượng quy nguyên.*',
    ].join('\n')));
}

export function buildFormationMainRows(ownerId) {
  return [
    new ActionRowBuilder().addComponents(
      button(ownerId, 'diagrams', 'Trận Đồ', FORMATION_EMOJIS.diagrams),
      button(ownerId, 'storage', 'Trận Khố', FORMATION_EMOJIS.storage),
      button(ownerId, 'slots', 'Trận Vị', FORMATION_EMOJIS.slots),
      button(ownerId, 'comprehend', 'Lĩnh Ngộ', FORMATION_EMOJIS.comprehend),
      button(ownerId, 'arrange', 'Bố Trí', FORMATION_EMOJIS.arrange),
    ),
    new ActionRowBuilder().addComponents(
      button(ownerId, 'upgrade', 'Nâng Cấp', FORMATION_EMOJIS.upgrade),
      button(ownerId, 'resonance', 'Cộng Hưởng', FORMATION_EMOJIS.resonance),
      button(ownerId, 'eye', 'Trận Nhãn', FORMATION_EMOJIS.eye),
      button(ownerId, 'elements', 'Ngũ Hành', FORMATION_EMOJIS.elements),
      button(ownerId, 'dashboard', 'Quay lại', FORMATION_EMOJIS.formation),
    ),
  ];
}

export function buildFormationDiagramsEmbed(state) {
  const unlocked = new Set(state.unlockedFormationIds);
  return style(new EmbedBuilder()
    .setTitle(formationTitle('Trận Đồ'))
    .setDescription(Object.values(FORMATION_DEFINITIONS).map((formation) => {
      const open = unlocked.has(formation.id);
      const active = state.activeFormationId === formation.id ? ' ◈ **Đang dùng**' : '';
      const unlockedLine = open
        ? `\n${FORMATION_STATUS_EMOJI} **Đã mở khóa**`
        : '';
      const fragments = number(state.formationFragments?.[formation.id]);

      return `${FORMATION_STATUS_EMOJI} **${formation.name}** · ${formation.rarity}${active}\nTrận Vị: **${formation.slots}** · Cấp: **Lv.${open ? getFormationLevel(state, formation.id) : '-'}**\nLĩnh Ngộ: **${number(formation.unlockInsight)}** · ${FORMATION_RESOURCE_EMOJIS.fragment} Mảnh: **${fragments}**${unlockedLine}\n*${formation.effect}*`;
    }).join('\n\n')));
}

export function buildFormationDiagramsRows(ownerId) {
  return [new ActionRowBuilder().addComponents(
    button(ownerId, 'cycle', 'Đổi Trận Đồ', FORMATION_EMOJIS.diagrams),
    button(ownerId, 'main', 'Trận Pháp', FORMATION_EMOJIS.formation),
  )];
}

export function buildFormationStorageEmbed(state) {
  const crystalLines = Object.values(FORMATION_ELEMENTS)
    .filter((element) => Number(state.elementCrystals?.[element.id]) > 0)
    .map((element) => `${element.emoji} **${element.name} Tinh Thạch:** ×${number(state.elementCrystals[element.id])}`);

  const fragmentLines = Object.values(FORMATION_DEFINITIONS)
    .filter((formation) => Number(state.formationFragments?.[formation.id]) > 0)
    .map((formation) => `${FORMATION_RESOURCE_EMOJIS.fragment} **${formation.name}:** ×${number(state.formationFragments[formation.id])}`);

  return style(new EmbedBuilder().setTitle(formationTitle('Trận Khố')).setDescription([
    `${FORMATION_RESOURCE_EMOJIS.essence} **Trận Văn:** ${number(state.formationEssence)}`,
    '',
    `${FORMATION_RESOURCE_EMOJIS.fragment} **MẢNH TRẬN ĐỒ**`,
    ...(fragmentLines.length ? fragmentLines : ['• Chưa có Mảnh Trận Đồ.']),
    '',
    `${FORMATION_RESOURCE_EMOJIS.crystal} **NGŨ HÀNH TINH THẠCH**`,
    ...(crystalLines.length ? crystalLines : ['• Chưa có Tinh Thạch.']),
    '',
    '*Trận Văn dùng để nâng Trận Đồ và bố trí Trận Vị. Tinh Thạch dùng để Tinh Luyện từng Trận Vị.*',
  ].join('\n')));
}

export function buildFormationSlotsEmbed(state) {
  const formation = getActiveFormation(state);
  const layout = getFormationLayout(state, formation.id);
  const levels = getFormationSlotLevels(state, formation.id);
  const eye = getFormationEye(state, formation.id);
  const eyeElement = FORMATION_ELEMENTS[eye.elementId];

  return style(new EmbedBuilder().setTitle(formationTitle('Trận Vị')).setDescription([
    `<a:ttrando:1547820131889979464> **${formation.name}**`,
    '',
    ...layout.map((id, index) => {
      const element = FORMATION_ELEMENTS[id];
      return `**${index + 1}. Trận Vị** → ${element?.emoji || '◈'} **${element?.name || 'Trống'} · Lv.${levels[index]}**`;
    }),
    '',
    `${FORMATION_RESOURCE_EMOJIS.eye} **Mắt Trận:** ${eyeElement?.emoji || ''} **${eyeElement?.name || 'Tinh Thần'} · Lv.${eye.level}**`,
    '',
    `${FORMATION_RESOURCE_EMOJIS.refine} *V2: mỗi Trận Vị có cấp riêng và có thể thay đổi hệ thuộc tính.*`,
  ].join('\n')));
}

export function buildFormationComprehendEmbed(result) {
  if (!result.ok) {
    return style(new EmbedBuilder().setTitle(formationTitle('Lĩnh Ngộ')).setDescription(
      `<a:ttlinhngo:1547820024440291389> Trận tâm chưa ổn định. Có thể Lĩnh Ngộ lại sau **${duration(result.remainingMs)}**.`,
    ));
  }

  const unlocked = result.unlockedNow?.length
    ? result.unlockedNow.map((formation) => `${FORMATION_STATUS_EMOJI} **${formation.name}**\n**Đã mở khóa**`).join('\n\n')
    : 'Chưa mở khóa Trận Đồ mới.';
  const crystal = FORMATION_ELEMENTS[result.crystalId];

  return style(new EmbedBuilder().setTitle(formationTitle('Lĩnh Ngộ')).setDescription([
    `<a:ttlinhngo:1547820024440291389> **Lĩnh Ngộ +${result.insightGain}**`,
    `${FORMATION_RESOURCE_EMOJIS.essence} **Trận Văn +${result.essenceGain}**`,
    `${crystal?.emoji || FORMATION_RESOURCE_EMOJIS.crystal} **${crystal?.name || 'Ngũ Hành'} Tinh Thạch +${result.crystalGain || 0}**`,
    `Tổng Lĩnh Ngộ: **${number(result.state.insight)}**`,
    `${FORMATION_RESOURCE_EMOJIS.essence} Trận Văn: **${number(result.state.formationEssence)}**`,
    '', '**Thiên cơ diễn biến**', unlocked,
  ].join('\n')));
}

export function buildFormationArrangeEmbed(state) {
  const formation = getActiveFormation(state);
  const resonance = getFormationResonance(state);
  return style(new EmbedBuilder().setTitle(formationTitle('Bố Trí')).setDescription([
    `<a:ttbotri:1547829974025773117> **${formation.name}** đã được bố trí theo Trận Đồ chuẩn.`,
    '',
    ...(resonance.lines.length ? resonance.lines.map((line) => `• ${line}`) : ['• Chưa có cộng hưởng.']),
  ].join('\n')));
}

export function buildFormationUpgradeEmbed(result) {
  const formation = getActiveFormation(result.state);
  const currentFragments = Math.max(
    0,
    Number(result.state.formationFragments?.[formation.id]) || 0,
  );
  const essenceCost = Math.max(
    0,
    Number(result.essenceCost ?? result.cost) || 0,
  );
  const fragmentCost = Math.max(
    0,
    Number(result.fragmentCost) || 0,
  );

  let status = [
    `${FORMATION_RESOURCE_EMOJIS.essence} Chưa đủ **Trận Văn**.`,
    `Cần **${number(essenceCost)}**, hiện có **${number(result.state.formationEssence)}**.`,
  ].join(' ');

  if (result.reason === 'not_enough_fragment') {
    status = [
      `${FORMATION_RESOURCE_EMOJIS.fragment} Chưa đủ **Mảnh Trận Đồ**.`,
      `Cần **${number(fragmentCost)}**, hiện có **${number(currentFragments)}**.`,
    ].join(' ');
  }

  if (result.ok) {
    status = [
      `${UPGRADE_SUCCESS_EMOJI} Nâng cấp thành công lên **Lv.${result.level}**.`,
      `Đã tiêu **${number(essenceCost)} Trận Văn** + **${number(fragmentCost)} Mảnh Trận Đồ**.`,
    ].join(' ');
  }

  if (result.reason === 'max_level') {
    status = '🌟 Trận Đồ đã đạt **Lv.10**.';
  }

  return style(new EmbedBuilder().setTitle(formationTitle('Nâng Cấp')).setDescription([
    `<a:ttnangcap:1547830013473067148> **${formation.name}**`,
    '',
    `${FORMATION_RESOURCE_EMOJIS.essence} **Trận Văn:** ${number(result.state.formationEssence)}`,
    `${FORMATION_RESOURCE_EMOJIS.fragment} **Mảnh ${formation.name}:** ${number(currentFragments)}`,
    '',
    status,
  ].join('\n')));
}

export function buildFormationResonanceEmbed(state) {
  const resonance = getFormationResonance(state);
  const effects = resonance.effects;
  return style(new EmbedBuilder().setTitle(formationTitle('Cộng Hưởng')).setDescription([
    '<a:ttconghuong:1547830051951738960> **Trận mạch đang cộng hưởng**',
    '',
    ...(resonance.lines.length ? resonance.lines.map((line) => `• **${line}**`) : ['• Chưa hình thành cộng hưởng.']),
    '',
    `Hiệu suất tổng: **${Math.round(resonance.multiplier * 100)}%**`,
    '',
    '**Hiệu quả V2**',
    `• Tu Vi: **+${percent(effects.cultivationBonus)}**`,
    `• Thám Hiểm: **+${percent(effects.adventureBonus)}**`,
    `• Linh Thạch: **+${percent(effects.spiritStoneBonus)}**`,
    `• Giảm Thể Lực: **${percent(effects.staminaReduction)}**`,
    `• Đột Phá: **+${percent(effects.breakthroughBonus)}**`,
    `• Lĩnh Ngộ: **+${percent(effects.insightBonus)}**`,
  ].join('\n')));
}

export function buildFormationElementsEmbed() {
  const values = Object.values(FORMATION_ELEMENTS);
  const line = (tier) => values.filter((item) => item.tier === tier).map((item) => `${item.emoji} **${item.name}**`).join(' · ');
  return style(new EmbedBuilder().setTitle(formationTitle('Ngũ Hành')).setDescription([
    '<a:ttnguhanhchung:1547830093747982376> **HỆ THUỘC TÍNH TRẬN ĐẠO**', '',
    '**5 hệ cơ bản**', line('basic'), '',
    '**3 hệ biến dị**', line('variant'), '',
    '**3 hệ hiếm**', line('rare'), '',
    '**Tương sinh cơ bản**',
    `${FORMATION_ELEMENTS.metal.emoji} Kim → ${FORMATION_ELEMENTS.water.emoji} Thủy → ${FORMATION_ELEMENTS.wood.emoji} Mộc → ${FORMATION_ELEMENTS.fire.emoji} Hỏa → ${FORMATION_ELEMENTS.earth.emoji} Thổ → ${FORMATION_ELEMENTS.metal.emoji} Kim`, '',
    '**Cộng Hưởng đặc biệt**',
    `${FORMATION_ELEMENTS.wind.emoji} Phong + ${FORMATION_ELEMENTS.lightning.emoji} Lôi → **Phong Lôi Đồng Hành**`,
    `${FORMATION_ELEMENTS.water.emoji} Thủy + ${FORMATION_ELEMENTS.ice.emoji} Băng → **Hàn Triều Tỏa Linh**`,
    `${FORMATION_ELEMENTS.yin_yang.emoji} Âm Dương đối vị → **Lưỡng Nghi Đối Ứng**`,
    `${FORMATION_ELEMENTS.chaos.emoji} Hỗn Độn → **khuếch đại toàn trận**`,
  ].join('\n')));
}

export function buildFormationBackRows(ownerId) {
  return [new ActionRowBuilder().addComponents(
    button(ownerId, 'main', 'Trận Pháp', FORMATION_EMOJIS.formation),
    button(ownerId, 'dashboard', 'Tiên Lộ', FORMATION_EMOJIS.formation),
  )];
}
