import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';

import {
  CULTIVATION_CONFIG,
} from '../config/cultivationGame.js';

import {
  FORMATION_DEFINITIONS,
  FORMATION_ELEMENTS,
  getActiveFormation,
  getFormationLayout,
  getFormationLevel,
  getFormationProgress,
  getFormationResonance,
} from './cultivationFormation.js';

export const FORMATION_EMOJIS = {
  formation: { id: '1547820164291240076' },
  diagrams: { id: '1547820131889979464' },
  storage: { id: '1547820098465824809' },
  slots: { id: '1547820065292943421' },
  comprehend: { id: '1547820024440291389' },
  arrange: { id: '1547829974025773117' },
  upgrade: { id: '1547830013473067148' },
  resonance: { id: '1547830051951738960' },
  elements: { id: '1547830093747982376' },
};

const SEPARATOR = '꒷꒦︶꒷꒦︶ ๋ ࣭ ⭑꒷꒦';

function style(embed) {
  embed.setColor(CULTIVATION_CONFIG.ui.color);
  embed.setFooter({ text: CULTIVATION_CONFIG.ui.footer });

  if (CULTIVATION_CONFIG.ui.image) {
    embed.setImage(CULTIVATION_CONFIG.ui.image);
  }

  return embed;
}

function number(value) {
  return new Intl.NumberFormat('vi-VN').format(
    Math.max(0, Math.round(Number(value) || 0)),
  );
}

function duration(ms) {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;

  if (minutes <= 0) return `${remaining}s`;
  if (remaining <= 0) return `${minutes}m`;
  return `${minutes}m ${remaining}s`;
}

function actionButton(ownerId, action, label, emoji, styleType = ButtonStyle.Secondary) {
  return new ButtonBuilder()
    .setCustomId(`tutien_action:${ownerId}:${action}`)
    .setLabel(label)
    .setEmoji(emoji)
    .setStyle(styleType);
}

export function buildFormationMainEmbed(user, state) {
  const active = getActiveFormation(state);
  const level = getFormationLevel(state, active.id);
  const resonance = getFormationResonance(state);
  const next = getFormationProgress(state);

  return style(
    new EmbedBuilder()
      .setTitle('𝓣𝓻𝓪̣̂𝓷 𝓓𝓪̣𝓸 · 陣道')
      .setDescription([
        `${FORMATION_ELEMENTS.spirit.emoji} **Trận Sư:** <@${user.id}>`,
        '',
        `<a:tttranphap:1547820164291240076> **Trận Đồ đang dùng:** **${active.name}**`,
        `<a:ttnangcap:1547830013473067148> **Cấp Trận:** Lv.${level}`,
        `<a:tttranvi:1547820065292943421> **Trận Vị:** ${active.slots}/${active.slots}`,
        `<a:ttlinhngo:1547820024440291389> **Trận Đạo Lĩnh Ngộ:** ${number(state.insight)}`,
        `<a:tttrankho:1547820098465824809> **Trận Văn:** ${number(state.formationEssence)}`,
        '',
        `<a:ttconghuong:1547830051951738960> **Cộng Hưởng**`,
        resonance.lines.length > 0
          ? resonance.lines.map((line) => `• ${line}`).join('\n')
          : '• Chưa hình thành cộng hưởng.',
        `• Hiệu suất trận: **${Math.round(resonance.multiplier * 100)}%**`,
        '',
        next
          ? `*Lĩnh ngộ tiếp theo: **${next.name}** tại **${number(next.unlockInsight)}** điểm.*`
          : '*Đạo hữu đã lĩnh ngộ toàn bộ Trận Đồ hiện có.*',
        '',
        SEPARATOR,
        '',
        '*Một niệm bố trận, vạn tượng quy nguyên.*',
      ].join('\n')),
  );
}

export function buildFormationMainRows(ownerId) {
  return [
    new ActionRowBuilder().addComponents(
      actionButton(ownerId, 'formation_diagrams', 'Trận Đồ', FORMATION_EMOJIS.diagrams),
      actionButton(ownerId, 'formation_storage', 'Trận Khố', FORMATION_EMOJIS.storage),
      actionButton(ownerId, 'formation_slots', 'Trận Vị', FORMATION_EMOJIS.slots),
      actionButton(ownerId, 'formation_comprehend', 'Lĩnh Ngộ', FORMATION_EMOJIS.comprehend),
      actionButton(ownerId, 'formation_arrange', 'Bố Trí', FORMATION_EMOJIS.arrange),
    ),
    new ActionRowBuilder().addComponents(
      actionButton(ownerId, 'formation_upgrade', 'Nâng Cấp', FORMATION_EMOJIS.upgrade),
      actionButton(ownerId, 'formation_resonance', 'Cộng Hưởng', FORMATION_EMOJIS.resonance),
      actionButton(ownerId, 'formation_elements', 'Ngũ Hành', FORMATION_EMOJIS.elements),
      actionButton(ownerId, 'dashboard', 'Quay lại', FORMATION_EMOJIS.formation),
    ),
  ];
}

