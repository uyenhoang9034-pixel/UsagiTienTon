import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { getHeavenlySecret, getNextHeavenlyReset } from './cultivationHeavenlySecret.js';

const BUTTON_EMOJI = { id:'1546093044535660644', name:'trangtri1', animated:false };

function remaining(ms) {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours && minutes) return `${hours} giờ ${minutes} phút`;
  if (hours) return `${hours} giờ`;
  return `${minutes} phút`;
}

export function getHeavenlySecretDashboardButton(ownerId) {
  return new ButtonBuilder().setCustomId(`tutien_action:${ownerId}:heavenly_secret`).setLabel('Thiên Cơ').setEmoji(BUTTON_EMOJI).setStyle(ButtonStyle.Secondary);
}

export function buildHeavenlySecretEmbed(guildId, now = new Date()) {
  const secret = getHeavenlySecret(guildId, now);
  const effectLines = secret.lines.flatMap(([emoji, system, text]) => [`${emoji} **${system}**`, `└ ${text}`, '']);
  return new EmbedBuilder()
    .setColor(0xF4A7C5)
    .setDescription([
      '<a:trangtrig2:1546040703375904801> 𝓣𝓱𝓲𝓮̂𝓷 𝓒𝓸̛ 𝓒𝓪́𝓬 · 天機閣 <a:trangtrig3:1546040818261954610>',
      '',
      '**THIÊN CƠ HIỆN THẾ**',
      '',
      '*“Thiên đạo vận chuyển, tinh tượng đổi dời.\\nMột quẻ vừa khai — vạn vật trong Tiên Lộ đều chịu ảnh hưởng.”*',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━',
      '',
      '<:trangtri1:1546093044535660644> **Thiên Cơ**',
      `「 **${secret.name}** 」`,
      '',
      `${secret.omenData.emoji} Điềm: **${secret.omenData.label}**`,
      '',
      `*${secret.lore}*`,
      '',
      '<a:trangtrig46:1547240249761996812> **Ảnh hưởng toàn Tiên Lộ**',
      '',
      ...effectLines,
      '━━━━━━━━━━━━━━━━━━━━━━',
      '',
      '<a:ttnhiemvu:1547682200961556510> **Thiên cơ còn hiệu lực**',
      remaining(getNextHeavenlyReset(now)),
      '',
      '<a:tttrang:1547448866440347739> **Thiên cơ kế tiếp**',
      'Ngày mai · 00:00',
      '',
      '━━━━━━━━━━━━━━━━━━━━━━',
      '',
      '「天機不可泄露」',
      '*Thiên cơ bất khả tiết lộ — thuận thiên giả hưng, nghịch thiên giả... vẫn phải farm.*',
    ].join('\n'));
}

export function buildHeavenlySecretRows(ownerId) {
  return [new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`tutien_action:${ownerId}:dashboard`).setLabel('Quay lại Tiên Lộ').setEmoji(BUTTON_EMOJI).setStyle(ButtonStyle.Secondary),
  )];
}
