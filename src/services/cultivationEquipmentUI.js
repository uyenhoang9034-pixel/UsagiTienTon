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
  getEquipment,
  getEquipmentList,
  getEquippedEquipment,
  getOreQuantity,
  getOwnedEquipment,
} from './cultivationEquipment.js';

const SEPARATOR =
  '꒷꒦︶꒷꒦︶ ๋ ࣭ ⭑꒷꒦';

const FORGE_BUTTON_EMOJI = {
  id:
    CULTIVATION_CONFIG
      .ui
      .buttonEmojis
      .forge,
};

const EQUIPMENT_BUTTON_EMOJI = {
  id:
    CULTIVATION_CONFIG
      .ui
      .buttonEmojis
      .equipment,
};

const USER_EMOJI =
  CULTIVATION_CONFIG
    .ui
    .emojis
    .user;

const ORE_EMOJI =
  CULTIVATION_CONFIG
    .ui
    .emojis
    .ore;

const FURNACE_EMOJI =
  CULTIVATION_CONFIG
    .ui
    .emojis
    .furnace;

function styleEmbed(
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

function percent(
  value,
) {
  return `${Math.round(
    Number(
      value || 0,
    ) * 100,
  )}%`;
}

export function buildForgeEmbed(
  user,
  profile,
) {
  const ore =
    getOreQuantity(
      profile,
    );

  const equipmentLines =
    getEquipmentList()
      .map(
        (
          item,
        ) => [
          `${item.emoji} **${item.name}**`,
          `Cần: **${item.ingredientAmount} Huyền Thiết**`,
          `Tỷ Lệ Thành Công: **${percent(
            item.successChance,
          )}**`,
          `Hiệu Quả: **${item.effect}**`,
        ].join(
          '\n',
        ),
      )
      .join(
        '\n\n',
      );

  return styleEmbed(
    new EmbedBuilder()
      .setTitle(
        `${FURNACE_EMOJI} LUYỆN KHÍ PHƯỜNG · 炼器`,
      )
      .setDescription(
        [
          `${USER_EMOJI} **Đạo Hữu**: <@${user.id}>`,
          '',
          SEPARATOR,
          '',
          `${ORE_EMOJI} **Khoáng Vật Hiện Có**`,
          `Huyền Thiết: **${ore}**`,
          '',
          '**Pháp Khí Có Thể Luyện**',
          '',
          equipmentLines,
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildForgeRows(
  ownerId,
) {
  const menu =
    new StringSelectMenuBuilder()
      .setCustomId(
        `tutien_equipment_select:${ownerId}`,
      )
      .setPlaceholder(
        'Chọn Pháp Khí muốn luyện',
      )
      .addOptions(
        getEquipmentList()
          .map(
            (
              item,
            ) => ({
              label:
                item.name,

              value:
                item.id,

              description:
                `Cần ${item.ingredientAmount} Huyền Thiết · ${percent(
                  item.successChance,
                )}`.slice(
                  0,
                  100,
                ),
            }),
          ),
      );

  return [
    new ActionRowBuilder()
      .addComponents(
        menu,
      ),

    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:equipment`,
          )
          .setLabel(
            'Pháp Khí',
          )
          .setEmoji(
            EQUIPMENT_BUTTON_EMOJI,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),

        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:dashboard`,
          )
          .setLabel(
            'Quay lại Tiên Lộ',
          )
          .setEmoji(
            FORGE_BUTTON_EMOJI,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),
  ];
}

export function buildForgeConfirmEmbed(
  user,
  profile,
  equipmentId,
) {
  const equipment =
    getEquipment(
      equipmentId,
    );

  if (!equipment) {
    return styleEmbed(
      new EmbedBuilder()
        .setTitle(
          'KHÔNG TÌM THẤY PHÁP KHÍ',
        ),
    );
  }

  const ore =
    getOreQuantity(
      profile,
    );

  return styleEmbed(
    new EmbedBuilder()
      .setTitle(
        `${FURNACE_EMOJI} LUYỆN ${equipment.name.toUpperCase()}`,
      )
      .setDescription(
        [
          `${equipment.emoji} **${equipment.name}**`,
          '',
          `${ORE_EMOJI} **Huyền Thiết**: ${ore}`,
          `${ORE_EMOJI} **Cần**: ${equipment.ingredientAmount}`,
          '',
          `**Tỷ Lệ Thành Công**: ${percent(
            equipment.successChance,
          )}`,
          '',
          SEPARATOR,
          '',
          '**Hiệu Quả**',
          equipment.effect,
          '',
          '*Linh hỏa luyện thiết, pháp khí thành hay bại chỉ trong một niệm.*',
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildForgeConfirmRows(
  ownerId,
  equipmentId,
) {
  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:forge_make:${equipmentId}`,
          )
          .setLabel(
            'Luyện Khí',
          )
          .setEmoji(
            FORGE_BUTTON_EMOJI,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),

        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:forge`,
          )
          .setLabel(
            'Quay lại',
          )
          .setEmoji(
            FORGE_BUTTON_EMOJI,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),
  ];
}

export function buildForgeResultEmbed(
  result,
) {
  if (
    !result.ok &&
    result.reason ===
      'not_enough_material'
  ) {
    return styleEmbed(
      new EmbedBuilder()
        .setTitle(
          `${FURNACE_EMOJI} HUYỀN THIẾT KHÔNG ĐỦ`,
        )
        .setDescription(
          [
            '**KHÔNG THỂ KHAI LÒ**',
            '',
            'Khoáng vật hiện có chưa đủ để luyện chế pháp khí.',
            '',
            SEPARATOR,
            '',
            `${ORE_EMOJI} **Hiện Có**: ${result.available}`,
            `${ORE_EMOJI} **Cần**: ${result.equipment.ingredientAmount}`,
          ].join(
            '\n',
          ),
        ),
    );
  }

  if (!result.ok) {
    return styleEmbed(
      new EmbedBuilder()
        .setTitle(
          `${FURNACE_EMOJI} LUYỆN KHÍ KHÔNG THÀNH`,
        )
        .setDescription(
          'Không thể tiến hành luyện khí.',
        ),
    );
  }

  if (
    result.success
  ) {
    return styleEmbed(
      new EmbedBuilder()
        .setTitle(
          `${FURNACE_EMOJI} PHÁP KHÍ THÀNH HÌNH`,
        )
        .setDescription(
          [
            'Huyền thiết dưới linh hỏa dần ngưng tụ, pháp khí khẽ ngân trong động phủ.',
            '',
            SEPARATOR,
            '',
            `${result.equipment.emoji} **Nhận Được**: ${result.equipment.name}`,
            `${ORE_EMOJI} **Huyền Thiết**: -${result.consumed}`,
            '',
            `${result.equipment.emoji} **Hiệu Quả**`,
            result.equipment.effect,
            '',
            '*Pháp khí nhận chủ, tiên lộ lại thêm một phần trợ lực.*',
          ].join(
            '\n',
          ),
        ),
    );
  }

  return styleEmbed(
    new EmbedBuilder()
      .setTitle(
        `${FURNACE_EMOJI} LUYỆN KHÍ THẤT BẠI`,
      )
      .setDescription(
        [
          'Linh hỏa mất khống chế, huyền thiết vỡ vụn thành phế liệu.',
          '',
          SEPARATOR,
          '',
          `${ORE_EMOJI} **Huyền Thiết**: -${result.consumed}`,
          '',
          '*Luyện khí chi đạo, thất bại cũng là một lần lĩnh ngộ.*',
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildForgeResultRows(
  ownerId,
) {
  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:forge`,
          )
          .setLabel(
            'Tiếp tục Luyện Khí',
          )
          .setEmoji(
            FORGE_BUTTON_EMOJI,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),

        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:equipment`,
          )
          .setLabel(
            'Pháp Khí',
          )
          .setEmoji(
            EQUIPMENT_BUTTON_EMOJI,
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
            FORGE_BUTTON_EMOJI,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),
  ];
}

export function buildEquipmentEmbed(
  user,
  profile,
) {
  const owned =
    getOwnedEquipment(
      profile,
    );

  const equipped =
    getEquippedEquipment(
      profile,
    );

  const ownedText =
    owned.length
      ? owned
          .map(
            (
              item,
            ) => {
              const quantity =
                profile.equipment
                  ?.owned?.[
                    item.id
                  ] || 0;

              const active =
                equipped?.id ===
                item.id
                  ? ' · **Đang Trang Bị**'
                  : '';

              return [
                `${item.emoji} **${item.name}** ×${quantity}${active}`,
                `└ ${item.effect}`,
              ].join(
                '\n',
              );
            },
          )
          .join(
            '\n\n',
          )
      : '*Chưa sở hữu Pháp Khí nào.*';

  return styleEmbed(
    new EmbedBuilder()
      .setTitle(
        'PHÁP KHÍ · 法器',
      )
      .setDescription(
        [
          `${USER_EMOJI} **Đạo Hữu**: <@${user.id}>`,
          '',
          '**Pháp Khí Đang Trang Bị**',
          equipped
            ? `${equipped.emoji} **${equipped.name}**`
            : '**Chưa Trang Bị**',
          '',
          SEPARATOR,
          '',
          '**Pháp Khí Sở Hữu**',
          ownedText,
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildEquipmentRows(
  ownerId,
  profile,
) {
  const owned =
    getOwnedEquipment(
      profile,
    );

  const rows = [];

  if (
    owned.length > 0
  ) {
    rows.push(
      new ActionRowBuilder()
        .addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(
              `tutien_equip_select:${ownerId}`,
            )
            .setPlaceholder(
              'Chọn Pháp Khí để trang bị',
            )
            .addOptions(
              owned.map(
                (
                  item,
                ) => ({
                  label:
                    item.name,

                  value:
                    item.id,

                  description:
                    item.effect.slice(
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
            `tutien_action:${ownerId}:forge`,
          )
          .setLabel(
            'Luyện Khí',
          )
          .setEmoji(
            FORGE_BUTTON_EMOJI,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),

        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:dashboard`,
          )
          .setLabel(
            'Quay lại Tiên Lộ',
          )
          .setEmoji(
            EQUIPMENT_BUTTON_EMOJI,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),
  );

  return rows;
}

export function buildEquipResultEmbed(
  result,
) {
  if (!result.ok) {
    return styleEmbed(
      new EmbedBuilder()
        .setTitle(
          'KHÔNG THỂ TRANG BỊ',
        )
        .setDescription(
          'Đạo hữu chưa sở hữu Pháp Khí này.',
        ),
    );
  }

  return styleEmbed(
    new EmbedBuilder()
      .setTitle(
        'PHÁP KHÍ NHẬN CHỦ',
      )
      .setDescription(
        [
          `${result.equipment.emoji} Đã trang bị **${result.equipment.name}**`,
          '',
          SEPARATOR,
          '',
          '**Hiệu Quả Đang Kích Hoạt**',
          result.equipment.effect,
        ].join(
          '\n',
        ),
      ),
  );
}