export function buildFormationDiagramsEmbed(state) {
  const unlocked = new Set(state.unlockedFormationIds);

  return style(
    new EmbedBuilder()
      .setTitle('TRẬN ĐỒ · 陣圖')
      .setDescription([
        ...Object.values(FORMATION_DEFINITIONS).map((formation) => {
          const isUnlocked = unlocked.has(formation.id);
          const level = getFormationLevel(state, formation.id);
          const marker = state.activeFormationId === formation.id ? ' ◈ **Đang dùng**' : '';
          return [
            `${isUnlocked ? '🔓' : '🔒'} **${formation.name}** · ${formation.rarity}${marker}`,
            `Trận Vị: **${formation.slots}** · Cấp: **Lv.${isUnlocked ? level : '-'}**`,
            `Lĩnh Ngộ: **${number(formation.unlockInsight)}**`,
            `*${formation.effect}*`,
          ].join('\n');
        }),
        '',
        '*Nhấn “Đổi Trận Đồ” để chuyển sang Trận Đồ đã mở khóa tiếp theo.*',
      ].join('\n\n')),
  );
}

export function buildFormationDiagramsRows(ownerId) {
  return [
    new ActionRowBuilder().addComponents(
      actionButton(ownerId, 'formation_cycle', 'Đổi Trận Đồ', FORMATION_EMOJIS.diagrams),
      actionButton(ownerId, 'formation', 'Trận Pháp', FORMATION_EMOJIS.formation),
    ),
  ];
}

export function buildFormationStorageEmbed(state) {
  return style(
    new EmbedBuilder()
      .setTitle('TRẬN KHỐ · 陣庫')
      .setDescription([
        `<a:tttrankho:1547820098465824809> **Trận Văn:** ${number(state.formationEssence)}`,
        '',
        '**Vật liệu Trận Đạo**',
        '• Trận Văn — dùng để nâng cấp Trận Đồ.',
        '• Mảnh Trận Đồ — sẽ dùng cho các Trận Đồ hiếm ở bản mở rộng.',
        '• Ngũ Hành Tinh Thạch — sẽ dùng để tinh luyện Trận Vị.',
        '',
        '*Hiện tại Trận Văn nhận được chủ yếu qua Lĩnh Ngộ.*',
      ].join('\n')),
  );
}

export function buildFormationSlotsEmbed(state) {
  const formation = getActiveFormation(state);
  const layout = getFormationLayout(state, formation.id);

  const lines = layout.map((elementId, index) => {
    const element = FORMATION_ELEMENTS[elementId];
    return `**Trận Vị ${index + 1}** → ${element?.emoji || '◈'} **${element?.name || 'Trống'}**`;
  });

  return style(
    new EmbedBuilder()
      .setTitle('TRẬN VỊ · 陣位')
      .setDescription([
        `<a:tttranphap:1547820164291240076> **${formation.name}**`,
        '',
        ...lines,
        '',
        '*Trận Vị quyết định chuỗi tương sinh và Cộng Hưởng của Trận Đồ.*',
      ].join('\n')),
  );
}

export function buildFormationComprehendEmbed(result) {
  if (!result.ok && result.reason === 'cooldown') {
    return style(
      new EmbedBuilder()
        .setTitle('LĨNH NGỘ · 道心未定')
        .setDescription([
          '<a:ttlinhngo:1547820024440291389> Trận tâm chưa đủ tĩnh để tiếp tục suy diễn thiên cơ.',
          '',
          `Có thể Lĩnh Ngộ lại sau **${duration(result.remainingMs)}**.`,
        ].join('\n')),
    );
  }

  const unlocked = result.unlockedNow?.length
    ? result.unlockedNow.map((formation) => `✨ **${formation.name}**`).join('\n')
    : 'Chưa mở khóa Trận Đồ mới.';

  return style(
    new EmbedBuilder()
      .setTitle('LĨNH NGỘ · 陣道推演')
      .setDescription([
        `<a:ttlinhngo:1547820024440291389> **Lĩnh Ngộ +${result.insightGain}**`,
        `<a:tttrankho:1547820098465824809> **Trận Văn +${result.essenceGain}**`,
        '',
        `Tổng Lĩnh Ngộ: **${number(result.state.insight)}**`,
        `Trận Văn hiện có: **${number(result.state.formationEssence)}**`,
        '',
        '**Thiên cơ diễn biến**',
        unlocked,
      ].join('\n')),
  );
}

