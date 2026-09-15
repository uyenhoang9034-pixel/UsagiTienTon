import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';
import { CULTIVATION_CONFIG } from '../config/cultivationGame.js';

const E = {
  start: '<a:trangtrig2:1546040703375904801>',
  end: '<a:trangtrig3:1546040818261954610>',
  lightning: '<a:ttthienloi:1547489755724382249>',
  hp: '<a:ttsinhmenh:1548969011163959337>',
  danger: '<a:ttnguyhiem:1547495450385317928>',
  win: '<a:ttchienthang:1547493833724403722>',
  fail: '<a:ttthatbai:1547495028480409783>',
  chest: '<a:ttruongco:1547493008914653245>',
  pet: '<a:ttlinhthu2:1547478815452954654>',
  formation: '<a:ttrando:1547820131889979464>',
  realm: '<a:ttcanhgioi:1547448784924180500>',
  cultivation: '<a:tttuvi:1547448737377427550>',
};

const THIEN_LOI_BUTTON_EMOJI_ID = '1547489755724382249';

function number(value) {
  return new Intl.NumberFormat('vi-VN').format(Math.max(0, Math.round(Number(value) || 0)));
}

function hpBar(hp) {
  const safe = Math.max(0, Math.min(100, Math.round(Number(hp) || 0)));
  const filled = Math.round(safe / 10);
  return `${'█'.repeat(filled)}${'░'.repeat(10 - filled)} ${safe}%`;
}

function title(text = '𝓣𝓱𝓲𝓮̂𝓷 𝓚𝓲𝓮̂́𝓹 · 天劫') {
  return `${E.start} ${text} ${E.end}`;
}

function baseEmbed() {
  return new EmbedBuilder()
    .setColor(CULTIVATION_CONFIG.ui.color)
    .setFooter({ text: CULTIVATION_CONFIG.ui.footer });
}

function supportLines(data) {
  const lines = [];
  if (data?.support?.pet) {
    lines.push(`${E.pet} **Linh Thú trợ kiếp**\n${data.support.pet.name} · **+${number(data.support.petBonus)}%** tỷ lệ chống đỡ`);
  } else {
    lines.push(`${E.pet} **Linh Thú trợ kiếp**\nKhông có Linh Thú xuất chiến`);
  }
  if (data?.support?.formation) {
    lines.push(`${E.formation} **Trận Pháp hộ đạo**\n${data.support.formation.name} · **Giảm ${number(data.support.damageReduction)}%** tổn thương`);
  } else {
    lines.push(`${E.formation} **Trận Pháp hộ đạo**\nChưa bố trí Trận Pháp`);
  }
  return lines;
}

export function buildTribulationPreviewEmbed(data) {
  if (!data?.ok) {
    const description = data?.reason === 'not_ready'
      ? `${E.danger} **BÌNH CẢNH CHƯA MỞ**\n\nTu Vi hiện tại chưa đủ để triệu dẫn Thiên Kiếp.\n\nCần: **${number(data.required)} Tu Vi**`
      : `${E.lightning} Thiên Kiếp chỉ xuất hiện từ **Chân Tiên trở lên** khi đạo hữu tiến hành Đột Phá.`;
    return baseEmbed().setTitle(title()).setDescription(description);
  }

  const s = data.session;
  return baseEmbed()
    .setTitle(title())
    .setDescription([
      `${E.lightning} **THIÊN ĐẠO GIÁNG KIẾP**`,
      '',
      'Thiên địa biến sắc, kiếp vân hội tụ.',
      'Từ Chân Tiên trở lên, muốn phá cảnh tất phải vượt qua Thiên Kiếp.',
      '',
      `${E.realm} **Cảnh giới hiện tại**\n${data.session.oldRealm || ''}`,
      '',
      `${E.hp} **Sinh Mệnh**\n${hpBar(s.hp)}`,
      '',
      `${E.danger} **Kiếp Lôi**\n${number(s.clearedBolts)} / ${number(s.totalBolts)}`,
      '',
      `${E.lightning} Tỷ lệ chống đỡ đạo kiếp tiếp theo: **${number(data.chance)}%**`,
      '',
      ...supportLines(data),
      '',
      data.active
        ? '*Thiên Kiếp đã bắt đầu. Phiên này được lưu lại cho đến khi thành công hoặc thất bại.*'
        : '*Một khi nghênh kiếp, không thể rút lui giữa chừng.*',
    ].join('\n'));
}

