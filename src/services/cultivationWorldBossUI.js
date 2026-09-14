import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';

import { CULTIVATION_CONFIG } from '../config/cultivationGame.js';
import {
  WORLD_BOSS_ATTACK_LIMIT,
  getWorldBossLeaderboard,
  getWorldBossTotalDamage,
} from './cultivationWorldBoss.js';

const TITLE_LEFT = '<a:trangtrig2:1546040703375904801>';
const TITLE_RIGHT = '<a:trangtrig3:1546040818261954610>';
const BOSS = '<a:ttbossthegioi:1548967721440387102>';
const HP = '<a:ttsinhmenh:1548969011163959337>';
const FIGHT = '<a:ttgiaochien:1547482030747680898>';
const RAGE = '<a:trangtrig29:1546385117478527016>';
const ARMOR = '<a:ttmagiap:1548969902495375390>';
const KILL = '<a:trangtrig31:1546905996893626440>';
const CHEST = '<a:ttruongco:1547493008914653245>';
const BOARD = '<:tttienbang:1547301799273435177>';
const SEPARATOR = '⋆༺𓆩☠︎︎𓆪༻⋆';

function parseEmoji(value) {
  const match = String(value || '').match(/^<(a?):([^:]+):(\d+)>$/);
  if (!match) return null;
  return { id: match[3], name: match[2], animated: match[1] === 'a' };
}

function number(value) {
  return new Intl.NumberFormat('vi-VN').format(
    Math.max(0, Math.round(Number(value) || 0)),
  );
}

function percent(value) {
  return `${((Math.max(0, Number(value) || 0)) * 100).toFixed(2).replace('.', ',')}%`;
}

function applyStyle(embed) {
  embed.setColor(CULTIVATION_CONFIG.ui.color);
  embed.setFooter({ text: CULTIVATION_CONFIG.ui.footer });
  if (CULTIVATION_CONFIG.ui.image) embed.setImage(CULTIVATION_CONFIG.ui.image);
  return embed;
}

function progressBar(current, max, size = 14) {
  const safeMax = Math.max(1, Number(max) || 1);
  const ratio = Math.max(0, Math.min(1, (Number(current) || 0) / safeMax));
  const filled = Math.round(ratio * size);
  return `${'█'.repeat(filled)}${'░'.repeat(size - filled)}`;
}

function relativeTimestamp(ms) {
  return `<t:${Math.floor(Number(ms) / 1000)}:R>`;
}

export function buildWorldBossEmbed(user, state, notice = null) {
  const entry = state.participants?.[user.id] || {
    damage: 0,
    attacks: 0,
    bestHit: 0,
  };
  const board = getWorldBossLeaderboard(state);
  const rank = board.findIndex(item => item.userId === user.id) + 1;
  const hpRatio = state.maxHp > 0 ? state.currentHp / state.maxHp : 0;
  const totalDamage = getWorldBossTotalDamage(state);
  const contributionRate = totalDamage > 0 ? entry.damage / totalDamage : 0;
  const ended = state.status !== 'active';

  const topLines = board.slice(0, 5).map((item, index) =>
    `**#${index + 1}** <@${item.userId}> · ${FIGHT} **${number(item.damage)}**`,
  );

  const lines = [
    `${BOSS} **${state.bossName}**`,
    '',
    `${HP} **Sinh Mệnh**`,
    `\`${progressBar(state.currentHp, state.maxHp)}\` **${number(state.currentHp)} / ${number(state.maxHp)}**`,
    `${RAGE} Cuồng Nộ: ${hpRatio <= 0.30 && !ended ? '**Đã thức tỉnh**' : '*Chưa kích hoạt*'}`,
    `${ARMOR} Ma Giáp: **Yêu lực hộ thể**`,
    '',
    SEPARATOR,
    '',
    `${FIGHT} **Thành tích của đạo hữu**`,
    `Sát thương: **${number(entry.damage)}**`,
    `Lượt khiêu chiến: **${number(entry.attacks)} / ${WORLD_BOSS_ATTACK_LIMIT}**`,
    `Xếp hạng đóng góp: **${rank > 0 ? `#${rank}` : 'Chưa xếp hạng'}**`,
    `Tỷ lệ đóng góp: **${percent(contributionRate)}**`,
    '',
    state.status === 'active'
      ? `⏳ Yêu Vương rút lui ${relativeTimestamp(state.endsAt)}`
      : state.endReason === 'defeated'
        ? `${KILL} **Yêu Vương đã bị trảm sát.**`
        : '*Yêu Vương đã rút khỏi Tiên Vực.*',
  ];

  if (topLines.length > 0) {
    lines.push('', SEPARATOR, '', `${BOARD} **Bảng Đóng Góp**`, ...topLines);
  }

  if (notice) lines.push('', SEPARATOR, '', notice);

  return applyStyle(
    new EmbedBuilder()
      .setTitle(`${TITLE_LEFT} **THẾ GIỚI BOSS · YÊU VƯƠNG** ${TITLE_RIGHT}`)
      .setDescription(lines.join('\n').slice(0, 4096)),
  );
}

