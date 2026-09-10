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
  getBreakthroughChance,
  getCultivationItem,
  getCultivationRequired,
  getInventoryEntries,
  getRealmDisplay,
  getUsableInventoryEntries,
} from './cultivationService.js';

import {
  getEquippedEquipment,
} from './cultivationEquipment.js';

import {
  getActiveTechnique,
} from './cultivationTechnique.js';

import {
  getActiveTalisman,
} from './cultivationTreasure.js';

import {
  getActivePet,
  getCultivationPet,
} from './cultivationPet.js';

const SEPARATOR =
  '꒷꒦︶꒷꒦︶ ๋ ࣭ ⭑꒷꒦';

const E =
  CULTIVATION_CONFIG
    .ui
    .emojis;

export const CULTIVATION_BUTTON_EMOJIS = {
  cultivate: {
    id:
      CULTIVATION_CONFIG
        .ui
        .buttonEmojis
        .cultivate,
  },

  breakthrough: {
    id:
      CULTIVATION_CONFIG
        .ui
        .buttonEmojis
        .breakthrough,
  },

  adventure: {
    id:
      CULTIVATION_CONFIG
        .ui
        .buttonEmojis
        .adventure,
  },

  inventory: {
    id:
      CULTIVATION_CONFIG
        .ui
        .buttonEmojis
        .inventory,
  },

  profile: {
    id:
      CULTIVATION_CONFIG
        .ui
        .buttonEmojis
        .profile,
  },

  leaderboard: {
    id:
      CULTIVATION_CONFIG
        .ui
        .buttonEmojis
        .leaderboard,
  },

  alchemy: {
    id:
      CULTIVATION_CONFIG
        .ui
        .buttonEmojis
        .alchemy,
  },

  forge: {
    id:
      CULTIVATION_CONFIG
        .ui
        .buttonEmojis
        .forge,
  },

  equipment: {
    id:
      CULTIVATION_CONFIG
        .ui
        .buttonEmojis
        .equipment,
  },

  technique: {
    id:
      CULTIVATION_CONFIG
        .ui
        .buttonEmojis
        .technique,
  },

  treasure: {
    id:
      CULTIVATION_CONFIG
        .ui
        .buttonEmojis
        .treasure,
  },

  pet: {
    id:
      CULTIVATION_CONFIG
        .ui
        .buttonEmojis
        .pet,
  },

  use: {
    id:
      CULTIVATION_CONFIG
        .ui
        .buttonEmojis
        .use,
  },
};

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
        value || 0,
      ),
    ),
  );
}

function signedNumber(
  value,
) {
  const amount =
    Math.round(
      value || 0,
    );

  if (
    amount > 0
  ) {
    return `+${number(
      amount,
    )}`;
  }

  if (
    amount < 0
  ) {
    return `-${number(
      Math.abs(
        amount,
      ),
    )}`;
  }

  return '+0';
}

function percent(
  value,
) {
  return `${Math.round(
    (
      Number(
        value,
      ) || 0
    ) * 100,
  )}%`;
}

function progressBar(
  current,
  max,
  size = 12,
) {
  if (
    !max ||
    max <= 0
  ) {
    return '░'.repeat(
      size,
    );
  }

  const ratio =
    Math.max(
      0,
      Math.min(
        1,
        current / max,
      ),
    );

  const filled =
    Math.round(
      ratio * size,
    );

  return (
    '█'.repeat(
      filled,
    ) +
    '░'.repeat(
      size - filled,
    )
  );
}

function duration(
  ms,
) {
  const seconds =
    Math.max(
      0,
      Math.ceil(
        ms / 1000,
      ),
    );

  const minutes =
    Math.floor(
      seconds / 60,
    );

  const remaining =
    seconds % 60;

  if (
    minutes <= 0
  ) {
    return `${remaining}s`;
  }

  if (
    remaining <= 0
  ) {
    return `${minutes}m`;
  }

  return `${minutes}m ${remaining}s`;
}

function getItemEmoji(
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
    'pill'
  ) {
    return E.pill;
  }

  if (
    item?.type ===
    'ore'
  ) {
    return E.ore;
  }

  if (
    item?.type ===
    'technique'
  ) {
    return E.swordManual;
  }

  return E.talisman;
}

function getPetEmoji(
  petId,
) {
  return (
    getCultivationPet(
      petId,
    )?.emoji || ''
  );
}

