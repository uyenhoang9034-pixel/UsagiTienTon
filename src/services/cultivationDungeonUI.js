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
  DUNGEON_DAILY_ATTEMPTS,
  DUNGEON_SHOP,
} from './cultivationDungeon.js';

import {
  getRealmDisplay,
} from './cultivationService.js';

const TITLE_LEFT = '<a:trangtrig2:1546040703375904801>';
const TITLE_RIGHT = '<a:trangtrig3:1546040818261954610>';
const DUNGEON = '<:ttbicanh:1548997554677485608>';
const ESSENCE = '<a:ttbicanhtinhhoa:1549001027259465738>';
const GATE = '<a:ttcongda:1547491949945028669>';
const MONSTER = '<a:ttyeuthu:1547477368820469780>';
const COMBAT = '<a:ttgiaochien:1547482030747680898>';
const HP = '<a:ttsinhmenh:1548969011163959337>';
const ARMOR = '<a:ttmagiap:1548969902495375390>';
const CHEST = '<a:ttruongco:1547493008914653245>';
const VICTORY = '<a:ttchienthang:1547493833724403722>';
const DEFEAT = '<a:ttthatbai:1547495028480409783>';
const DANGER = '<a:ttnguyhiem:1547495450385317928>';
const PET = '<a:ttlinhthu2:1547478815452954654>';
const FORMATION = '<a:ttrando:1547820131889979464>';
const STONE = '<a:ttlinhthach:1547448522125869126>';
const HERB = '<a:ttlinhthao:1547464708318167122>';
const ORE = '<a:tthuyenthiet:1547448560818065498>';
const MANUAL = '<a:ttkiempho:1547448592975790080>';
const TALISMAN = '<a:ttphu:1547448667630207086>';
const FORMATION_ESSENCE = '<a:ttranvan:1547959053114671297>';
const SEPARATOR = '꒷꒦︶꒷꒦︶ ๋ ࣭ ⭑꒷꒦';

const BUTTON_EMOJI = {
  dungeon: { id: '1548997554677485608' },
  essence: { id: '1549001027259465738' },
  gate: { id: '1547491949945028669' },
  monster: { id: '1547477368820469780' },
  combat: { id: '1547482030747680898' },
  leaderboard: { id: '1547301799273435177' },
  chest: { id: '1547493008914653245' },
  defeat: { id: '1547495028480409783' },
  victory: { id: '1547493833724403722' },
  formation: { id: '1547915911497785435' },
  pet: { id: '1547305016694669503' },
  herb: { id: '1547464708318167122' },
  ore: { id: '1547448560818065498' },
  manual: { id: '1547448592975790080' },
  talisman: { id: '1547448667630207086' },
  formationEssence: { id: '1547959053114671297' },
};

function number(value) {
  return new Intl.NumberFormat('vi-VN').format(
    Math.max(0, Math.round(Number(value) || 0)),
  );
}

function title(label) {
  return `${TITLE_LEFT} ${label} ${TITLE_RIGHT}`;
}

function style(embed) {
  embed.setColor(CULTIVATION_CONFIG.ui.color);
  embed.setFooter({ text: CULTIVATION_CONFIG.ui.footer });

  if (CULTIVATION_CONFIG.ui.image) {
    embed.setImage(CULTIVATION_CONFIG.ui.image);
  }

  return embed;
}

function button(ownerId, action, label, emoji, buttonStyle = ButtonStyle.Secondary) {
  return new ButtonBuilder()
    .setCustomId(`tutien_dungeon:${ownerId}:${action}`)
    .setLabel(label)
    .setEmoji(emoji)
    .setStyle(buttonStyle);
}

function hpBar(hp, size = 16) {
  const ratio = Math.max(0, Math.min(1, (Number(hp) || 0) / 100));
  const filled = Math.round(ratio * size);
  return `${'█'.repeat(filled)}${'░'.repeat(Math.max(0, size - filled))}`;
}

function attemptsText(snapshot) {
  if (snapshot.isAdmin) {
    return '**∞ · GM**';
  }

  return `**${snapshot.attemptsRemaining} / ${DUNGEON_DAILY_ATTEMPTS}**`;
}

