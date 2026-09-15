import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { CULTIVATION_CONFIG } from '../config/cultivationGame.js';
import { CAVE_BUILDINGS, getCaveUpgradeCost } from './cultivationCave.js';

const E = {
  start: '<a:trangtrig2:1546040703375904801>', end: '<a:trangtrig3:1546040818261954610>',
  gate: '<a:ttcongda:1547491949945028669>', gateId: '1547491949945028669',
  herb: '<a:ttlinhthao:1547464708318167122>', herbId: '1547464708318167122',
  qi: '<a:ttlinhkhi:1547485632971149442>', qiId: '1547485632971149442',
  furnace: '<a:ttlobatquai:1547448473882861659>', furnaceId: '1547448473882861659',
  sword: '<a:ttkiem:1547448386771222619>', swordId: '1547448386771222619',
  pet: '<a:ttlinhthu2:1547478815452954654>', petId: '1547478815452954654',
  stone: '<a:ttlinhthach:1547448522125869126>', ore: '<a:tthuyenthiet:1547448560818065498>',
  chest: '<a:ttruongco:1547493008914653245>', chestId: '1547493008914653245',
};
const BUILDING_EMOJI = { field: E.herb, gathering: E.qi, alchemy: E.furnace, forge: E.sword, pet: E.pet };
const BUILDING_BUTTON_EMOJI = { field: E.herbId, gathering: E.qiId, alchemy: E.furnaceId, forge: E.swordId, pet: E.petId };
function num(v) { return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(Number(v) || 0); }
function pct(v) { return `${Math.round((Number(v) || 0) * 100)}%`; }
function button(id, label, emojiId, style = ButtonStyle.Secondary) { return new ButtonBuilder().setCustomId(id).setLabel(label).setStyle(style).setEmoji({ id: emojiId, animated: true }); }
function base(title) { return new EmbedBuilder().setColor(CULTIVATION_CONFIG.ui.color).setTitle(`${E.start} ${title} ${E.end}`).setFooter({ text: CULTIVATION_CONFIG.ui.footer }); }

export function getCaveDashboardButton(ownerId) {
  return button(`tutien_cave:${ownerId}:main`, 'Động Phủ', E.gateId);
}

export function buildCaveMainEmbed(s) {
  const b = s.state.buildings;
  return base('𝓓𝓸̣̂𝓷𝓰 𝓟𝓱𝓾̉ · 洞府').setDescription([
    `${E.gate} **TIÊN GIA ĐỘNG PHỦ**`, '',
    'Một phương động thiên, một chốn tiên cư. Vạn vật nơi đây đều do chính đạo hữu từng bước kiến tạo.', '',
    `${E.gate} **${s.caveName}** · Tổng cấp xây dựng **${s.totalLevel}**`,
    `${E.qi} Tụ Linh hiệu quả: **+${pct(s.gatheringBonus)} sản lượng**`,
    `${E.herb} Linh Điền: **${num(s.state.storedHerbs)} / ${num(s.herbCapacity)} Thiên Linh Thảo**`,
    `${E.herb} Sản lượng: **${num(s.herbPerDay)} / ngày**`, '',
    '**CÔNG TRÌNH**',
    `${E.herb} Linh Điền · **Lv.${b.field}**`,
    `${E.qi} Tụ Linh Trận · **Lv.${b.gathering}**`,
    `${E.furnace} Luyện Đan Phòng · **Lv.${b.alchemy}** · +${pct(s.alchemyBonus)}`,
    `${E.sword} Luyện Khí Thất · **Lv.${b.forge}** · +${pct(s.forgeBonus)}`,
    `${E.pet} Linh Thú Viên · **Lv.${b.pet}** · +${pct(s.petBonus)}`,
  ].join('\n'));
}

export function buildCaveMainRows(ownerId) {
  return [
    new ActionRowBuilder().addComponents(
      button(`tutien_cave:${ownerId}:building:field`, 'Linh Điền', E.herbId),
      button(`tutien_cave:${ownerId}:building:gathering`, 'Tụ Linh Trận', E.qiId),
      button(`tutien_cave:${ownerId}:building:alchemy`, 'Luyện Đan Phòng', E.furnaceId),
      button(`tutien_cave:${ownerId}:building:forge`, 'Luyện Khí Thất', E.swordId),
      button(`tutien_cave:${ownerId}:building:pet`, 'Linh Thú Viên', E.petId),
    ),
    new ActionRowBuilder().addComponents(
      button(`tutien_cave:${ownerId}:collect`, 'Thu Hoạch', E.chestId, ButtonStyle.Success),
      button(`tutien_action:${ownerId}:dashboard`, 'Quay Lại', E.gateId),
    ),
  ];
}

export function buildCaveBuildingEmbed(s, id, notice = null) {
  const cfg = CAVE_BUILDINGS[id];
  const level = s.state.buildings[id];
  const cost = getCaveUpgradeCost(id, level);
  const effect = id === 'field' ? `${num(s.herbPerDay)} Thiên Linh Thảo / ngày`
    : id === 'gathering' ? `+${pct(s.gatheringBonus)} sản lượng Động Phủ`
    : id === 'alchemy' ? `+${pct(s.alchemyBonus)} tỷ lệ Luyện Đan`
    : id === 'forge' ? `+${pct(s.forgeBonus)} tỷ lệ Luyện Khí`
    : `+${pct(s.petBonus)} hiệu quả trợ lực Linh Thú`;
  const lines = [`${BUILDING_EMOJI[id]} **${cfg.name.toUpperCase()}**`, '', cfg.description, '', `Cấp hiện tại: **Lv.${level} / 10**`, `Hiệu quả: **${effect}**`];
  if (notice) lines.push('', notice);
  if (cost) lines.push('', '**NÂNG CẤP TIẾP THEO**', `${E.stone} ${num(cost.spiritStones)} Linh Thạch`, `${E.ore} ${num(cost.huyenThiet)} Huyền Thiết`);
  else lines.push('', '**Công trình đã đạt cấp tối đa.**');
  return base(`${cfg.name} · 洞府`).setDescription(lines.join('\n'));
}

export function buildCaveBuildingRows(ownerId, id, level) {
  const row = new ActionRowBuilder();
  if (level < 10) row.addComponents(button(`tutien_cave:${ownerId}:upgrade:${id}`, 'Nâng Cấp', BUILDING_BUTTON_EMOJI[id], ButtonStyle.Success));
  row.addComponents(button(`tutien_cave:${ownerId}:main`, 'Quay Lại', E.gateId));
  return [row];
}
