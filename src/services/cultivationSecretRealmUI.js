import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';

import {
  CULTIVATION_CONFIG,
  CULTIVATION_ITEMS,
} from '../config/cultivationGame.js';

/**
 * =========================================================
 * EMOJI · DISPLAY
 * =========================================================
 */

const E = {
  left:
    '<a:trangtrig2:1546040703375904801>',

  right:
    '<a:trangtrig3:1546040818261954610>',

  abyss:
    '<a:ttvucsau:1547481470690660433>',

  danger:
    '<a:ttnguyhiem:1547495450385317928>',

  monster:
    '<a:ttyeuthu:1547477368820469780>',

  combat:
    '<a:ttgiaochien:1547482030747680898>',

  assist:
    '<a:tttrochien:1547493158923927602>',

  victory:
    '<a:ttchienthang:1547493833724403722>',

  defeat:
    '<a:ttthatbai:1547495028480409783>',

  light:
    '<a:ttlinhquang:1547489273949978725>',

  mist:
    '<a:ttmansuongden:1547485663065014335>',

  cultivation:
    '<a:tttuvi:1547448737377427550>',

  stone:
    '<a:ttlinhthach:1547448522125869126>',

  stamina:
    '<a:tttheluc:1547448708537262090>',

  ore:
    '<a:tthuyenthiet:1547448560818065498>',

  herb:
    '<a:ttlinhthao:1547464708318167122>',
};

/**
 * =========================================================
 * BUTTON EMOJI
 * =========================================================
 */

function buttonEmoji(
  id,
) {
  return {
    id:
      String(id),
  };
}

const B = {
  abyss:
    buttonEmoji(
      '1547481470690660433',
    ),

  combat:
    buttonEmoji(
      '1547482030747680898',
    ),

  assist:
    buttonEmoji(
      '1547493158923927602',
    ),

  victory:
    buttonEmoji(
      '1547493833724403722',
    ),
};

/**
 * =========================================================
 * HELPERS
 * =========================================================
 */

function style(
  embed,
) {
  embed.setColor(
    CULTIVATION_CONFIG
      .ui
      .color,
  );

  embed.setFooter({
    text:
      CULTIVATION_CONFIG
        .ui
        .footer,
  });

  if (
    CULTIVATION_CONFIG
      .ui
      .image
  ) {
    embed.setImage(
      CULTIVATION_CONFIG
        .ui
        .image,
    );
  }

  return embed;
}

function title(
  text,
) {
  return `${E.left} **${text}** ${E.right}`;
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
        Number(
          value,
        ) || 0,
      ),
    ),
  );
}

function dangerStars(
  value,
) {
  const amount =
    Math.min(
      5,
      Math.max(
        1,
        Number(
          value,
        ) || 1,
      ),
    );

  return (
    '★'.repeat(
      amount,
    ) +
    '☆'.repeat(
      5 -
        amount,
    )
  );
}

function itemEmoji(
  item,
) {
  if (
    item?.type ===
    'herb'
  ) {
    return E.herb;
  }

  if (
    item?.type ===
    'ore'
  ) {
    return E.ore;
  }

  return E.light;
}

function lootLines(
  loot,
) {
  const lines = [];

  lines.push(
    `${E.cultivation} Tu Vi: **${number(
      loot?.cultivation,
    )}**`,
  );

  lines.push(
    `${E.stone} Linh Thạch: **${number(
      loot?.stones,
    )}**`,
  );

  for (
    const [
      itemId,
      quantity,
    ] of Object.entries(
      loot?.items ||
        {},
    )
  ) {
    const safeQuantity =
      Math.max(
        0,
        Math.floor(
          Number(
            quantity,
          ) || 0,
        ),
      );

    if (
      safeQuantity <=
      0
    ) {
      continue;
    }

    const item =
      CULTIVATION_ITEMS[
        itemId
      ];

    if (
      !item
    ) {
      continue;
    }

    lines.push(
      `${itemEmoji(
        item,
      )} ${item.name} × **${safeQuantity}**`,
    );
  }

  return lines;
}

/**
 * =========================================================
 * DISCOVER
 * =========================================================
 */

