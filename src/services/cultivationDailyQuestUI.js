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
  getDailyQuestCompletedCount,
} from './cultivationDailyQuest.js';

const SEPARATOR =
  '꒷꒦︶꒷꒦︶ ๋ ࣭ ⭑꒷꒦';

const QUEST_EMOJI =
  '<a:ttnhiemvu:1547682200961556510>';

const BLOSSOM_EMOJI =
  '<a:tthoadao:1547491636077142056>';

const CHEST_EMOJI =
  '<a:ttruongco:1547493008914653245>';

const MOON_EMOJI =
  '<a:tttrang:1547448866440347739>';

const USER_EMOJI =
  '<:ttdaohuu:1547296747301376130>';

const SPIRIT_QI_EMOJI =
  '<a:ttlinhkhi:1547485632971149442>';

const REALM_EMOJI =
  '<a:ttcanhgioi:1547448784924180500>';

const FURNACE_EMOJI =
  '<a:ttlobatquai:1547448473882861659>';

const ORE_EMOJI =
  '<a:tthuyenthiet:1547448560818065498>';

const PILL_EMOJI =
  '<a:ttdanduoc:1547449015224762399>';

const STONE_EMOJI =
  '<a:ttlinhthach:1547448522125869126>';

const CULTIVATION_EMOJI =
  '<a:tttuvi:1547448737377427550>';

function applyStyle(
  embed,
) {
  embed.setColor(
    CULTIVATION_CONFIG.ui.color,
  );

  embed.setFooter({
    text:
      CULTIVATION_CONFIG.ui.footer,
  });

  if (
    CULTIVATION_CONFIG.ui.image
  ) {
    embed.setImage(
      CULTIVATION_CONFIG.ui.image,
    );
  }

  return embed;
}

function number(
  value,
) {
  return new Intl.NumberFormat(
    'vi-VN',
  ).format(
    Math.max(
      0,
      Math.round(
        Number(value) || 0,
      ),
    ),
  );
}

function progressBar(
  current,
  max,
  size = 10,
) {
  const target =
    Math.max(
      1,
      Number(max) || 1,
    );

  const ratio =
    Math.max(
      0,
      Math.min(
        1,
        (
          Number(current) || 0
        ) /
          target,
      ),
    );

  const filled =
    Math.round(
      ratio * size,
    );

  return (
    '█'.repeat(filled) +
    '░'.repeat(
      size - filled,
    )
  );
}

function getQuestEmoji(
  quest,
) {
  if (
    quest.completed
  ) {
    return '✅';
  }

  switch (
    quest.type
  ) {
    case 'cultivate':
      return SPIRIT_QI_EMOJI;
    case 'adventure':
      return MOON_EMOJI;
    case 'alchemy':
      return FURNACE_EMOJI;
    case 'forge':
      return ORE_EMOJI;
    case 'use_item':
      return PILL_EMOJI;
    case 'breakthrough':
      return REALM_EMOJI;
    default:
      return QUEST_EMOJI;
  }
}

function getQuestDescription(
  quest,
) {
  switch (
    quest.type
  ) {
    case 'cultivate':
      return `Tu Luyện **${quest.target} lần**`;
    case 'adventure':
      return `Hoàn thành **${quest.target} lần Thám Hiểm**`;
    case 'alchemy':
      return 'Luyện Đan **1 lần**';
    case 'forge':
      return 'Luyện Khí **1 lần**';
    case 'use_item':
      return 'Sử dụng Đan Dược **1 lần**';
    case 'breakthrough':
      return 'Thực hiện Đột Phá **1 lần**';
    default:
      return 'Hoàn thành khảo nghiệm của Thiên Đạo.';
  }
}

function getRewardLines(
  reward,
) {
  const lines = [];

  if (
    Number(
      reward?.spiritStones,
    ) > 0
  ) {
    lines.push(
      `${STONE_EMOJI} ${number(
        reward.spiritStones,
      )} Linh Thạch`,
    );
  }

  if (
    Number(
      reward?.cultivation,
    ) > 0
  ) {
    lines.push(
      `${CULTIVATION_EMOJI} ${number(
        reward.cultivation,
      )} Tu Vi`,
    );
  }

  if (
    reward?.itemName &&
    reward?.quantity
  ) {
    lines.push(
      `${PILL_EMOJI} ${reward.itemName} ×${reward.quantity}`,
    );
  }

  return lines;
}

function buildQuestBlock(
  quest,
  index,
) {
  const rewardLines =
    getRewardLines(
      quest.reward,
    );

  return [
    `${index + 1}. ${getQuestEmoji(
      quest,
    )} **${quest.name}**`,
    getQuestDescription(
      quest,
    ),
    `\`${progressBar(
      quest.progress,
      quest.target,
    )} ${quest.progress} / ${quest.target}\``,
    '',
    `${CHEST_EMOJI} **Phần Thưởng**`,
    ...rewardLines,
    quest.claimed
      ? `${BLOSSOM_EMOJI} **Đã nhận thưởng**`
      : null,
  ]
    .filter(
      line =>
        line !== null,
    )
    .join(
      '\n',
    );
}