function petLine(snapshot) {
  if (!snapshot.pet) {
    return `${PET} **Linh Thú:** Chưa xuất chiến · **+0% Vượt Ải**`;
  }

  return `${snapshot.pet.emoji || PET} **Linh Thú:** **${snapshot.pet.name}** · ${snapshot.pet.rarity} · **+${snapshot.petBonus}% Vượt Ải**`;
}

function formationLine(snapshot) {
  const info = snapshot.formation;

  if (!info?.formation) {
    return `${FORMATION} **Trận Pháp:** Chưa bố trí · **Giảm 0% Sinh Mệnh tổn thất**`;
  }

  return `${FORMATION} **Trận Pháp:** **${info.formation.name} · Lv.${info.level}** · **Giảm ${info.reduction}% Sinh Mệnh tổn thất**`;
}

export function getDungeonDashboardButton(ownerId) {
  return button(ownerId, 'main', 'Bí Cảnh', BUTTON_EMOJI.dungeon);
}

export function buildDungeonMainEmbed(user, snapshot, notice = null) {
  const active = snapshot.state.activeRun;
  const lines = [
    '*Linh vụ che trời, cổ địa mở lối. Mỗi bước tiến sâu đều ẩn chứa cơ duyên cùng sát kiếp.*',
    '',
    `${CULTIVATION_CONFIG.ui.emojis.user} **Đạo Hữu:** <@${user.id}>`,
    `${CULTIVATION_CONFIG.ui.emojis.realm} **Cảnh Giới:** **${getRealmDisplay(snapshot.profile)}**`,
    `${DUNGEON} **Lượt Bí Cảnh hôm nay:** ${attemptsText(snapshot)}`,
    `${ESSENCE} **Bí Cảnh Tinh Hoa:** **${number(snapshot.state.essence)}**`,
    '',
    `${GATE} **Tiến Độ**`,
    `Tầng cao nhất: **Tầng ${snapshot.state.highestFloor}**`,
    active
      ? `Đang khiêu chiến: **Tầng ${active.floor}** · ${HP} **${active.hp}% Sinh Mệnh**`
      : `Tầng kế tiếp: **Tầng ${snapshot.floor}**`,
    '',
    petLine(snapshot),
    formationLine(snapshot),
    '',
    `${DANGER} **Quy Tắc**`,
    '• Mỗi ngày **3 lượt**; không thể mua hoặc đổi thêm lượt.',
    '• Role Admin Tiên Lộ được **∞ lượt** để kiểm thử.',
    '• Một lượt có thể vượt liên tục nhiều tầng cho đến khi thất bại, hết Sinh Mệnh hoặc chủ động rời.',
    '• Mỗi tầng đều hao Sinh Mệnh; Sinh Mệnh **không hồi lại** giữa các tầng.',
    '• Linh Thú tăng tỷ lệ vượt ải; Trận Pháp giảm lượng Sinh Mệnh bị mất.',
    '• Tỷ lệ cuối từ **100% trở lên** sẽ chắc chắn vượt ải.',
    '• Bí Cảnh **không thưởng Tu Vi**.',
  ];

  if (notice) {
    lines.push('', SEPARATOR, '', notice);
  }

  lines.push('', '*Nhất niệm nhập bí cảnh, sinh tử đều do đạo tâm.*');

  return style(
    new EmbedBuilder()
      .setTitle(title('BÍ CẢNH · 秘境'))
      .setDescription(lines.join('\n')),
  );
}

