import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { IMMORTAL_ORDER_EMOJI, IMMORTAL_ORDER_MILESTONES } from './cultivationImmortalOrder.js';

const G2 = '<a:trangtrig2:1546040703375904801>';
const G3 = '<a:trangtrig3:1546040818261954610>';
const ORDER_EMOJI = { id: '1549055213048959070', name: 'tttienlenh', animated: false };
const CHEST_EMOJI = { id: '1547493008914653245', name: 'ttruongco', animated: true };
function n(v) { return new Intl.NumberFormat('vi-VN').format(Math.max(0, Number(v) || 0)); }
function bar(value, max, size = 10) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 1;
  const filled = Math.round(ratio * size);
  return `${'█'.repeat(filled)}${'░'.repeat(size - filled)}`;
}

export function getImmortalOrderDashboardButton(ownerId) {
  return new ButtonBuilder().setCustomId(`tutien_immortal_order:${ownerId}:main`).setLabel('Tiên Lệnh').setEmoji(ORDER_EMOJI).setStyle(ButtonStyle.Secondary);
}

export function buildImmortalOrderMainEmbed(user, snapshot, notice = null) {
  const next = snapshot.nextMilestone;
  const max = next?.points || IMMORTAL_ORDER_MILESTONES.at(-1).points;
  return new EmbedBuilder()
    .setColor(0xf5a9c7)
    .setTitle(`${G2} 𝓣𝓲𝓮̂𝓷 𝓛𝓮̣̂𝓷𝓱 · 仙令 ${G3}`)
    .setDescription([
      `${IMMORTAL_ORDER_EMOJI} **Đạo hữu:** ${user}`,
      `${IMMORTAL_ORDER_EMOJI} **Tiên Lệnh Điểm:** ${n(snapshot.state.points)}`,
      `**${bar(snapshot.state.points, max)}**  ${n(snapshot.state.points)} / ${n(max)}`,
      '',
      `**Nhiệm vụ hoàn thành:** ${snapshot.completedCount} / ${snapshot.totalCount}`,
      next ? `**Mốc kế tiếp:** ${n(next.points)} Tiên Lệnh Điểm` : '**Tiên Lệnh viên mãn:** Đã đạt mốc cuối.',
      notice ? `\n${notice}` : '',
      '',
      '*Tiên Lệnh là hành trình dài hạn, không reset cùng Nhiệm Vụ Hằng Ngày.*',
    ].filter(Boolean).join('\n'));
}

export function buildImmortalOrderQuestEmbed(user, snapshot) {
  const lines = snapshot.quests.map(q => `${q.completed ? '✅' : '▫️'} **${q.name}** · +${n(q.points)} điểm\n└ ${q.description} — **${n(q.progress)} / ${n(q.target)}**`);
  return new EmbedBuilder().setColor(0xf5a9c7).setTitle(`${G2} 𝓝𝓱𝓲𝓮̣̂𝓶 𝓥𝓾̣ · 仙令 ${G3}`).setDescription([`${IMMORTAL_ORDER_EMOJI} ${user}`, '', ...lines].join('\n'));
}

export function buildImmortalOrderRewardEmbed(user, snapshot, notice = null) {
  const lines = IMMORTAL_ORDER_MILESTONES.map(m => {
    const claimed = Boolean(snapshot.state.claimedMilestones[String(m.points)]);
    const ready = snapshot.state.points >= m.points;
    const status = claimed ? '✅ Đã nhận' : ready ? '🎁 Có thể nhận' : '🔒 Chưa đạt';
    return `**${n(m.points)} điểm** — ${status}\n└ ${n(m.spiritStones)} Linh Thạch`;
  });
  return new EmbedBuilder().setColor(0xf5a9c7).setTitle(`${G2} 𝓟𝓱𝓪̂̀𝓷 𝓣𝓱𝓾̛𝓸̛̉𝓷𝓰 · 仙令 ${G3}`).setDescription([`${IMMORTAL_ORDER_EMOJI} ${user} · **${n(snapshot.state.points)} điểm**`, notice || '', '', ...lines].filter(Boolean).join('\n'));
}

export function buildImmortalOrderMainRows(ownerId) {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`tutien_immortal_order:${ownerId}:quests`).setLabel('Nhiệm Vụ').setEmoji(ORDER_EMOJI).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`tutien_immortal_order:${ownerId}:rewards`).setLabel('Phần Thưởng').setEmoji(CHEST_EMOJI).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`tutien_immortal_order:${ownerId}:dashboard`).setLabel('Quay Lại').setStyle(ButtonStyle.Secondary),
  )];
}

export function buildImmortalOrderSubRows(ownerId, snapshot, view = 'quests') {
  const rows = [];
  if (view === 'rewards') {
    const claimable = IMMORTAL_ORDER_MILESTONES.filter(m => snapshot.state.points >= m.points && !snapshot.state.claimedMilestones[String(m.points)]);
    for (let i = 0; i < claimable.length; i += 5) {
      rows.push(new ActionRowBuilder().addComponents(...claimable.slice(i, i + 5).map(m => new ButtonBuilder().setCustomId(`tutien_immortal_order:${ownerId}:claim:${m.points}`).setLabel(`Nhận ${n(m.points)}`).setEmoji(CHEST_EMOJI).setStyle(ButtonStyle.Success))));
    }
  }
  rows.push(new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`tutien_immortal_order:${ownerId}:main`).setLabel('Tiên Lệnh').setEmoji(ORDER_EMOJI).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId(`tutien_immortal_order:${ownerId}:${view === 'quests' ? 'rewards' : 'quests'}`).setLabel(view === 'quests' ? 'Phần Thưởng' : 'Nhiệm Vụ').setStyle(ButtonStyle.Secondary),
  ));
  return rows;
}
