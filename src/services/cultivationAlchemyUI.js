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
  getAlchemyIngredientQuantity,
  getAlchemyRecipe,
  getAlchemyRecipes,
} from './cultivationAlchemy.js';

const SEPARATOR =
  '꒷꒦︶꒷꒦︶ ๋ ࣭ ⭑꒷꒦';

const ALCHEMY_BUTTON_EMOJI = {
  id:
    CULTIVATION_CONFIG
      .ui
      .buttonEmojis
      .alchemy,
};

const USER_EMOJI =
  CULTIVATION_CONFIG
    .ui
    .emojis
    .user;

const HERB_EMOJI =
  CULTIVATION_CONFIG
    .ui
    .emojis
    .herb;

const PILL_EMOJI =
  CULTIVATION_CONFIG
    .ui
    .emojis
    .pill;

const FURNACE_EMOJI =
  CULTIVATION_CONFIG
    .ui
    .emojis
    .furnace;

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

function formatPercent(
  chance,
) {
  return `${Math.round(
    Number(
      chance || 0,
    ) * 100,
  )}%`;
}

export function buildAlchemyEmbed(
  user,
  profile,
) {
  const herbQuantity =
    Math.max(
      0,
      Number(
        profile.inventory
          ?.thien_linh_thao,
      ) || 0,
    );

  const recipeLines =
    getAlchemyRecipes()
      .map(
        (
          recipe,
        ) => [
          `${PILL_EMOJI} **${recipe.name}**`,
          `Cần: **${recipe.ingredientAmount} Thiên Linh Thảo**`,
          `Tỷ Lệ Thành Công: **${formatPercent(
            recipe.successChance,
          )}**`,
        ].join(
          '\n',
        ),
      )
      .join(
        '\n\n',
      );

  return applyStyle(
    new EmbedBuilder()
      .setTitle(
        `${FURNACE_EMOJI} ĐAN LÔ · 炼丹`,
      )
      .setDescription(
        [
          `${USER_EMOJI} **Đạo Hữu**: <@${user.id}>`,
          '',
          SEPARATOR,
          '',
          `${HERB_EMOJI} **Nguyên Liệu Hiện Có**`,
          `Thiên Linh Thảo: **${herbQuantity}**`,
          '',
          `${PILL_EMOJI} **Đan Phương Có Thể Luyện**`,
          '',
          recipeLines,
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildAlchemyRows(
  ownerId,
  profile,
) {
  const options =
    getAlchemyRecipes()
      .map(
        (
          recipe,
        ) => {
          const available =
            getAlchemyIngredientQuantity(
              profile,
              recipe,
            );

          return {
            label:
              recipe.name,

            value:
              recipe.id,

            description:
              `Cần ${recipe.ingredientAmount} Linh Thảo · Có ${available} · ${formatPercent(
                recipe.successChance,
              )}`.slice(
                0,
                100,
              ),
          };
        },
      );

  return [
    new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId(
            `tutien_alchemy_select:${ownerId}`,
          )
          .setPlaceholder(
            'Chọn Đan Dược muốn luyện',
          )
          .setMinValues(
            1,
          )
          .setMaxValues(
            1,
          )
          .addOptions(
            options,
          ),
      ),

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
            ALCHEMY_BUTTON_EMOJI,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),
  ];
}

export function buildAlchemyConfirmEmbed(
  user,
  profile,
  recipeId,
) {
  const recipe =
    getAlchemyRecipe(
      recipeId,
    );

  if (!recipe) {
    return applyStyle(
      new EmbedBuilder()
        .setTitle(
          `${FURNACE_EMOJI} KHÔNG TÌM THẤY ĐAN PHƯƠNG`,
        )
        .setDescription(
          'Đan phương này không tồn tại.',
        ),
    );
  }

  const available =
    getAlchemyIngredientQuantity(
      profile,
      recipe,
    );

  return applyStyle(
    new EmbedBuilder()
      .setTitle(
        `${FURNACE_EMOJI} LUYỆN ${recipe.name.toUpperCase()}`,
      )
      .setDescription(
        [
          `${USER_EMOJI} **Đạo Hữu**: <@${user.id}>`,
          '',
          `${HERB_EMOJI} **Thiên Linh Thảo**: ${available}`,
          `${HERB_EMOJI} **Cần**: ${recipe.ingredientAmount}`,
          '',
          `**Tỷ Lệ Thành Công**: ${formatPercent(
            recipe.successChance,
          )}`,
          '',
          SEPARATOR,
          '',
          '*Một lò đan thành hay bại, chỉ cách nhau một tia hỏa hậu.*',
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildAlchemyConfirmRows(
  ownerId,
  recipeId,
) {
  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:alchemy_make:${recipeId}`,
          )
          .setLabel(
            'Luyện Đan',
          )
          .setEmoji(
            ALCHEMY_BUTTON_EMOJI,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),

        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:alchemy`,
          )
          .setLabel(
            'Quay lại Đan Lô',
          )
          .setEmoji(
            ALCHEMY_BUTTON_EMOJI,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),
  ];
}

export function buildAlchemyResultEmbed(
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
          `${FURNACE_EMOJI} NGUYÊN LIỆU KHÔNG ĐỦ`,
        )
        .setDescription(
          [
            '**KHÔNG THỂ KHAI LÒ**',
            'Linh thảo trong Túi Đồ chưa đủ để luyện đan.',
            '',
            SEPARATOR,
            '',
            `${HERB_EMOJI} **Hiện Có**: ${result.available}`,
            `${HERB_EMOJI} **Cần**: ${result.recipe.ingredientAmount}`,
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
          `${FURNACE_EMOJI} LUYỆN ĐAN KHÔNG THÀNH`,
        )
        .setDescription(
          'Không thể tiến hành luyện đan.',
        ),
    );
  }

  if (
    result.success
  ) {
    return applyStyle(
      new EmbedBuilder()
        .setTitle(
          `${FURNACE_EMOJI} ĐAN THÀNH`,
        )
        .setDescription(
          [
            'Linh hỏa dần tắt, đan hương lan khắp động phủ.',
            '',
            SEPARATOR,
            '',
            `${PILL_EMOJI} **Nhận Được**: ${result.resultItem.name} ×1`,
            `${HERB_EMOJI} **Thiên Linh Thảo**: -${result.consumed}`,
            '',
            '*Đan văn ngưng tụ, dược lực viên mãn.*',
          ].join(
            '\n',
          ),
        ),
    );
  }

  return applyStyle(
    new EmbedBuilder()
      .setTitle(
        `${FURNACE_EMOJI} LUYỆN ĐAN THẤT BẠI`,
      )
      .setDescription(
        [
          'Hỏa hậu mất cân bằng, linh dược hóa thành tro bụi.',
          '',
          SEPARATOR,
          '',
          `${HERB_EMOJI} **Thiên Linh Thảo**: -${result.consumed}`,
          '',
          '*Đan đạo vốn khó, một lần thất bại chưa thể đoạn tiên tâm.*',
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildAlchemyResultRows(
  ownerId,
) {
  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:alchemy`,
          )
          .setLabel(
            'Quay lại Đan Lô',
          )
          .setEmoji(
            ALCHEMY_BUTTON_EMOJI,
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
            ALCHEMY_BUTTON_EMOJI,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),
  ];
}