function buildDropText(
  droppedItem,
) {
  if (!droppedItem) {
    return null;
  }

  return [
    '',
    `**VẬT PHẨM NHẬN ĐƯỢC**`,
    `${getItemEmoji(
      droppedItem.item,
    )} **${droppedItem.item.name}** × ${droppedItem.quantity}`,
    `*${droppedItem.item.rarity}*`,
  ].join(
    '\n',
  );
}

function buildEffectsText(
  profile,
) {
  const lines = [];

  const cultivationBonus =
    Math.max(
      0,
      Number(
        profile.effects
          ?.nextCultivationBonus,
      ) || 0,
    );

  const breakthroughBonus =
    Math.max(
      0,
      Number(
        profile.effects
          ?.nextBreakthroughBonus,
      ) || 0,
    );

  if (
    cultivationBonus > 0
  ) {
    lines.push(
      `${E.pill} Tụ Khí Đan: **+${percent(
        cultivationBonus,
      )} Tu Vi lần kế tiếp**`,
    );
  }

  if (
    breakthroughBonus > 0
  ) {
    lines.push(
      `${E.pill} Phá Cảnh Đan: **+${percent(
        breakthroughBonus,
      )} Đột Phá lần kế tiếp**`,
    );
  }

  if (
    lines.length === 0
  ) {
    return null;
  }

  return [
    SEPARATOR,
    '',
    `${E.pill} **Dược Hiệu**`,
    ...lines,
  ].join(
    '\n',
  );
}

export function buildDashboardEmbed(
  user,
  profile,
  {
    isNew = false,
  } = {},
) {
  const required =
    getCultivationRequired(
      profile,
    );

  const realm =
    getRealmDisplay(
      profile,
    );

  const intro =
    isNew
      ? [
          '**THIÊN ĐẠO KHAI MỞ**',
          '',
          `<@${user.id}> đã chính thức bước vào Tiên Lộ.`,
          '',
          `${E.spiritRoot} Linh Căn thức tỉnh: **${profile.spiritRoot.name}**`,
          `Phẩm Chất: **${profile.spiritRoot.rarity}**`,
          '',
          SEPARATOR,
          '',
        ].join(
          '\n',
        )
      : '';

  return applyStyle(
    new EmbedBuilder()
      .setTitle(
        '𝓣𝓲𝓮̂𝓷 𝓛𝓸̣̂ · 修仙之路',
      )
      .setDescription(
        [
          intro,

          `${E.user} **Đạo Hữu**: <@${user.id}>`,

          `${E.realm} [**境界**] **${realm}**`,

          `${E.spiritRoot} [**灵根**] **${profile.spiritRoot.name}**`,

          '',

          `${E.cultivation} **Tu Vi**`,

          `${progressBar(
            profile.cultivation,
            required,
          )} **${number(
            profile.cultivation,
          )} / ${number(
            required,
          )}**`,

          '',

          `${E.spiritStone} **Linh Thạch**: ${number(
            profile.spiritStones,
          )}`,

          `${E.stamina} **Thể Lực**: ${profile.stamina}/${profile.maxStamina}`,

          '',

          SEPARATOR,

          '',

          '*Một niệm nhập tiên đồ — từ phàm nhân, từng bước nghịch thiên mà hành.*',
        ]
          .filter(
            Boolean,
          )
          .join(
            '\n',
          ),
      ),
  );
}

export function buildDashboardRows(
  ownerId,
) {
  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:cultivate`,
          )
          .setLabel(
            'Tu Luyện',
          )
          .setEmoji(
            CULTIVATION_BUTTON_EMOJIS.cultivate,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),

        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:breakthrough`,
          )
          .setLabel(
            'Đột Phá',
          )
          .setEmoji(
            CULTIVATION_BUTTON_EMOJIS.breakthrough,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),

        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:adventure`,
          )
          .setLabel(
            'Thám Hiểm',
          )
          .setEmoji(
            CULTIVATION_BUTTON_EMOJIS.adventure,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),

        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:inventory`,
          )
          .setLabel(
            'Túi Đồ',
          )
          .setEmoji(
            CULTIVATION_BUTTON_EMOJIS.inventory,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),

        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:profile`,
          )
          .setLabel(
            'Hồ Sơ',
          )
          .setEmoji(
            CULTIVATION_BUTTON_EMOJIS.profile,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),

    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:leaderboard`,
          )
          .setLabel(
            'Tiên Bảng',
          )
          .setEmoji(
            CULTIVATION_BUTTON_EMOJIS.leaderboard,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),

        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:alchemy`,
          )
          .setLabel(
            'Luyện Đan',
          )
          .setEmoji(
            CULTIVATION_BUTTON_EMOJIS.alchemy,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),

        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:forge`,
          )
          .setLabel(
            'Luyện Khí',
          )
          .setEmoji(
            CULTIVATION_BUTTON_EMOJIS.forge,
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
            CULTIVATION_BUTTON_EMOJIS.equipment,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),

        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:technique`,
          )
          .setLabel(
            'Công Pháp',
          )
          .setEmoji(
            CULTIVATION_BUTTON_EMOJIS.technique,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),

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
            CULTIVATION_BUTTON_EMOJIS.treasure,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),

        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:pet`,
          )
          .setLabel(
            'Linh Thú',
          )
          .setEmoji(
            CULTIVATION_BUTTON_EMOJIS.pet,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),
  ];
}

