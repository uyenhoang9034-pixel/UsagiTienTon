import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';

import {
  CULTIVATION_CONFIG,
} from '../config/cultivationGame.js';

import {
  getActiveTalisman,
  getAncientTalismanQuantity,
  getCultivationTalisman,
  getCultivationTalismanList,
} from './cultivationTreasure.js';

const SEPARATOR =
  '꒷꒦︶꒷꒦︶ ๋ ࣭ ⭑꒷꒦';

const TREASURE_BUTTON_EMOJI = {
  id:
    CULTIVATION_CONFIG
      .ui
      .buttonEmojis
      .treasure,
};

const USER_EMOJI =
  CULTIVATION_CONFIG
    .ui
    .emojis
    .user;

const TALISMAN_EMOJI =
  CULTIVATION_CONFIG
    .ui
    .emojis
    .talisman;

function applyStyle(
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

export function buildTreasureEmbed(
  user,
  profile,
) {
  const active =
    getActiveTalisman(
      profile,
    );

  const quantity =
    getAncientTalismanQuantity(
      profile,
    );

  return applyStyle(
    new EmbedBuilder()
      .setTitle(
        `${TALISMAN_EMOJI} BÍ BẢO · 秘宝`,
      )
      .setDescription(
        [
          `${USER_EMOJI} Đạo Hữu: <@${user.id}>`,
          '',
          SEPARATOR,
          '',
          `${TALISMAN_EMOJI} **Bí Bảo Hiện Có**`,
          `Thượng Cổ Phù: **${quantity}**`,
          '',
          `${TALISMAN_EMOJI} **Phù Hiệu Đang Kích Hoạt**`,
          active
            ? `**${active.name}**\n${active.effect}`
            : '**Chưa Có**',
          '',
          SEPARATOR,
          '',
          '*Một đạo cổ phù, có thể nghịch chuyển một phần thiên cơ.*',
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildTreasureRows(
  ownerId,
  profile,
) {
  const active =
    getActiveTalisman(
      profile,
    );

  const rows = [];

  if (!active) {
    rows.push(
      new ActionRowBuilder()
        .addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(
              `tutien_talisman_select:${ownerId}`,
            )
            .setPlaceholder(
              'Chọn Phù Hiệu muốn kích hoạt',
            )
            .setMinValues(
              1,
            )
            .setMaxValues(
              1,
            )
            .addOptions(
              getCultivationTalismanList()
                .map(
                  (
                    talisman,
                  ) => ({
                    label:
                      talisman.name,

                    value:
                      talisman.id,

                    description:
                      talisman.effect.slice(
                        0,
                        100,
                      ),
                  }),
                ),
            ),
        ),
    );
  }

  rows.push(
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:dashboard`,
          )
          .setLabel(
            'Quay lại Tiên Lộ',
          )
          .setEmoji(
            TREASURE_BUTTON_EMOJI,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),
  );

  return rows;
}

export function buildTalismanConfirmEmbed(
  user,
  profile,
  talismanId,
) {
  const talisman =
    getCultivationTalisman(
      talismanId,
    );

  if (!talisman) {
    return applyStyle(
      new EmbedBuilder()
        .setTitle(
          `${TALISMAN_EMOJI} KHÔNG TÌM THẤY PHÙ HIỆU`,
        ),
    );
  }

  const quantity =
    getAncientTalismanQuantity(
      profile,
    );

  return applyStyle(
    new EmbedBuilder()
      .setTitle(
        `${TALISMAN_EMOJI} ${talisman.name.toUpperCase()}`,
      )
      .setDescription(
        [
          `${USER_EMOJI} Đạo Hữu: <@${user.id}>`,
          '',
          '**Hiệu Quả**',
          `**${talisman.effect}**`,
          '',
          `${TALISMAN_EMOJI} **Cần**`,
          'Thượng Cổ Phù: **1**',
          `Hiện Có: **${quantity}**`,
          '',
          SEPARATOR,
          '',
          `*${talisman.description}*`,
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildTalismanConfirmRows(
  ownerId,
  talismanId,
) {
  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:talisman_activate:${talismanId}`,
          )
          .setLabel(
            'Kích Hoạt',
          )
          .setEmoji(
            TREASURE_BUTTON_EMOJI,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),

        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:treasure`,
          )
          .setLabel(
            'Quay lại',
          )
          .setEmoji(
            TREASURE_BUTTON_EMOJI,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),
  ];
}

export function buildTalismanResultEmbed(
  result,
) {
  if (
    !result.ok &&
    result.reason ===
      'talisman_active'
  ) {
    return applyStyle(
      new EmbedBuilder()
        .setTitle(
          `${TALISMAN_EMOJI} PHÙ LỰC CHƯA TIÊU TÁN`,
        )
        .setDescription(
          [
            `${TALISMAN_EMOJI} **${result.activeTalisman.name}** vẫn đang được kích hoạt.`,
            '',
            SEPARATOR,
            '',
            result
              .activeTalisman
              .effect,
            '',
            '*Hãy chờ phù hiệu hiện tại phát huy tác dụng trước khi kích hoạt Thượng Cổ Phù khác.*',
          ].join(
            '\n',
          ),
        ),
    );
  }

  if (
    !result.ok &&
    result.reason ===
      'not_enough_material'
  ) {
    return applyStyle(
      new EmbedBuilder()
        .setTitle(
          `${TALISMAN_EMOJI} KHÔNG ĐỦ THƯỢNG CỔ PHÙ`,
        )
        .setDescription(
          [
            'Đạo hữu hiện không có đủ Thượng Cổ Phù.',
            '',
            SEPARATOR,
            '',
            `${TALISMAN_EMOJI} Cần: **1**`,
            `${TALISMAN_EMOJI} Hiện Có: **${result.available}**`,
          ].join(
            '\n',
          ),
        ),
    );
  }

  if (!result.ok) {
    return applyStyle(
      new EmbedBuilder()
        .setTitle(
          `${TALISMAN_EMOJI} KHÔNG THỂ KÍCH HOẠT`,
        )
        .setDescription(
          'Thượng Cổ Phù không thể kích hoạt vào lúc này.',
        ),
    );
  }

  return applyStyle(
    new EmbedBuilder()
      .setTitle(
        `${TALISMAN_EMOJI} CỔ PHÙ KÍCH HOẠT`,
      )
      .setDescription(
        [
          'Kim quang từ cổ phù hóa thành đạo văn, chậm rãi nhập vào khí hải.',
          '',
          SEPARATOR,
          '',
          `${TALISMAN_EMOJI} Kích Hoạt: **${result.talisman.name}**`,
          `${TALISMAN_EMOJI} Thượng Cổ Phù: **-1**`,
          '',
          '**Hiệu Quả**',
          result.talisman.effect,
          '',
          `*${result.talisman.description}*`,
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildTalismanResultRows(
  ownerId,
) {
  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:treasure`,
          )
          .setLabel(
            'Bí Bảo',
          )
          .setEmoji(
            TREASURE_BUTTON_EMOJI,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),

        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:dashboard`,
          )
          .setLabel(
            'Tiên Lộ',
          )
          .setEmoji(
            TREASURE_BUTTON_EMOJI,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),
  ];
}