export function buildDungeonMainRows(ownerId, snapshot) {
  const active = Boolean(snapshot.state.activeRun);
  const cannotStart = !snapshot.isAdmin && snapshot.attemptsRemaining <= 0 && !active;

  const enter = button(
    ownerId,
    active ? 'floor' : 'start',
    active ? 'Tiếp Tục Bí Cảnh' : 'Tiến Vào Bí Cảnh',
    active ? BUTTON_EMOJI.gate : BUTTON_EMOJI.dungeon,
    ButtonStyle.Secondary,
  ).setDisabled(cannotStart);

  return [
    new ActionRowBuilder().addComponents(
      enter,
      button(ownerId, 'leaderboard', 'Bảng Xếp Hạng', BUTTON_EMOJI.leaderboard),
      button(ownerId, 'shop', 'Kho Bí Cảnh', BUTTON_EMOJI.essence),
      button(ownerId, 'dashboard', 'Quay Lại Tiên Lộ', BUTTON_EMOJI.gate),
    ),
  ];
}

export function buildDungeonFloorEmbed(user, snapshot) {
  const run = snapshot.state.activeRun;
  const floor = run?.floor || snapshot.floor;
  const guardian = floor % 5 === 0;
  const majorBoss = floor % 10 === 0;

  return style(
    new EmbedBuilder()
      .setTitle(
        title(
          guardian
            ? `THỦ HỘ GIẢ · TẦNG ${floor}`
            : `BÍ CẢNH · TẦNG ${floor}`,
        ),
      )
      .setDescription([
        `${guardian ? MONSTER : GATE} **${majorBoss ? 'Cổ Cảnh Đại Thủ Hộ' : guardian ? 'Thủ Hộ Giả Bí Cảnh' : 'Cổ Cảnh Vô Danh'}**`,
        '',
        `${HP} **Sinh Mệnh Đạo Hữu**`,
        `\`${hpBar(run?.hp ?? 100)}\` **${run?.hp ?? 100}%**`,
        '',
        `${COMBAT} **Tỷ Lệ Vượt Ải Cơ Bản:** **${snapshot.baseChance}%**`,
        petLine(snapshot),
        `${VICTORY} **Tỷ Lệ Vượt Ải Cuối:** **${snapshot.successChance}%**${snapshot.successChance >= 100 ? ' · Chắc chắn thành công' : ''}`,
        '',
        formationLine(snapshot),
        '',
        `${CHEST} **Phần thưởng khi vượt tầng**`,
        `• ${STONE} Linh Thạch`,
        `• ${HERB} Thiên Linh Thảo`,
        `• ${ORE} Huyền Thiết`,
        `• ${MANUAL} Vô Danh Kiếm Phổ`,
        `• ${TALISMAN} Thượng Cổ Phù`,
        `• ${FORMATION_ESSENCE} Trận Văn`,
        `• ${ESSENCE} Bí Cảnh Tinh Hoa`,
        '',
        `${DANGER} *Mỗi lần vượt tầng đều hao Sinh Mệnh. Không có hồi máu tự động giữa các tầng.*`,
      ].join('\n')),
  );
}

export function buildDungeonFloorRows(ownerId) {
  return [
    new ActionRowBuilder().addComponents(
      button(ownerId, 'challenge', 'Vượt Ải', BUTTON_EMOJI.combat, ButtonStyle.Primary),
      button(ownerId, 'leave', 'Rời Bí Cảnh', BUTTON_EMOJI.defeat),
      button(ownerId, 'main', 'Bí Cảnh', BUTTON_EMOJI.dungeon),
    ),
  ];
}

function rewardLines(reward) {
  return [
    `${STONE} Linh Thạch: **+${number(reward.spiritStones)}**`,
    `${ESSENCE} Bí Cảnh Tinh Hoa: **+${number(reward.essence)}**`,
    `${HERB} Thiên Linh Thảo: **+${number(reward.items.thien_linh_thao)}**`,
    `${ORE} Huyền Thiết: **+${number(reward.items.huyen_thiet)}**`,
    `${MANUAL} Vô Danh Kiếm Phổ: **+${number(reward.items.vo_danh_kiem_pho)}**`,
    `${TALISMAN} Thượng Cổ Phù: **+${number(reward.items.co_phu)}**`,
    `${FORMATION_ESSENCE} Trận Văn: **+${number(reward.formationEssence)}**`,
  ];
}