export function buildBackRow(
  ownerId,
  action = 'cultivate',
) {
  const emoji =
    CULTIVATION_BUTTON_EMOJIS[
      action
    ] ||
    CULTIVATION_BUTTON_EMOJIS
      .cultivate;

  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(
          `tutien_action:${ownerId}:dashboard`,
        )
        .setLabel(
          'Quay lại Tiên Lộ',
        )
        .setEmoji(
          emoji,
        )
        .setStyle(
          ButtonStyle.Secondary,
        ),
    );
}

export function buildInventoryRows(
  ownerId,
  profile,
) {
  const usableItems =
    getUsableInventoryEntries(
      profile,
    );

  const rows = [];

  if (
    usableItems.length > 0
  ) {
    rows.push(
      new ActionRowBuilder()
        .addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(
              `tutien_inventory_select:${ownerId}`,
            )
            .setPlaceholder(
              'Chọn Đan Dược muốn sử dụng',
            )
            .setMinValues(
              1,
            )
            .setMaxValues(
              1,
            )
            .addOptions(
              usableItems
                .slice(
                  0,
                  25,
                )
                .map(
                  (
                    item,
                  ) => ({
                    label:
                      item.name,

                    value:
                      item.id,

                    description:
                      `${item.rarity} · Đang có x${item.quantity}`.slice(
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
    buildBackRow(
      ownerId,
      'inventory',
    ),
  );

  return rows;
}

export function buildItemDetailRows(
  ownerId,
  itemId,
) {
  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:use_item:${itemId}`,
          )
          .setLabel(
            'Sử Dụng',
          )
          .setEmoji(
            CULTIVATION_BUTTON_EMOJIS.use,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),

        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:inventory`,
          )
          .setLabel(
            'Quay lại Túi Đồ',
          )
          .setEmoji(
            CULTIVATION_BUTTON_EMOJIS.inventory,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),
  ];
}

export function buildUseItemResultRows(
  ownerId,
) {
  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:inventory`,
          )
          .setLabel(
            'Quay lại Túi Đồ',
          )
          .setEmoji(
            CULTIVATION_BUTTON_EMOJIS.inventory,
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
            CULTIVATION_BUTTON_EMOJIS.inventory,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),
  ];
}

export function buildCultivateEmbed(
  result,
) {
  if (
    !result.ok &&
    result.reason ===
      'cooldown'
  ) {
    return applyStyle(
      new EmbedBuilder()
        .setTitle(
          'ĐẠO TÂM CHƯA ỔN ĐỊNH',
        )
        .setDescription(
          [
            'Linh khí trong kinh mạch vẫn chưa hoàn toàn ổn định.',
            '',
            SEPARATOR,
            '',
            `${E.cultivation} Đạo hữu cần chờ **${duration(
              result.cooldownRemaining,
            )}** trước lần tu luyện tiếp theo.`,
          ].join(
            '\n',
          ),
        ),
    );
  }

  if (
    !result.ok &&
    result.reason ===
      'stamina'
  ) {
    return applyStyle(
      new EmbedBuilder()
        .setTitle(
          `${E.stamina} THỂ LỰC KHÔNG ĐỦ`,
        )
        .setDescription(
          [
            'Đạo hữu đã tiêu hao quá nhiều tinh lực.',
            '',
            SEPARATOR,
            '',
            `${E.stamina} Hiện tại chưa đủ Thể Lực để tiếp tục tu luyện.`,
          ].join(
            '\n',
          ),
        ),
    );
  }

  const pillLine =
    result.cultivationPillBonus >
      0
      ? `${E.pill} Tụ Khí Đan: **+${number(
          result.cultivationPillBonus,
        )} Tu Vi**`
      : null;

  const equipmentCultivationLine =
    result
      .equipmentCultivationBonus >
    0
      ? `${E.sword} Thanh Phong Kiếm: **+${number(
          result.equipmentCultivationBonus,
        )} Tu Vi**`
      : null;

  const equipmentStoneLine =
    result.equipmentStoneBonus >
    0
      ? `${E.pendant} Tụ Linh Bội: **+${number(
          result.equipmentStoneBonus,
        )} Linh Thạch**`
      : null;

  const techniqueCultivationLine =
    result
      .techniqueCultivationBonus >
    0
      ? `${E.technique} Thanh Vân Kiếm Quyết: **+${number(
          result.techniqueCultivationBonus,
        )} Tu Vi**`
      : null;

  const techniqueStoneLine =
    result.techniqueStoneBonus >
    0
      ? `${E.technique} Tụ Linh Chân Kinh: **+${number(
          result.techniqueStoneBonus,
        )} Linh Thạch**`
      : null;

  const petCultivationLine =
    result.petCultivationBonus >
    0
      ? `${getPetEmoji(
          'thanh_phong_linh_ho',
        )} Thanh Phong Linh Hồ: **+${number(
          result.petCultivationBonus,
        )} Tu Vi**`
      : null;

  return applyStyle(
    new EmbedBuilder()
      .setTitle(
        result.event.title,
      )
      .setDescription(
        [
          result.event.text,
          '',
          SEPARATOR,
          '',
          `${E.cultivation} **Tu Vi**: ${signedNumber(
            result.cultivationDelta,
          )}`,
          `${E.spiritStone} **Linh Thạch**: ${signedNumber(
            result.stoneDelta,
          )}`,
          `${E.stamina} **Thể Lực**: -${result.staminaCost}`,
          equipmentCultivationLine,
          techniqueCultivationLine,
          petCultivationLine,
          equipmentStoneLine,
          techniqueStoneLine,
          pillLine,
          '',
          `${E.realm} [**境界**] **${getRealmDisplay(
            result.profile,
          )}**`,
          `${progressBar(
            result.profile
              .cultivation,
            result.required,
          )} ${number(
            result.profile
              .cultivation,
          )} / ${number(
            result.required,
          )}`,
        ]
          .filter(
            (
              line,
            ) =>
              line !== null,
          )
          .join(
            '\n',
          ),
      ),
  );
}

export function buildAdventureEmbed(
  result,
) {
  if (
    !result.ok &&
    result.reason ===
      'cooldown'
  ) {
    return applyStyle(
      new EmbedBuilder()
        .setTitle(
          'HÀNH TRÌNH CHƯA THỂ TIẾP TỤC',
        )
        .setDescription(
          [
            'Đạo hữu vừa trải qua một chuyến thám hiểm, cần thời gian chỉnh đốn.',
            '',
            SEPARATOR,
            '',
            `${E.cultivation} Đạo hữu cần chờ **${duration(
              result.cooldownRemaining,
            )}** trước lần Thám Hiểm tiếp theo.`,
          ].join(
            '\n',
          ),
        ),
    );
  }

  const talismanLine =
    result.talismanConsumed
      ? result.talismanId ===
        'tam_bao_phu'
        ? `${E.talisman} Tầm Bảo Phù: **Phù lực đã tiêu hao**`
        : result.talismanId ===
          'tu_tai_phu'
          ? `${E.talisman} Tụ Tài Phù: **+${number(
              result.talismanStoneBonus,
            )} Linh Thạch · Đã tiêu hao**`
          : null
      : null;

  if (
    result.event.type ===
    'monster'
  ) {
    return applyStyle(
      new EmbedBuilder()
        .setTitle(
          'YÊU THÚ TẬP KÍCH',
        )
        .setDescription(
          [
            result.event.text,
            '',
            SEPARATOR,
            '',
            `${E.cultivation} **Tu Vi**: ${signedNumber(
              result.cultivationDelta,
            )}`,
            `${E.spiritStone} **Linh Thạch**: +0`,
            talismanLine,
            '',
            `${E.realm} [**境界**] **${getRealmDisplay(
              result.profile,
            )}**`,
            `${progressBar(
              result.profile
                .cultivation,
              result.required,
            )} ${number(
              result.profile
                .cultivation,
            )} / ${number(
              result.required,
            )}`,
            '',
            '*Tiên lộ vốn không phải nơi bình yên.*',
          ]
            .filter(
              (
                line,
              ) =>
                line !== null,
            )
            .join(
              '\n',
            ),
        ),
    );
  }

  const dropText =
    buildDropText(
      result.droppedItem,
    );

  const equipmentStoneLine =
    result.equipmentStoneBonus >
    0
      ? `${E.pendant} Tụ Linh Bội: **+${number(
          result.equipmentStoneBonus,
        )} Linh Thạch**`
      : null;

  const techniqueStoneLine =
    result.techniqueStoneBonus >
    0
      ? `${E.technique} Tụ Linh Chân Kinh: **+${number(
          result.techniqueStoneBonus,
        )} Linh Thạch**`
      : null;

  const petStoneLine =
    result.petStoneBonus >
    0
      ? `${getPetEmoji(
          'xich_viem_hoa_dieu',
        )} Xích Viêm Hỏa Điểu: **+${number(
          result.petStoneBonus,
        )} Linh Thạch**`
      : null;

  const title =
    result.event.type ===
      'great_fortune'
      ? result.event.title
      : result.location.name;

  return applyStyle(
    new EmbedBuilder()
      .setTitle(
        title,
      )
      .setDescription(
        [
          result.event.text,
          '',
          SEPARATOR,
          '',
          `${E.cultivation} **Tu Vi**: ${signedNumber(
            result.cultivationDelta,
          )}`,
          `${E.spiritStone} **Linh Thạch**: ${signedNumber(
            result.stoneDelta,
          )}`,
          equipmentStoneLine,
          techniqueStoneLine,
          petStoneLine,
          talismanLine,
          dropText,
          '',
          `${E.realm} [**境界**] **${getRealmDisplay(
            result.profile,
          )}**`,
          `${progressBar(
            result.profile
              .cultivation,
            result.required,
          )} ${number(
            result.profile
              .cultivation,
          )} / ${number(
            result.required,
          )}`,
        ]
          .filter(
            (
              line,
            ) =>
              line !== null,
          )
          .join(
            '\n',
          ),
      ),
  );
}

export function buildInventoryEmbed(
  user,
  profile,
) {
  const entries =
    getInventoryEntries(
      profile,
    );

  const itemLines =
    entries.map(
      (
        item,
      ) => [
        `${getItemEmoji(
          item,
        )} **${item.name}** × **${item.quantity}**`,
        `*${item.rarity} · ${item.description}*`,
      ].join(
        '\n',
      ),
    );

  return applyStyle(
    new EmbedBuilder()
      .setTitle(
        'TÚI ĐỒ TIÊN NHÂN',
      )
      .setDescription(
        [
          `${E.user} Đạo Hữu: <@${user.id}>`,
          '',
          SEPARATOR,
          '',
          itemLines.length > 0
            ? itemLines.join(
                '\n\n',
              )
            : '*Túi Đồ hiện đang trống.*',
          '',
          SEPARATOR,
          '',
          `Vật Phẩm Đã Tìm Thấy: **${profile.stats.itemsFound || 0}**`,
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildItemDetailEmbed(
  user,
  profile,
  itemId,
) {
  const item =
    getCultivationItem(
      itemId,
    );

  if (!item) {
    return applyStyle(
      new EmbedBuilder()
        .setTitle(
          'KHÔNG TÌM THẤY VẬT PHẨM',
        )
        .setDescription(
          'Vật phẩm này không còn tồn tại trong Túi Đồ.',
        ),
    );
  }

  const quantity =
    profile.inventory?.[
      itemId
    ] || 0;

  let effectText =
    'Vật phẩm này hiện chưa thể sử dụng.';

  if (
    itemId ===
    'tu_khi_dan'
  ) {
    effectText =
      'Tăng **+25% Tu Vi** cho lần Tu Luyện kế tiếp.';
  }

  if (
    itemId ===
    'hoi_nguyen_dan'
  ) {
    effectText =
      'Khôi phục tối đa **30 Thể Lực**.';
  }

  if (
    itemId ===
    'pha_canh_dan'
  ) {
    effectText =
      'Tăng **+10%** tỷ lệ cho lần Đột Phá kế tiếp, tối đa **95%**.';
  }

  return applyStyle(
    new EmbedBuilder()
      .setTitle(
        `${getItemEmoji(
          item,
        )} ${item.name.toUpperCase()}`,
      )
      .setDescription(
        [
          `${E.user} Đạo Hữu: <@${user.id}>`,
          '',
          `**Phẩm Chất**: ${item.rarity}`,
          `**Số Lượng**: ${quantity}`,
          '',
          SEPARATOR,
          '',
          effectText,
          '',
          `*${item.description}*`,
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildUseItemResultEmbed(
  result,
) {
  if (!result.ok) {
    if (
      result.reason ===
      'stamina_full'
    ) {
      return applyStyle(
        new EmbedBuilder()
          .setTitle(
            `${E.stamina} KHÔNG THỂ SỬ DỤNG`,
          )
          .setDescription(
            [
              'Thể Lực của đạo hữu hiện đã viên mãn.',
              '',
              SEPARATOR,
              '',
              '*Không cần lãng phí Hồi Nguyên Đan lúc này.*',
            ].join(
              '\n',
            ),
          ),
      );
    }

    if (
      result.reason ===
      'effect_active'
    ) {
      return applyStyle(
        new EmbedBuilder()
          .setTitle(
            `${E.pill} DƯỢC HIỆU VẪN CÒN`,
          )
          .setDescription(
            [
              'Dược lực của viên đan trước vẫn chưa được tiêu hao.',
              '',
              SEPARATOR,
              '',
              '*Hãy sử dụng hết dược hiệu hiện tại trước khi dùng thêm.*',
            ].join(
              '\n',
            ),
          ),
      );
    }

    return applyStyle(
      new EmbedBuilder()
        .setTitle(
          `${E.pill} KHÔNG THỂ SỬ DỤNG`,
        )
        .setDescription(
          'Đạo hữu không còn vật phẩm này hoặc vật phẩm hiện chưa thể sử dụng.',
        ),
    );
  }

  if (
    result.type ===
    'cultivation_buff'
  ) {
    return applyStyle(
      new EmbedBuilder()
        .setTitle(
          `${E.pill} TỤ KHÍ ĐAN`,
        )
        .setDescription(
          [
            'Đạo hữu nuốt xuống một viên Tụ Khí Đan, dược lực lập tức hóa thành linh khí tinh thuần.',
            '',
            SEPARATOR,
            '',
            `${E.cultivation} Hiệu quả Tu Luyện kế tiếp: **+${percent(
              result.bonus,
            )} Tu Vi**`,
            `${E.pill} Còn lại: **${result.remaining}**`,
            '',
            '*Dược lực sẽ tiêu hao sau lần Tu Luyện tiếp theo.*',
          ].join(
            '\n',
          ),
        ),
    );
  }

  if (
    result.type ===
    'stamina_restore'
  ) {
    return applyStyle(
      new EmbedBuilder()
        .setTitle(
          `${E.pill} HỒI NGUYÊN ĐAN`,
        )
        .setDescription(
          [
            'Dược lực lan khắp kinh mạch, tinh khí dần khôi phục.',
            '',
            SEPARATOR,
            '',
            `${E.stamina} Thể Lực: **${result.before} → ${result.after}**`,
            `${E.pill} Còn lại: **${result.remaining}**`,
            '',
            '*Khí huyết đã ổn định hơn.*',
          ].join(
            '\n',
          ),
        ),
    );
  }

  return applyStyle(
    new EmbedBuilder()
      .setTitle(
        `${E.pill} PHÁ CẢNH ĐAN`,
      )
      .setDescription(
        [
          'Dược lực xung kích bình cảnh, đạo cơ dần trở nên thông suốt.',
          '',
          SEPARATOR,
          '',
          `${E.realm} Lần Đột Phá kế tiếp: **+${percent(
            result.bonus,
          )}**`,
          `${E.pill} Còn lại: **${result.remaining}**`,
          '',
          '*Dược lực sẽ tiêu hao sau lần Đột Phá tiếp theo.*',
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildBreakthroughEmbed(
  result,
) {
  if (
    !result.ok &&
    result.reason ===
      'max_realm'
  ) {
    return applyStyle(
      new EmbedBuilder()
        .setTitle(
          `${E.realm} ĐẠO TẬN CỬU TIÊU`,
        )
        .setDescription(
          'Đạo hữu đã đứng tại cảnh giới cao nhất hiện có của Tiên Lộ.',
        ),
    );
  }

  if (
    !result.ok &&
    result.reason ===
      'not_ready'
  ) {
    const missing =
      Math.max(
        0,
        result.required -
          result.profile
            .cultivation,
      );

    return applyStyle(
      new EmbedBuilder()
        .setTitle(
          `${E.realm} BÌNH CẢNH CHƯA MỞ`,
        )
        .setDescription(
          [
            `${E.realm} Cảnh Giới hiện tại: **${getRealmDisplay(
              result.profile,
            )}**`,
            `${E.cultivation} Tu Vi: **${number(
              result.profile
                .cultivation,
            )}**`,
            `${E.cultivation} Thiếu: **${number(
              missing,
            )}**`,
            '',
            '*Tiếp tục tu luyện để chạm tới bình cảnh.*',
          ].join(
            '\n',
          ),
        ),
    );
  }

  const chance =
    Math.round(
      result.chance * 100,
    );

  const pillLine =
    result.breakthroughPillBonus >
      0
      ? `${E.pill} Phá Cảnh Đan: **+${percent(
          result.breakthroughPillBonus,
        )}**`
      : null;

  const techniqueLine =
    result
      .techniqueBreakthroughBonus >
    0
      ? `${E.technique} Huyền Nguyên Tâm Pháp: **+${percent(
          result.techniqueBreakthroughBonus,
        )}**`
      : null;

  const petChanceLine =
    result.petBreakthroughBonus >
    0
      ? `${getPetEmoji(
          'thien_loi_bach_ho',
        )} Thiên Lôi Bạch Hổ: **+${percent(
          result.petBreakthroughBonus,
        )}**`
      : null;

  if (
    result.success
  ) {
    return applyStyle(
      new EmbedBuilder()
        .setTitle(
          `${E.realm} PHÁ CẢNH THÀNH CÔNG`,
        )
        .setDescription(
          [
            'Thiên địa linh khí chấn động, đạo cơ viên mãn.',
            '',
            SEPARATOR,
            '',
            `**${result.oldRealm}**`,
            '↓',
            `**${result.newRealm}**`,
            '',
            `${E.realm} Tỷ Lệ Đột Phá: **${chance}%**`,
            techniqueLine,
            petChanceLine,
            pillLine,
          ]
            .filter(
              (
                line,
              ) =>
                line !== null,
            )
            .join(
              '\n',
            ),
        ),
    );
  }

  const protectionLine =
    result.talismanProtected
      ? `${E.talisman} Hộ Đạo Phù: **Bảo toàn toàn bộ Tu Vi · Đã tiêu hao**`
      : null;

  const equipmentLossLine =
    result.equipmentLossSaved >
    0
      ? `${E.talisman} Huyền Thiết Hộ Phù: **Giảm ${number(
          result.equipmentLossSaved,
        )} Tu Vi hao tổn**`
      : null;

  const petLossLine =
    result.petLossSaved >
    0
      ? `${getPetEmoji(
          'huyen_giap_linh_quy',
        )} Huyền Giáp Linh Quy: **Giảm ${number(
          result.petLossSaved,
        )} Tu Vi hao tổn**`
      : null;

  return applyStyle(
    new EmbedBuilder()
      .setTitle(
        `${E.realm} ĐỘT PHÁ THẤT BẠI`,
      )
      .setDescription(
        [
          'Thiên uy giáng xuống, linh lực nhất thời tan loạn.',
          '',
          SEPARATOR,
          '',
          `${E.realm} Cảnh Giới: **${result.oldRealm}**`,
          `${E.cultivation} Tu Vi Hao Tổn: **-${number(
            result.loss,
          )}**`,
          protectionLine,
          equipmentLossLine,
          petLossLine,
          `${E.realm} Tỷ Lệ Đột Phá: **${chance}%**`,
          techniqueLine,
          petChanceLine,
          pillLine,
          '',
          '*Chỉnh tức đạo tâm rồi hãy thử lại.*',
        ]
          .filter(
            (
              line,
            ) =>
              line !== null,
          )
          .join(
            '\n',
          ),
      ),
  );
}

export function buildProfileEmbed(
  user,
  profile,
) {
  const required =
    getCultivationRequired(
      profile,
    );

  const baseChance =
    Math.round(
      getBreakthroughChance(
        profile,
      ) * 100,
    );

  const effects =
    buildEffectsText(
      profile,
    );

  const equippedEquipment =
    getEquippedEquipment(
      profile,
    );

  const activeTechnique =
    getActiveTechnique(
      profile,
    );

  const activeTalisman =
    getActiveTalisman(
      profile,
    );

  const activePet =
    getActivePet(
      profile,
    );

  const equipmentLine =
    equippedEquipment
      ? `${equippedEquipment.emoji} Pháp Khí: **${equippedEquipment.name}**`
      : 'Pháp Khí: **Chưa Trang Bị**';

  const techniqueLine =
    activeTechnique
      ? `${activeTechnique.emoji} Công Pháp: **${activeTechnique.name}**`
      : `${E.technique} Công Pháp: **Chưa Tu Luyện**`;

  const talismanLine =
    activeTalisman
      ? `${E.talisman} Phù Hiệu: **${activeTalisman.name}**`
      : `${E.talisman} Phù Hiệu: **Chưa Kích Hoạt**`;

  const petLine =
    activePet
      ? `${activePet.emoji} Linh Thú: **${activePet.name}**`
      : 'Linh Thú: **Chưa Có**';

  const techniqueBreakthroughBonus =
    activeTechnique
      ?.effectType ===
      'breakthrough_bonus'
      ? Math.round(
          activeTechnique
            .effectValue * 100,
        )
      : 0;

  const petBreakthroughBonus =
    activePet
      ?.effectType ===
      'breakthrough_bonus'
      ? Math.round(
          activePet
            .effectValue * 100,
        )
      : 0;

  const chance =
    Math.min(
      95,
      baseChance +
        techniqueBreakthroughBonus +
        petBreakthroughBonus,
    );

  return applyStyle(
    new EmbedBuilder()
      .setTitle(
        'HỒ SƠ TIÊN NHÂN',
      )
      .setDescription(
        [
          `${E.user} Đạo Hữu: <@${user.id}>`,
          `${E.realm} Cảnh Giới: **${getRealmDisplay(
            profile,
          )}**`,
          `${E.spiritRoot} Linh Căn: **${profile.spiritRoot.name}**`,
          `Phẩm Chất: **${profile.spiritRoot.rarity}**`,
          equipmentLine,
          techniqueLine,
          talismanLine,
          petLine,
          '',
          `${E.cultivation} Tu Vi: **${number(
            profile.cultivation,
          )} / ${number(
            required,
          )}**`,
          `${E.spiritStone} Linh Thạch: **${number(
            profile.spiritStones,
          )}**`,
          `${E.stamina} Thể Lực: **${profile.stamina} / ${profile.maxStamina}**`,
          `${E.realm} Tỷ Lệ Đột Phá: **${chance}%**`,
          effects,
          '',
          SEPARATOR,
          '',
          `Tu Luyện: **${profile.stats.cultivateCount || 0} lần**`,
          `Kỳ Ngộ: **${profile.stats.fortunes || 0} lần**`,
          `Thám Hiểm: **${profile.stats.adventureCount || 0} lần**`,
          `Đại Cơ Duyên: **${profile.stats.greatFortunes || 0} lần**`,
          `Vật Phẩm Tìm Thấy: **${profile.stats.itemsFound || 0}**`,
          `Công Pháp Lĩnh Ngộ: **${profile.stats.techniquesLearned || 0}**`,
          `Phù Hiệu Kích Hoạt: **${profile.stats.talismansActivated || 0}**`,
          `Linh Thú Thu Phục: **${profile.stats.petsCaptured || 0}**`,
          `Đột Phá Thành Công: **${profile.stats.breakthroughSuccess || 0}**`,
          `Đột Phá Thất Bại: **${profile.stats.breakthroughFail || 0}**`,
        ]
          .filter(
            (
              line,
            ) =>
              line !== null,
          )
          .join(
            '\n',
          ),
      ),
  );
}

export function buildLeaderboardEmbed(
  entries,
  guild,
) {
  const lines =
    entries.map(
      (
        entry,
        index,
      ) => {
        const member =
          guild?.members
            ?.cache
            ?.get(
              entry.userId,
            );

        const name =
          member
            ?.displayName ||
          `<@${entry.userId}>`;

        return [
          `${E.moon} ${index + 1} · **${name}**`,
          `${E.realm} **${getRealmDisplay(
            entry.profile,
          )}** ${E.cultivation} **${number(
            entry.profile
              .cultivation,
          )}** Tu Vi`,
        ].join(
          '\n',
        );
      },
    );

  return applyStyle(
    new EmbedBuilder()
      .setTitle(
        '<a:trangtrig2:1546040703375904801> 𝓣𝓲𝓮̂𝓷 𝓑𝓪̉𝓷𝓰 <a:trangtrig3:1546040818261954610>',
      )
      .setDescription(
        lines.length > 0
          ? lines.join(
              '\n\n',
            )
          : 'Tiên Bảng hiện chưa lưu danh bất kỳ đạo hữu nào.',
      ),
  );
}
