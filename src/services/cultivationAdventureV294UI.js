import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';

import {
  CULTIVATION_CONFIG,
} from '../config/cultivationGame.js';

const E = {
  left:
    '<a:trangtrig2:1546040703375904801>',

  right:
    '<a:trangtrig3:1546040818261954610>',

  light:
    '<a:ttlinhquang:1547489273949978725>',

  ancient:
    '<a:ttcovan:1547494884250746931>',

  cultivation:
    '<a:tttuvi:1547448737377427550>',

  stone:
    '<a:ttlinhthach:1547448522125869126>',

  victory:
    '<a:ttchienthang:1547493833724403722>',

  danger:
    '<a:ttnguyhiem:1547495450385317928>',

  flower:
    '<a:tthoadao:1547491636077142056>',
};

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
        Number(value) ||
          0,
      ),
    ),
  );
}

function buttonEmoji(
  id,
) {
  return {
    id:
      String(id),
  };
}

/**
 * =========================================================
 * THƯƠNG NHÂN THẦN BÍ
 * =========================================================
 */

export function buildAdventureMerchantEmbed(
  result,
) {
  const lines = [
    title(
      '神秘商人 · THƯƠNG NHÂN THẦN BÍ',
    ),

    '',

    `${E.flower} *Giữa cổ đình vắng lặng, một lão giả áo xám đang ngồi bên bàn đá.*`,

    '',

    `${E.ancient} “Hữu duyên gặp nhau, những thứ này có lẽ sẽ giúp đạo hữu trên Tiên Lộ.”`,

    '',

    `${E.stone} **Linh Thạch hiện có**`,
    `**${number(
      result.profile
        ?.spiritStones,
    )}**`,

    '',

    '**Vật phẩm đang bán**',
  ];

  for (
    const offer of
      result.stock ||
      []
  ) {
    lines.push(
      `${E.light} **${offer.item.name}** — ${number(
        offer.price,
      )} Linh Thạch`,
    );
  }

  lines.push(
    '',
    '*Mỗi lần gặp thương nhân chỉ có thể mua một món.*',
  );

  return style(
    new EmbedBuilder()
      .setDescription(
        lines.join(
          '\n',
        ),
      ),
  );
}

export function buildAdventureMerchantRows(
  ownerId,
  stock,
) {
  const row =
    new ActionRowBuilder();

  for (
    const offer of
      stock ||
      []
  ) {
    row.addComponents(
      new ButtonBuilder()
        .setCustomId(
          `tutien_action:${ownerId}:adventure_v2_merchant_buy:${offer.itemId}`,
        )
        .setLabel(
          `${offer.item.name} · ${offer.price}`,
        )
        .setEmoji(
          buttonEmoji(
            '1547448522125869126',
          ),
        )
        .setStyle(
          ButtonStyle.Secondary,
        ),
    );
  }

  row.addComponents(
    new ButtonBuilder()
      .setCustomId(
        `tutien_action:${ownerId}:adventure_v2_merchant_leave`,
      )
      .setLabel(
        'Rời đi',
      )
      .setStyle(
        ButtonStyle.Secondary,
      ),
  );

  return [
    row,
  ];
}

/**
 * =========================================================
 * GIAO DỊCH HOÀN TẤT
 * =========================================================
 */

export function buildAdventureMerchantPurchaseEmbed(
  result,
) {
  return style(
    new EmbedBuilder()
      .setDescription(
        [
          title(
            '交易 · GIAO DỊCH HOÀN TẤT',
          ),

          '',

          `${E.victory} *Lão giả khẽ phất tay, vật phẩm bay vào trong túi trữ vật.*`,

          '',

          '**Đã mua**',
          `${E.light} **${result.offer.item.name}** × **1**`,

          '',

          `${E.stone} **Linh Thạch tiêu hao**`,
          `-${number(
            result.offer.price,
          )}`,

          '',

          `${E.stone} **Linh Thạch còn lại**`,
          `**${number(
            result.profile
              ?.spiritStones,
          )}**`,

          '',

          '*Thương nhân mỉm cười rồi dần biến mất giữa màn linh quang.*',
        ].join(
          '\n',
        ),
      ),
  );
}

/**
 * =========================================================
 * KHÔNG ĐỦ LINH THẠCH
 * =========================================================
 */

export function buildAdventureMerchantInsufficientEmbed(
  result,
) {
  return style(
    new EmbedBuilder()
      .setDescription(
        [
          title(
            '灵石不足 · LINH THẠCH KHÔNG ĐỦ',
          ),

          '',

          `${E.danger} *Thương nhân khẽ lắc đầu.*`,

          '',

          '**Vật phẩm**',
          `${E.light} ${result.offer.item.name}`,

          '',

          `${E.stone} **Giá**`,
          `${number(
            result.offer.price,
          )} Linh Thạch`,

          '',

          `${E.stone} **Đạo hữu hiện có**`,
          `${number(
            result.profile
              ?.spiritStones,
          )} Linh Thạch`,

          '',

          '*Muốn lấy bảo vật, cơ duyên thôi vẫn chưa đủ.*',
        ].join(
          '\n',
        ),
      ),
  );
}

/**
 * =========================================================
 * RỜI THƯƠNG NHÂN
 * =========================================================
 */

export function buildAdventureMerchantLeaveEmbed() {
  return style(
    new EmbedBuilder()
      .setDescription(
        [
          title(
            '辞别 · RỜI KHỎI CỔ ĐÌNH',
          ),

          '',

          `${E.flower} *Đạo hữu chắp tay cáo từ.*`,

          '',

          'Thương nhân chỉ khẽ cười, thân ảnh nhanh chóng tan vào linh quang.',

          '',

          '**Không phát sinh giao dịch.**',
        ].join(
          '\n',
        ),
      ),
  );
}

/**
 * =========================================================
 * THIÊN ĐẠO CƠ DUYÊN
 * =========================================================
 */

export function buildHeavenlyFortuneEmbed(
  result,
) {
  const lines = [
    title(
      '天道机缘 · THIÊN ĐẠO CƠ DUYÊN',
    ),

    '',

    `${E.light} *Thiên địa đột nhiên tĩnh lặng.*`,

    '',

    `${E.ancient} Vạn đạo linh quang từ hư không giáng xuống, bao phủ toàn thân đạo hữu.`,

    '',

    '*Một tia Thiên Đạo khí tức dung nhập vào đan điền.*',

    '',

    `${E.cultivation} **Tu Vi**`,
    `+${number(
      result.cultivationDelta,
    )}`,

    '',

    `${E.stone} **Linh Thạch**`,
    `+${number(
      result.stoneDelta,
    )}`,
  ];

  if (
    result.droppedItem
  ) {
    lines.push(
      '',
      `${E.victory} **Thiên Đạo ban vật**`,
      `${result.droppedItem.item.name} × **${number(
        result.droppedItem.quantity,
      )}**`,
    );
  }

  lines.push(
    '',
    `${E.victory} *Đây là một Đại Cơ Duyên hiếm gặp trên Tiên Lộ.*`,
  );

  return style(
    new EmbedBuilder()
      .setDescription(
        lines.join(
          '\n',
        ),
      ),
  );
}

export function buildAdventureV294BackRows(
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
