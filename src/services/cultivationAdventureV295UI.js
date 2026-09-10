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

  pet:
    '<a:ttlinhthu2:1547478815452954654>',

  light:
    '<a:ttlinhquang:1547489273949978725>',

  cultivation:
    '<a:tttuvi:1547448737377427550>',

  stone:
    '<a:ttlinhthach:1547448522125869126>',

  ancient:
    '<a:ttcovan:1547494884250746931>',

  victory:
    '<a:ttchienthang:1547493833724403722>',
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
        Number(value) || 0,
      ),
    ),
  );
}

/**
 * =========================================================
 * 34 · LINH THÚ UNKNOWN
 * =========================================================
 */

export function buildAdventurePetUnknownEmbed() {
  return style(
    new EmbedBuilder()
      .setDescription(
        [
          title(
            '灵兽现世 · LINH THÚ HIỆN THẾ',
          ),

          '',

          `${E.pet} *Một luồng khí tức xa lạ chợt xuất hiện giữa Lôi Vực.*`,

          '',

          'Trong màn điện quang, một bóng dáng nhỏ đang lặng lẽ quan sát đạo hữu.',

          '',

          `${E.light} Linh khí quanh sinh linh này cực kỳ tinh thuần.`,

          '',

          '*Có vẻ đây không phải yêu thú bình thường...*',
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildAdventurePetUnknownRows(
  ownerId,
) {
  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:adventure_v2_pet_reveal`,
          )
          .setLabel(
            'Tiến lại gần',
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),

        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:adventure_v2_pet_leave`,
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
 * 35 · REVEAL
 * =========================================================
 */

export function buildAdventurePetRevealEmbed(
  result,
) {
  const pet =
    result.pet;

  return style(
    new EmbedBuilder()
      .setDescription(
        [
          title(
            '灵兽现世 · LINH THÚ HIỆN THẾ',
          ),

          '',

          `${pet.emoji} *Sinh linh chậm rãi bước ra khỏi màn linh quang.*`,

          '',

          `${pet.emoji} **${pet.name}**`,

          `Phẩm Chất: **${pet.rarity}**`,

          '',

          `${E.ancient} **Thiên Phú**`,
          `**${pet.effect}**`,

          '',

          `${E.light} **Tỷ Lệ Thu Phục**`,
          `**${Math.round(
            pet.captureChance *
              100,
          )}%**`,

          '',

          '*Linh thú vẫn đang quan sát đạo hữu, chưa hề có ý rời đi.*',
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildAdventurePetRevealRows(
  ownerId,
  pet,
) {
  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:adventure_v2_pet_capture:${pet.id}`,
          )
          .setLabel(
            'Thu Phục',
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),

        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:adventure_v2_pet_leave`,
          )
          .setLabel(
            'Bỏ Qua',
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),
  ];
}

/**
 * =========================================================
 * PET LEAVE
 * =========================================================
 */

export function buildAdventurePetLeaveEmbed() {
  return style(
    new EmbedBuilder()
      .setDescription(
        [
          title(
            '缘尽 · LINH THÚ RỜI ĐI',
          ),

          '',

          `${E.pet} *Đạo hữu không tiếp tục tiến lại gần.*`,

          '',

          'Sinh linh thần bí nhìn về phía đạo hữu một lúc, sau đó hóa thành lưu quang biến mất.',

          '',

          '*Hữu duyên ngày sau ắt sẽ tương phùng.*',
        ].join(
          '\n',
        ),
      ),
  );
}

/**
 * =========================================================
 * 37 · PHÁP KHÍ CỘNG MINH
 * =========================================================
 */

export function buildEquipmentResonanceEmbed(
  result,
) {
  return style(
    new EmbedBuilder()
      .setDescription(
        [
          title(
            '法器共鸣 · PHÁP KHÍ CỘNG MINH',
          ),

          '',

          `${result.equipment.emoji} *Pháp khí bên người đột nhiên rung lên khe khẽ.*`,

          '',

          `${E.light} Thiên địa linh khí như bị một lực lượng vô hình dẫn động, liên tục hội tụ quanh **${result.equipment.name}**.`,

          '',

          `${result.equipment.emoji} **Pháp Khí**`,
          `**${result.equipment.name}**`,

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

          '',

          `${E.victory} *Nhân khí hợp nhất, pháp bảo sinh linh.*`,
        ].join(
          '\n',
        ),
      ),
  );
}

/**
 * =========================================================
 * 38 · CÔNG PHÁP CỘNG MINH
 * =========================================================
 */

export function buildTechniqueResonanceEmbed(
  result,
) {
  return style(
    new EmbedBuilder()
      .setDescription(
        [
          title(
            '功法共鸣 · CÔNG PHÁP CỘNG MINH',
          ),

          '',

          `${result.technique.emoji} *Công pháp trong thức hải bỗng tự vận chuyển.*`,

          '',

          `${E.light} Từng dòng linh khí theo kinh mạch lưu chuyển, khiến đạo vận quanh thân càng lúc càng rõ rệt.`,

          '',

          `${result.technique.emoji} **Công Pháp**`,
          `**${result.technique.name}**`,

          '',

          `${E.ancient} **Đạo Ý**`,
          `*${result.technique.description}*`,

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

          '',

          `${E.victory} *Đạo pháp tương ứng, nhất niệm thông huyền.*`,
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildAdventureV295BackRows(
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