export function buildWorldBossRows(ownerId, state) {
  const attacks = Number(state.participants?.[ownerId]?.attacks) || 0;
  const canAttack =
    state.status === 'active' &&
    state.currentHp > 0 &&
    attacks < WORLD_BOSS_ATTACK_LIMIT;

  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tutien_world_boss:${ownerId}:attack`)
        .setLabel(canAttack ? 'Khiêu Chiến' : 'Hết Lượt / Đã Kết Thúc')
        .setEmoji(parseEmoji(FIGHT))
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(!canAttack),
      new ButtonBuilder()
        .setCustomId(`tutien_world_boss:${ownerId}:refresh`)
        .setLabel('Cập Nhật')
        .setEmoji(parseEmoji(BOSS))
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`tutien_world_boss:${ownerId}:dashboard`)
        .setLabel('Quay lại Tiên Lộ')
        .setEmoji(parseEmoji(BOSS))
        .setStyle(ButtonStyle.Secondary),
    ),
  ];
}

export function buildWorldBossRewardMessage(record) {
  const defeated = record.endReason === 'defeated';
  const opening = defeated
    ? `${KILL} Yêu Vương đã bị chư vị đạo hữu hợp lực trảm sát.`
    : [
        'Yêu Vương đã rút khỏi Tiên Vực sau 24 giờ giao chiến.',
        '',
        'Dù chưa thể trảm sát Yêu Vương, công lao của chư vị đạo hữu vẫn được Tiên Môn ghi nhận.',
      ].join('\n');

  const content = [
    `${TITLE_LEFT} **THẾ GIỚI BOSS · CHIẾN LỢI PHẨM** ${TITLE_RIGHT}`,
    '',
    opening,
    '',
    SEPARATOR,
    `${FIGHT} Thành tích của đạo hữu`,
    '',
    `Tổng sát thương: ${number(record.damage)}`,
    `Lượt khiêu chiến: ${number(record.attacks)} / ${WORLD_BOSS_ATTACK_LIMIT}`,
    `Xếp hạng đóng góp: #${record.rank}`,
    `Tỷ lệ đóng góp: ${percent(record.contributionRate)}`,
    '',
    `${CHEST} Chiến lợi phẩm`,
    `**${number(record.reward)} Linh Thạch**`,
  ].join('\n');

  return {
    content,
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`tutien_world_boss_reward:${record.userId}:${record.eventId}`)
          .setLabel('Nhận Thưởng')
          .setEmoji(parseEmoji(CHEST))
          .setStyle(ButtonStyle.Secondary),
      ),
    ],
  };
}

export function getWorldBossDashboardButton(ownerId) {
  return new ButtonBuilder()
    .setCustomId(`tutien_world_boss:${ownerId}:open`)
    .setLabel('Thế Giới Boss')
    .setEmoji(parseEmoji(BOSS))
    .setStyle(ButtonStyle.Secondary);
}