export function buildFormationArrangeEmbed(state) {
  const formation = getActiveFormation(state);
  const resonance = getFormationResonance(state);

  return style(
    new EmbedBuilder()
      .setTitle('BỐ TRÍ · 布陣')
      .setDescription([
        `<a:ttbotri:1547829974025773117> **${formation.name}** đã được bố trí theo Trận Đồ chuẩn.`,
        '',
        resonance.exact
          ? '✨ **Trận mạch hoàn chỉnh — các Trận Vị đã quy về đúng vị.**'
          : 'Trận mạch vẫn chưa hoàn chỉnh.',
        '',
        resonance.lines.map((line) => `• ${line}`).join('\n') || '• Chưa có cộng hưởng.',
      ].join('\n')),
  );
}

export function buildFormationUpgradeEmbed(result) {
  const state = result.state;
  const formation = getActiveFormation(state);

  let status;
  if (result.ok) {
    status = `✨ Nâng cấp thành công lên **Lv.${result.level}**.\nĐã tiêu hao **${number(result.cost)} Trận Văn**.`;
  } else if (result.reason === 'max_level') {
    status = '🌟 Trận Đồ này đã đạt **Lv.10**, không thể nâng thêm.';
  } else {
    status = `Chưa đủ Trận Văn. Cần **${number(result.cost)}**, hiện có **${number(state.formationEssence)}**.`;
  }

  return style(
    new EmbedBuilder()
      .setTitle('NÂNG CẤP · 陣階')
      .setDescription([
        `<a:ttnangcap:1547830013473067148> **${formation.name}**`,
        '',
        status,
        '',
        `Trận Văn còn lại: **${number(state.formationEssence)}**`,
      ].join('\n')),
  );
}

export function buildFormationResonanceEmbed(state) {
  const resonance = getFormationResonance(state);

  return style(
    new EmbedBuilder()
      .setTitle('CỘNG HƯỞNG · 共鳴')
      .setDescription([
        '<a:ttconghuong:1547830051951738960> **Trận mạch đang cộng hưởng**',
        '',
        ...(resonance.lines.length
          ? resonance.lines.map((line) => `• **${line}**`)
          : ['• Chưa hình thành cộng hưởng.']),
        '',
        `Hiệu suất tổng: **${Math.round(resonance.multiplier * 100)}%**`,
        resonance.exact
          ? '✨ Trận Đồ được bố trí hoàn chỉnh.'
          : '⚠️ Trận Đồ chưa đạt bố cục hoàn chỉnh.',
      ].join('\n')),
  );
}

export function buildFormationElementsEmbed() {
  const basic = Object.values(FORMATION_ELEMENTS).filter((item) => item.tier === 'basic');
  const variant = Object.values(FORMATION_ELEMENTS).filter((item) => item.tier === 'variant');
  const rare = Object.values(FORMATION_ELEMENTS).filter((item) => item.tier === 'rare');

  const line = (items) => items.map((item) => `${item.emoji} **${item.name}**`).join(' · ');

  return style(
    new EmbedBuilder()
      .setTitle('NGŨ HÀNH · 五行')
      .setDescription([
        '<a:ttnguhanhchung:1547830093747982376> **HỆ THUỘC TÍNH TRẬN ĐẠO**',
        '',
        '**5 hệ cơ bản**',
        line(basic),
        '',
        '**3 hệ biến dị**',
        line(variant),
        '',
        '**3 hệ hiếm**',
        line(rare),
        '',
        '**Tương sinh cơ bản**',
        `${FORMATION_ELEMENTS.metal.emoji} Kim → ${FORMATION_ELEMENTS.water.emoji} Thủy → ${FORMATION_ELEMENTS.wood.emoji} Mộc → ${FORMATION_ELEMENTS.fire.emoji} Hỏa → ${FORMATION_ELEMENTS.earth.emoji} Thổ → ${FORMATION_ELEMENTS.metal.emoji} Kim`,
        '',
        '**Cộng Hưởng đặc biệt**',
        `${FORMATION_ELEMENTS.wind.emoji} Phong + ${FORMATION_ELEMENTS.lightning.emoji} Lôi → **Phong Lôi Đồng Hành**`,
        `${FORMATION_ELEMENTS.water.emoji} Thủy + ${FORMATION_ELEMENTS.ice.emoji} Băng → **Hàn Triều Tỏa Linh**`,
        `${FORMATION_ELEMENTS.yin_yang.emoji} Âm Dương đối vị → **Lưỡng Nghi Đối Ứng**`,
        `${FORMATION_ELEMENTS.chaos.emoji} Hỗn Độn → **khuếch đại toàn trận**`,
      ].join('\n')),
  );
}

export function buildFormationBackRows(ownerId) {
  return [
    new ActionRowBuilder().addComponents(
      actionButton(ownerId, 'formation', 'Trận Pháp', FORMATION_EMOJIS.formation),
      actionButton(ownerId, 'dashboard', 'Tiên Lộ', FORMATION_EMOJIS.formation),
    ),
  ];
}