export function buildDailyQuestIntroEmbed(
  user,
) {
  return applyStyle(
    new EmbedBuilder()
      .setTitle(
        `${QUEST_EMOJI} 𝓝𝓱𝓲𝓮̣̂𝓶 𝓥𝓾̣ · 𝓣𝓲𝓮̂𝓷 𝓛𝓸̣̂`,
      )
      .setDescription(
        [
          `${QUEST_EMOJI} **NHIỆM VỤ HẰNG NGÀY**`,
          '',
          `${USER_EMOJI} **Đạo Hữu:** <@${user.id}>`,
          '',
          SEPARATOR,
          '',
          'Thiên Đạo mỗi ngày sẽ ban xuống **2–5 nhiệm vụ ngẫu nhiên**.',
          '',
          'Hoàn thành nhiệm vụ để nhận **Tu Vi** và **Linh Thạch**.',
          'Mỗi ngày chỉ có thể nhận nhiệm vụ **một lần**.',
          'Nhiệm vụ chưa hoàn thành sẽ biến mất khi sang ngày mới.',
          '',
          SEPARATOR,
          '',
          '*Thiên mệnh vô thường — hôm nay đạo hữu sẽ nhận được bao nhiêu khảo nghiệm?*',
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildDailyQuestEmbed(
  user,
  state,
) {
  const completed =
    getDailyQuestCompletedCount(
      state,
    );

  const total =
    state?.quests?.length || 0;

  const allDone =
    total > 0 &&
    completed >= total;

  if (allDone) {
    return applyStyle(
      new EmbedBuilder()
        .setTitle(
          `${BLOSSOM_EMOJI} 𝓝𝓱𝓪̣̂𝓽 𝓝𝓱𝓲𝓮̣̂𝓶 · 𝓥𝓲𝓮̂𝓷 𝓜𝓪̃𝓷`,
        )
        .setDescription(
          [
            `${BLOSSOM_EMOJI} **NHẬT NHIỆM VIÊN MÃN**`,
            '',
            `${USER_EMOJI} **Đạo Hữu:** <@${user.id}>`,
            '',
            `Đạo hữu đã hoàn thành toàn bộ **${completed} / ${total} nhiệm vụ** hôm nay.`,
            '',
            `${BLOSSOM_EMOJI} Thiên mệnh hôm nay đã viên mãn.`,
            `${SPIRIT_QI_EMOJI} Đạo tâm thêm một phần tinh tiến.`,
            '',
            SEPARATOR,
            '',
            '*Hoa khai hữu thời, nhật nhiệm đã thành — ngày mai lại tiếp tục Tiên Lộ.*',
          ].join(
            '\n',
          ),
        ),
    );
  }

  const blocks =
    state.quests.map(
      buildQuestBlock,
    );

  return applyStyle(
    new EmbedBuilder()
      .setTitle(
        `${QUEST_EMOJI} 𝓝𝓱𝓲𝓮̣̂𝓶 𝓥𝓾̣ · 𝓣𝓲𝓮̂𝓷 𝓛𝓸̣̂`,
      )
      .setDescription(
        [
          `${QUEST_EMOJI} **THIÊN ĐẠO NHIỆM VỤ**`,
          '',
          `${USER_EMOJI} **Đạo Hữu:** <@${user.id}>`,
          `${MOON_EMOJI} **Hôm Nay:** ${total} nhiệm vụ`,
          '',
          SEPARATOR,
          '',
          ...blocks.flatMap(
            (
              block,
              index,
            ) =>
              index ===
              blocks.length - 1
                ? [block]
                : [
                    block,
                    '',
                  ],
          ),
          '',
          SEPARATOR,
          '',
          `${MOON_EMOJI} Hoàn thành: **${completed} / ${total}**`,
          '',
          '*Nhật nguyệt luân chuyển — nhiệm vụ sẽ được làm mới vào ngày kế tiếp.*',
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildDailyQuestRows(
  ownerId,
  state,
) {
  const rows = [];

  if (
    !state?.rolled
  ) {
    rows.push(
      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(
              `tutien_daily_quest:${ownerId}:roll`,
            )
            .setLabel(
              'Nhận Nhiệm Vụ',
            )
            .setEmoji('🎲')
            .setStyle(
              ButtonStyle.Secondary,
            ),
        ),
    );
  } else {
    rows.push(
      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(
              `tutien_daily_quest:${ownerId}:open`,
            )
            .setLabel(
              'Cập Nhật Tiến Độ',
            )
            .setEmoji({
              id:
                '1547682200961556510',
            })
            .setStyle(
              ButtonStyle.Secondary,
            ),
        ),
    );
  }

  return rows;
}