export function buildTribulationResultEmbed(result) {
  if (!result?.ok) {
    return baseEmbed().setTitle(title()).setDescription(`${E.danger} Không thể tiếp tục Thiên Kiếp lúc này.`);
  }

  if (result.completed && result.success) {
    return baseEmbed()
      .setTitle(title())
      .setDescription([
        `${E.win} **THIÊN KIẾP ĐÃ TAN**`,
        '',
        'Kiếp vân tản đi, đạo thể trải qua lôi kiếp đã thoát thai hoán cốt.',
        '',
        `${E.realm} **CẢNH GIỚI ĐỘT PHÁ**`,
        `${result.oldRealm}`,
        '↓',
        `**${result.newRealm}**`,
        '',
        `${E.lightning} Đã vượt: **${result.totalBolts} / ${result.totalBolts} Kiếp Lôi**`,
        `${E.hp} Sinh Mệnh còn lại: **${number(result.hpAfter)}%**`,
        '',
        `${E.chest} **THIÊN ĐẠO BAN THƯỞNG**`,
        `+${number(result.reward?.spiritStones)} Linh Thạch`,
        `+${number(result.reward?.thienLinhThao)} Thiên Linh Thảo`,
        `+${number(result.reward?.coPhu)} Thượng Cổ Phù`,
        '',
        `${E.win} *Nghịch thiên mà hành — tiên đồ lại mở thêm một bước.*`,
      ].join('\n'));
  }

  if (result.completed && !result.success) {
    return baseEmbed()
      .setTitle(title())
      .setDescription([
        `${E.fail} **ĐỘ KIẾP THẤT BẠI**`,
        '',
        `Đạo Thiên Lôi thứ **${result.bolt}** xuyên phá hộ thể chân nguyên.`,
        '',
        `${E.danger} **Kết quả**\nVượt qua: **${Math.max(0, result.bolt - 1)} / ${result.totalBolts} Kiếp Lôi**`,
        '',
        `${E.hp} **Sinh Mệnh**\n${hpBar(0)}`,
        '',
        `${E.cultivation} **Tu Vi tổn thất**\n-${number(result.loss)} Tu Vi`,
        '',
        'Cảnh giới không thay đổi. Khi Tu Vi đủ điều kiện, đạo hữu có thể triệu dẫn Thiên Kiếp lần nữa.',
      ].join('\n'));
  }

  const finalBolt = result.bolt >= result.totalBolts - 1;
  return baseEmbed()
    .setTitle(title(finalBolt ? '𝓒𝓾̛̉𝓾 𝓣𝓲𝓮̂𝓾 · 𝓣𝓱𝓲𝓮̂𝓷 𝓚𝓲𝓮̂́𝓹' : '𝓣𝓱𝓲𝓮̂𝓷 𝓚𝓲𝓮̂́𝓹 · 天劫'))
    .setDescription([
      `${E.lightning} **ĐỆ ${number(result.bolt)} ĐẠO · THIÊN LÔI**`,
      '',
      result.resisted
        ? `${E.win} **Chống đỡ thành công!**`
        : `${E.danger} **Hộ thể bị xuyên phá — chịu trọng kích!**`,
      '',
      `${E.hp} **Sinh Mệnh**\n${hpBar(result.hpAfter)}`,
      '',
      `${E.danger} **Kiếp Lôi**\n${number(result.bolt)} / ${number(result.totalBolts)}`,
      '',
      `${E.lightning} Tổn thương: **-${number(result.damage)}% Sinh Mệnh**`,
      result.support?.damageReduction > 0
        ? `${E.formation} Trận Pháp hóa giải **${number(result.support.damageReduction)}%** tổn thương`
        : null,
      '',
      finalBolt
        ? '**Đạo Thiên Lôi cuối cùng đang hội tụ.**'
        : `Tỷ lệ chống đỡ đạo tiếp theo: **${number(result.nextChance)}%**`,
    ].filter(Boolean).join('\n'));
}

function lightningButton(customId, label, style = ButtonStyle.Primary) {
  return new ButtonBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(style)
    .setEmoji({ id: THIEN_LOI_BUTTON_EMOJI_ID, animated: true });
}

export function buildTribulationPreviewRows(ownerId, data) {
  if (!data?.ok) {
    return [new ActionRowBuilder().addComponents(
      lightningButton(`tutien_action:${ownerId}:dashboard`, 'Quay Lại', ButtonStyle.Secondary),
    )];
  }
  return [new ActionRowBuilder().addComponents(
    lightningButton(
      `tutien_tribulation:${ownerId}:${data.active ? 'bolt' : 'start'}`,
      data.active ? 'Nghênh Kiếp Tiếp Theo' : 'Độ Kiếp',
      ButtonStyle.Danger,
    ),
    lightningButton(`tutien_action:${ownerId}:dashboard`, 'Quay Lại', ButtonStyle.Secondary),
  )];
}

export function buildTribulationResultRows(ownerId, result) {
  if (result?.completed) {
    return [new ActionRowBuilder().addComponents(
      lightningButton(`tutien_action:${ownerId}:dashboard`, 'Trở Về Tiên Lộ', ButtonStyle.Secondary),
    )];
  }
  const finalBolt = result?.bolt >= result?.totalBolts - 1;
  return [new ActionRowBuilder().addComponents(
    lightningButton(
      `tutien_tribulation:${ownerId}:bolt`,
      finalBolt ? 'NGHỊCH THIÊN MÀ HÀNH' : 'Nghênh Kiếp Tiếp Theo',
      ButtonStyle.Danger,
    ),
  )];
}