export function buildDungeonSuccessEmbed(user, result) {
  const lines = [
    `${VICTORY} **Đã vượt qua Tầng ${result.floor}.**`,
    '',
    `${COMBAT} Tỷ lệ vượt ải: **${result.successChance}%**`,
    result.pet
      ? `${result.pet.emoji || PET} ${result.pet.name}: **+${result.petBonus}% Vượt Ải**`
      : `${PET} Linh Thú: **+0%**`,
    `${FORMATION} ${result.formation.formation?.name || 'Chưa bố trí'} · Lv.${result.formation.level || 0}: **Giảm ${result.formation.reduction || 0}% tổn thất**`,
    '',
    `${HP} **Sinh Mệnh:** ${result.hpBefore}% → **${result.hpAfter}%**`,
    `Tổn thất tầng này: **-${result.hpLoss}%**${result.rawHpLoss !== result.hpLoss ? ` · trước Trận Pháp: ${result.rawHpLoss}%` : ''}`,
    '',
    `${CHEST} **Chiến Lợi Phẩm**`,
    ...rewardLines(result.reward),
    '',
    SEPARATOR,
    '',
    result.exhausted
      ? `${DEFEAT} **Sinh Mệnh đã cạn sau khi phá tầng. Lượt Bí Cảnh kết thúc.**`
      : `${GATE} Tầng tiếp theo: **Tầng ${result.nextFloor}**`,
    '',
    '*Bí Cảnh chỉ ban tài nguyên, không ban Tu Vi.*',
  ];

  return style(
    new EmbedBuilder()
      .setTitle(title('PHÁ TẦNG THÀNH CÔNG'))
      .setDescription(lines.join('\n')),
  );
}

export function buildDungeonSuccessRows(ownerId, result) {
  if (result.exhausted) {
    return [
      new ActionRowBuilder().addComponents(
        button(ownerId, 'main', 'Quay Lại Bí Cảnh', BUTTON_EMOJI.dungeon),
        button(ownerId, 'dashboard', 'Tiên Lộ', BUTTON_EMOJI.gate),
      ),
    ];
  }

  return [
    new ActionRowBuilder().addComponents(
      button(ownerId, 'floor', `Tiếp Tục Tầng ${result.nextFloor}`, BUTTON_EMOJI.gate, ButtonStyle.Primary),
      button(ownerId, 'leave', 'Nhận Thưởng & Rời', BUTTON_EMOJI.chest),
    ),
  ];
}

export function buildDungeonFailureEmbed(result) {
  return style(
    new EmbedBuilder()
      .setTitle(title('BÍ CẢNH · THẤT THỦ'))
      .setDescription([
        `${DEFEAT} **Đạo tâm thất thủ tại Tầng ${result.floor}.**`,
        '',
        `${COMBAT} Tỷ lệ vượt ải: **${result.successChance}%**`,
        result.pet
          ? `${result.pet.emoji || PET} ${result.pet.name}: **+${result.petBonus}% Vượt Ải**`
          : `${PET} Linh Thú: **+0%**`,
        `${FORMATION} ${result.formation.formation?.name || 'Chưa bố trí'} · Lv.${result.formation.level || 0}: **Giảm ${result.formation.reduction || 0}% tổn thất**`,
        '',
        `${HP} Sinh Mệnh trước giao chiến: **${result.hpBefore}%**`,
        `${HP} Sinh Mệnh sau thất thủ: **${result.hpAfter}%**`,
        `Tổn thất: **-${result.hpLoss}%**`,
        '',
        `${DANGER} Tầng ${result.floor} **chưa được tính là vượt qua** và không nhận phần thưởng tầng này.`,
        'Những tài nguyên đã nhận từ các tầng trước vẫn được giữ nguyên.',
        '',
        '*Một lần thất bại chưa đủ đoạn tiên đồ.*',
      ].join('\n')),
  );
}

export function buildDungeonFailureRows(ownerId) {
  return [
    new ActionRowBuilder().addComponents(
      button(ownerId, 'main', 'Quay Lại Bí Cảnh', BUTTON_EMOJI.dungeon),
      button(ownerId, 'dashboard', 'Tiên Lộ', BUTTON_EMOJI.gate),
    ),
  ];
}