export function buildSecretRealmDiscoverEmbed(
  realm,
) {
  return style(
    new EmbedBuilder()
      .setDescription(
        [
          title(
            '秘境 · BÍ CẢNH HIỆN THẾ',
          ),

          '',

          `${E.abyss} *Không gian phía trước bất ngờ dao động, một khe nứt sâu thẳm dần mở ra.*`,

          '',

          `${E.light} Linh quang cổ xưa không ngừng lóe lên bên trong.`,

          '',

          `**${realm.name}**`,

          '',

          '**Yêu cầu đề xuất**',
          realm.recommendedRealm,

          '',

          `${E.danger} **Mức nguy hiểm**`,
          dangerStars(
            realm.danger,
          ),

          '',

          '*Càng tiến sâu, phần thưởng càng lớn — nhưng nếu thất bại, phần lớn chiến lợi phẩm sẽ bị mất.*',
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildSecretRealmDiscoverRows(
  ownerId,
  realmId,
) {
  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:secret_realm_enter:${realmId}`,
          )
          .setLabel(
            'Tiến vào bí cảnh',
          )
          .setEmoji(
            B.abyss,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),

        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:dashboard`,
          )
          .setLabel(
            'Rời đi',
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),
  ];
}

/**
 * =========================================================
 * FLOOR
 * =========================================================
 */

export function buildSecretRealmFloorEmbed(
  result,
) {
  return style(
    new EmbedBuilder()
      .setDescription(
        [
          title(
            `秘境 · ${result.realm.name}`,
          ),

          '',

          `${E.abyss} **Tầng ${result.session.floor}**`,

          '',

          `${E.mist} *Cánh cửa phía sau chậm rãi đóng lại. Màn sương đen bắt đầu chuyển động.*`,

          '',

          `${E.monster} **Đối thủ**`,
          result.monster.name,

          '',

          `${E.danger} **Mức nguy hiểm**`,
          dangerStars(
            result.monster.danger,
          ),

          '',

          '**Chiến lợi phẩm đang giữ**',
          ...lootLines(
            result.loot,
          ),
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildSecretRealmFloorRows(
  ownerId,
) {
  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:secret_realm_fight`,
          )
          .setLabel(
            'Giao chiến',
          )
          .setEmoji(
            B.combat,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),

        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:secret_realm_assist`,
          )
          .setLabel(
            'Linh Thú trợ chiến',
          )
          .setEmoji(
            B.assist,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),

        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:secret_realm_leave`,
          )
          .setLabel(
            'Rời bí cảnh',
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),
  ];
}

/**
 * =========================================================
 * ASSIST
 * =========================================================
 */

export function buildSecretRealmAssistEmbed(
  result,
) {
  return style(
    new EmbedBuilder()
      .setDescription(
        [
          title(
            '灵兽 · LINH THÚ TRỢ CHIẾN',
          ),

          '',

          result.pet
            ? `${result.pet.emoji || ''} **${result.pet.name}**`
            : `${E.defeat} *Không có Linh Thú đang xuất chiến.*`,

          '',

          result.pet
            ? `${E.assist} *Linh thú tiến lên phía trước, khí tức khóa chặt yêu thú.*`
            : 'Đạo hữu chỉ có thể tự mình giao chiến.',

          '',

          `${E.combat} **Tỷ lệ chiến thắng**`,
          `**${Math.round(
            (
              Number(
                result.winChance,
              ) ||
              0
            ) *
              100,
          )}%**`,
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildSecretRealmAssistRows(
  ownerId,
  hasPet,
) {
  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:secret_realm_fight_assist`,
          )
          .setLabel(
            'Giao chiến',
          )
          .setEmoji(
            B.combat,
          )
          .setStyle(
            ButtonStyle.Secondary,
          )
          .setDisabled(
            !hasPet,
          ),

        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:secret_realm_fight`,
          )
          .setLabel(
            'Tự mình giao chiến',
          )
          .setEmoji(
            B.combat,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),

        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:secret_realm_leave`,
          )
          .setLabel(
            'Rời bí cảnh',
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),
  ];
}

/**
 * =========================================================
 * WIN FLOOR
 * =========================================================
 */

export function buildSecretRealmWinEmbed(
  result,
) {
  const lines = [
    title(
      `秘境 · TẦNG ${result.clearedFloor}`,
    ),

    '',

    `${E.victory} *Yêu thú đã bị đánh bại, sát khí trong tầng này dần tiêu tán.*`,

    '',

    `${E.cultivation} **Tu Vi tầng này**`,
    `+${number(
      result.floorCultivation,
    )}`,

    '',

    `${E.stone} **Linh Thạch tầng này**`,
    `+${number(
      result.floorStones,
    )}`,
  ];

  if (
    result.droppedItem
  ) {
    const item =
      CULTIVATION_ITEMS[
        result
          .droppedItem
          .itemId
      ];

    if (
      item
    ) {
      lines.push(
        '',
        '**Vật phẩm tầng này**',
        `${itemEmoji(
          item,
        )} ${item.name} × **${number(
          result
            .droppedItem
            .quantity,
        )}**`,
      );
    }
  }

  lines.push(
    '',
    '**Tổng chiến lợi phẩm đang giữ**',
    ...lootLines(
      result.loot,
    ),
  );

  if (
    !result.completed
  ) {
    lines.push(
      '',
      `${E.danger} *Khí tức ở tầng tiếp theo còn nguy hiểm hơn...*`,
    );
  } else {
    lines.push(
      '',
      `${E.light} *Đạo hữu đã đi tới tận cùng Bí Cảnh.*`,
    );
  }

  return style(
    new EmbedBuilder()
      .setDescription(
        lines.join(
          '\n',
        ),
      ),
  );
}

export function buildSecretRealmWinRows(
  ownerId,
  completed,
) {
  if (
    completed
  ) {
    return [
      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(
              `tutien_action:${ownerId}:secret_realm_leave`,
            )
            .setLabel(
              'Thu chiến lợi phẩm',
            )
            .setEmoji(
              B.victory,
            )
            .setStyle(
              ButtonStyle.Secondary,
            ),
        ),
    ];
  }

  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:secret_realm_continue`,
          )
          .setLabel(
            'Đi tiếp',
          )
          .setEmoji(
            B.abyss,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),

        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:secret_realm_leave`,
          )
          .setLabel(
            'Thu chiến lợi phẩm & rời đi',
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),
  ];
}

