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
  getActiveTechnique,
  getLearnedTechniques,
  getTechnique,
  getTechniqueList,
  getTechniqueMaterialQuantity,
} from './cultivationTechnique.js';

const SEPARATOR =
  '꒷꒦︶꒷꒦︶ ๋ ࣭ ⭑꒷꒦';

const TECHNIQUE_BUTTON_EMOJI = {
  id:
    CULTIVATION_CONFIG
      .ui
      .buttonEmojis
      .technique,
};

const USER_EMOJI =
  CULTIVATION_CONFIG
    .ui
    .emojis
    .user;

const TECHNIQUE_EMOJI =
  CULTIVATION_CONFIG
    .ui
    .emojis
    .technique;

const SWORD_MANUAL_EMOJI =
  CULTIVATION_CONFIG
    .ui
    .emojis
    .swordManual;

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

export function buildTechniqueEmbed(
  user,
  profile,
) {
  const active =
    getActiveTechnique(
      profile,
    );

  const learned =
    getLearnedTechniques(
      profile,
    );

  const material =
    getTechniqueMaterialQuantity(
      profile,
    );

  const learnedText =
    learned.length > 0
      ? learned
          .map(
            (
              technique,
            ) => {
              const activeText =
                active?.id ===
                technique.id
                  ? ' · **Đang Tu**'
                  : '';

              return [
                `${technique.emoji} **${technique.name}**${activeText}`,
                `└ ${technique.effect}`,
              ].join(
                '\n',
              );
            },
          )
          .join(
            '\n\n',
          )
      : '*Chưa lĩnh ngộ Công Pháp nào.*';

  return applyStyle(
    new EmbedBuilder()
      .setTitle(
        `${TECHNIQUE_EMOJI} CÔNG PHÁP · 功法`,
      )
      .setDescription(
        [
          `${USER_EMOJI} Đạo Hữu: <@${user.id}>`,
          '',
          SEPARATOR,
          '',
          `${TECHNIQUE_EMOJI} **Công Pháp Đang Tu**`,
          active
            ? `${active.emoji} **${active.name}**\n└ ${active.effect}`
            : '**Chưa Tu Luyện**',
          '',
          `${SWORD_MANUAL_EMOJI} **Bí Tịch Hiện Có**`,
          `Vô Danh Kiếm Phổ: **${material}**`,
          '',
          SEPARATOR,
          '',
          `${TECHNIQUE_EMOJI} **Công Pháp Đã Lĩnh Ngộ**`,
          learnedText,
          '',
          '*Vạn pháp quy nhất, đạo tại tâm sinh.*',
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildTechniqueRows(
  ownerId,
  profile,
) {
  const learned =
    getLearnedTechniques(
      profile,
    );

  const unlearned =
    getTechniqueList()
      .filter(
        (
          technique,
        ) =>
          !profile.techniques
            ?.learned?.[
              technique.id
            ],
      );

  const rows = [];

  if (
    unlearned.length > 0
  ) {
    rows.push(
      new ActionRowBuilder()
        .addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(
              `tutien_technique_learn_select:${ownerId}`,
            )
            .setPlaceholder(
              'Chọn Công Pháp muốn lĩnh ngộ',
            )
            .addOptions(
              unlearned.map(
                (
                  technique,
                ) => ({
                  label:
                    technique.name,

                  value:
                    technique.id,

                  description:
                    technique.effect.slice(
                      0,
                      100,
                    ),
                }),
              ),
            ),
        ),
    );
  }

  if (
    learned.length > 0
  ) {
    rows.push(
      new ActionRowBuilder()
        .addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(
              `tutien_technique_activate_select:${ownerId}`,
            )
            .setPlaceholder(
              'Chọn Công Pháp muốn tu luyện',
            )
            .addOptions(
              learned.map(
                (
                  technique,
                ) => ({
                  label:
                    technique.name,

                  value:
                    technique.id,

                  description:
                    technique.effect.slice(
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
            TECHNIQUE_BUTTON_EMOJI,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),
  );

  return rows;
}

export function buildTechniqueConfirmEmbed(
  user,
  profile,
  techniqueId,
) {
  const technique =
    getTechnique(
      techniqueId,
    );

  if (!technique) {
    return applyStyle(
      new EmbedBuilder()
        .setTitle(
          `${TECHNIQUE_EMOJI} KHÔNG TÌM THẤY CÔNG PHÁP`,
        ),
    );
  }

  const material =
    getTechniqueMaterialQuantity(
      profile,
    );

  return applyStyle(
    new EmbedBuilder()
      .setTitle(
        `${technique.emoji} ${technique.name.toUpperCase()}`,
      )
      .setDescription(
        [
          `${USER_EMOJI} Đạo Hữu: <@${user.id}>`,
          '',
          '**Hiệu Quả**',
          `**${technique.effect}**`,
          '',
          `${SWORD_MANUAL_EMOJI} **Cần**`,
          'Vô Danh Kiếm Phổ: **1**',
          `Hiện Có: **${material}**`,
          '',
          SEPARATOR,
          '',
          `*${technique.description}*`,
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildTechniqueConfirmRows(
  ownerId,
  techniqueId,
) {
  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:technique_learn:${techniqueId}`,
          )
          .setLabel(
            'Lĩnh Ngộ',
          )
          .setEmoji(
            TECHNIQUE_BUTTON_EMOJI,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),

        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:technique`,
          )
          .setLabel(
            'Quay lại',
          )
          .setEmoji(
            TECHNIQUE_BUTTON_EMOJI,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),
  ];
}

export function buildTechniqueLearnResultEmbed(
  result,
) {
  if (
    !result.ok &&
    result.reason ===
      'not_enough_material'
  ) {
    return applyStyle(
      new EmbedBuilder()
        .setTitle(
          `${SWORD_MANUAL_EMOJI} BÍ TỊCH KHÔNG ĐỦ`,
        )
        .setDescription(
          [
            'Đạo hữu chưa có đủ bí tịch để lĩnh ngộ Công Pháp này.',
            '',
            SEPARATOR,
            '',
            `${SWORD_MANUAL_EMOJI} Cần: **Vô Danh Kiếm Phổ ×1**`,
            `${SWORD_MANUAL_EMOJI} Hiện Có: **${result.available}**`,
          ].join(
            '\n',
          ),
        ),
    );
  }

  if (
    !result.ok &&
    result.reason ===
      'already_learned'
  ) {
    return applyStyle(
      new EmbedBuilder()
        .setTitle(
          `${TECHNIQUE_EMOJI} ĐÃ LĨNH NGỘ`,
        )
        .setDescription(
          `Đạo hữu đã lĩnh ngộ **${result.technique.name}**.`,
        ),
    );
  }

  if (!result.ok) {
    return applyStyle(
      new EmbedBuilder()
        .setTitle(
          `${TECHNIQUE_EMOJI} LĨNH NGỘ THẤT BẠI`,
        )
        .setDescription(
          'Không thể lĩnh ngộ Công Pháp này.',
        ),
    );
  }

  return applyStyle(
    new EmbedBuilder()
      .setTitle(
        `${TECHNIQUE_EMOJI} CÔNG PHÁP LĨNH NGỘ`,
      )
      .setDescription(
        [
          'Linh quang nhập thức hải, đạo ý dần ngưng tụ trong tâm cảnh.',
          '',
          SEPARATOR,
          '',
          `${TECHNIQUE_EMOJI} Lĩnh Ngộ: **${result.technique.name}**`,
          `${SWORD_MANUAL_EMOJI} Vô Danh Kiếm Phổ: **-1**`,
          '',
          '**Hiệu Quả**',
          result.technique.effect,
          '',
          result.autoActivated
            ? `${TECHNIQUE_EMOJI} Công Pháp đã được **tự động kích hoạt**.`
            : null,
          '',
          `*${result.technique.description}*`,
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

export function buildTechniqueActivateResultEmbed(
  result,
) {
  if (!result.ok) {
    return applyStyle(
      new EmbedBuilder()
        .setTitle(
          `${TECHNIQUE_EMOJI} KHÔNG THỂ TU LUYỆN`,
        )
        .setDescription(
          'Đạo hữu chưa lĩnh ngộ Công Pháp này.',
        ),
    );
  }

  return applyStyle(
    new EmbedBuilder()
      .setTitle(
        `${TECHNIQUE_EMOJI} CÔNG PHÁP VẬN CHUYỂN`,
      )
      .setDescription(
        [
          `Đã chuyển sang tu luyện **${result.technique.name}**.`,
          '',
          SEPARATOR,
          '',
          `${result.technique.emoji} **Hiệu Quả Đang Kích Hoạt**`,
          result.technique.effect,
          '',
          `*${result.technique.description}*`,
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildTechniqueResultRows(
  ownerId,
) {
  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:technique`,
          )
          .setLabel(
            'Công Pháp',
          )
          .setEmoji(
            TECHNIQUE_BUTTON_EMOJI,
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
            TECHNIQUE_BUTTON_EMOJI,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),
  ];
}