export function buildDungeonShopEmbed(snapshot, notice = null) {
  const lines = [
    '*Cổ vật ngủ sâu trong Bí Cảnh, chỉ kẻ mang theo Tinh Hoa mới có thể đổi lấy.*',
    '',
    `${ESSENCE} **Bí Cảnh Tinh Hoa:** **${number(snapshot.state.essence)}**`,
    '',
    `${HERB} **Thiên Linh Thảo ×1** · **${DUNGEON_SHOP.thien_linh_thao.price} Tinh Hoa**`,
    `${ORE} **Huyền Thiết ×1** · **${DUNGEON_SHOP.huyen_thiet.price} Tinh Hoa**`,
    `${MANUAL} **Vô Danh Kiếm Phổ ×1** · **${DUNGEON_SHOP.vo_danh_kiem_pho.price} Tinh Hoa**`,
    `${TALISMAN} **Thượng Cổ Phù ×1** · **${DUNGEON_SHOP.co_phu.price} Tinh Hoa**`,
    `${FORMATION_ESSENCE} **Trận Văn ×1** · **${DUNGEON_SHOP.tran_van.price} Tinh Hoa**`,
  ];

  if (notice) {
    lines.push('', SEPARATOR, '', notice);
  }

  lines.push('', '*Mỗi lần đổi chỉ nhận ×1 vật phẩm.*');

  return style(
    new EmbedBuilder()
      .setTitle(title('KHO BÍ CẢNH'))
      .setDescription(lines.join('\n')),
  );
}

export function buildDungeonShopRows(ownerId, snapshot) {
  return [
    new ActionRowBuilder().addComponents(
      button(ownerId, 'buy_thien_linh_thao', 'Thiên Linh Thảo', BUTTON_EMOJI.herb)
        .setDisabled(snapshot.state.essence < DUNGEON_SHOP.thien_linh_thao.price),
      button(ownerId, 'buy_huyen_thiet', 'Huyền Thiết', BUTTON_EMOJI.ore)
        .setDisabled(snapshot.state.essence < DUNGEON_SHOP.huyen_thiet.price),
      button(ownerId, 'buy_vo_danh_kiem_pho', 'Vô Danh Kiếm Phổ', BUTTON_EMOJI.manual)
        .setDisabled(snapshot.state.essence < DUNGEON_SHOP.vo_danh_kiem_pho.price),
      button(ownerId, 'buy_co_phu', 'Thượng Cổ Phù', BUTTON_EMOJI.talisman)
        .setDisabled(snapshot.state.essence < DUNGEON_SHOP.co_phu.price),
      button(ownerId, 'buy_tran_van', 'Trận Văn', BUTTON_EMOJI.formationEssence)
        .setDisabled(snapshot.state.essence < DUNGEON_SHOP.tran_van.price),
    ),
    new ActionRowBuilder().addComponents(
      button(ownerId, 'main', 'Quay Lại Bí Cảnh', BUTTON_EMOJI.dungeon),
    ),
  ];
}

export function buildDungeonLeaderboardEmbed(entries) {
  const lines = entries.length
    ? entries.map((entry, index) => {
        const medal = ['🥇', '🥈', '🥉'][index] || `**#${index + 1}**`;
        return `${medal} <@${entry.userId}> · **Tầng ${entry.highestFloor}** · ${ESSENCE} ${number(entry.essence)}`;
      })
    : ['*Chưa có đạo hữu nào lưu lại chiến tích Bí Cảnh.*'];

  return style(
    new EmbedBuilder()
      .setTitle(title('BÍ CẢNH · TIÊN BẢNG'))
      .setDescription([
        `${DUNGEON} **Xếp hạng theo tầng cao nhất đã vượt.**`,
        '',
        ...lines,
      ].join('\n')),
  );
}

export function buildDungeonLeaderboardRows(ownerId) {
  return [
    new ActionRowBuilder().addComponents(
      button(ownerId, 'main', 'Quay Lại Bí Cảnh', BUTTON_EMOJI.dungeon),
    ),
  ];
}