/**
 * =========================================================
 * FAIL
 * =========================================================
 */

export function buildSecretRealmFailEmbed(
  result,
) {
  return style(
    new EmbedBuilder()
      .setDescription(
        [
          title(
            '秘境 · BÍ CẢNH THẤT BẠI',
          ),

          '',

          `${E.defeat} *Trận pháp trong Bí Cảnh rung chuyển dữ dội rồi đẩy đạo hữu ra ngoài.*`,

          '',

          '**Thất bại tại**',
          `Tầng ${result.floor}`,

          '',

          `${E.cultivation} **Tu Vi tổn thất**`,
          `-${number(
            result.cultivationLoss,
          )}`,

          '',

          `${E.stamina} **Thể Lực tổn thất**`,
          `-${number(
            result.staminaLoss,
          )}`,

          '',

          '**Chiến lợi phẩm giữ lại**',
          ...lootLines(
            result.keptLoot,
          ),

          '',

          `${E.danger} **Chiến lợi phẩm bị mất**`,
          ...lootLines(
            result.lostLoot,
          ),
        ].join(
          '\n',
        ),
      ),
  );
}

/**
 * =========================================================
 * EXIT
 * =========================================================
 */

export function buildSecretRealmExitEmbed(
  result,
) {
  return style(
    new EmbedBuilder()
      .setDescription(
        [
          title(
            '满载而归 · MÃN TẢI NHI QUY',
          ),

          '',

          `${E.victory} *Biết đủ mà lui, cơ duyên lần này đã thuộc về đạo hữu.*`,

          '',

          '**Chiến lợi phẩm mang về**',

          ...lootLines(
            result.loot,
          ),

          '',

          `${E.abyss} **Bí Cảnh đã đến**`,
          `Tầng ${result.floor}`,
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildSecretRealmBackRows(
  ownerId,
) {
  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:dashboard`,
          )
          .setLabel(
            'Trở về Tiên Lộ',
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),
  ];
}
