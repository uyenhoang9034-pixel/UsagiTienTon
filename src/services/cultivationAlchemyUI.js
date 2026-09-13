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
  CULTIVATION_CRAFT_QUANTITIES,
  getAlchemyIngredientQuantity,
  getAlchemyRecipe,
  getAlchemyRecipes,
} from './cultivationAlchemy.js';

const SEPARATOR = '꒷꒦︶꒷꒦︶ ๋ ࣭ ⭑꒷꒦';
const ALCHEMY_BUTTON_EMOJI = {
  id: CULTIVATION_CONFIG.ui.buttonEmojis.alchemy,
};
const USER_EMOJI = CULTIVATION_CONFIG.ui.emojis.user;
const HERB_EMOJI = CULTIVATION_CONFIG.ui.emojis.herb;
const PILL_EMOJI = CULTIVATION_CONFIG.ui.emojis.pill;
const FURNACE_EMOJI = CULTIVATION_CONFIG.ui.emojis.furnace;

function applyStyle(embed) {
  embed.setColor(CULTIVATION_CONFIG.ui.color);
  embed.setFooter({ text: CULTIVATION_CONFIG.ui.footer });
  if (CULTIVATION_CONFIG.ui.image) {
    embed.setImage(CULTIVATION_CONFIG.ui.image);
  }
  return embed;
}

function formatPercent(chance) {
  return `${Math.round((Number(chance) || 0) * 100)}%`;
}

function number(value) {
  return new Intl.NumberFormat('vi-VN').format(
    Math.max(0, Math.round(Number(value) || 0)),
  );
}

export function buildAlchemyEmbed(user, profile) {
  const herbQuantity = Math.max(
    0,
    Number(profile.inventory?.thien_linh_thao) || 0,
  );

  const recipeLines = getAlchemyRecipes()
    .map((recipe) => [
      `${PILL_EMOJI} **${recipe.name}**`,
      `Cần: **${recipe.ingredientAmount} Thiên Linh Thảo / lần**`,
      `Tỷ Lệ Thành Công: **${formatPercent(recipe.successChance)}**`,
    ].join('\n'))
    .join('\n\n');

  return applyStyle(
    new EmbedBuilder()
      .setTitle(`${FURNACE_EMOJI} ĐAN LÔ · 炼丹`)
      .setDescription([
        `${USER_EMOJI} **Đạo Hữu**: <@${user.id}>`,
        '',
        SEPARATOR,
        '',
        `${HERB_EMOJI} **Nguyên Liệu Hiện Có**`,
        `Thiên Linh Thảo: **${number(herbQuantity)}**`,
        '',
        `${PILL_EMOJI} **Đan Phương Có Thể Luyện**`,
        '',
        recipeLines,
        '',
        '*Có thể khai lò theo mẻ ×1, ×10, ×100 hoặc ×1000. Mỗi lần trong mẻ được tính tỷ lệ thành công độc lập.*',
      ].join('\n')),
  );
}

export function buildAlchemyRows(ownerId, profile) {
  const options = getAlchemyRecipes().map((recipe) => {
    const available = getAlchemyIngredientQuantity(profile, recipe);
    return {
      label: recipe.name,
      value: recipe.id,
      description: `Cần ${recipe.ingredientAmount} Linh Thảo/lần · Có ${available} · ${formatPercent(recipe.successChance)}`.slice(0, 100),
    };
  });

  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`tutien_alchemy_select:${ownerId}`)
        .setPlaceholder('Chọn Đan Dược muốn luyện')
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(options),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tutien_action:${ownerId}:dashboard`)
        .setLabel('Quay lại Tiên Lộ')
        .setEmoji(ALCHEMY_BUTTON_EMOJI)
        .setStyle(ButtonStyle.Secondary),
    ),
  ];
}

export function buildAlchemyConfirmEmbed(user, profile, recipeId) {
  const recipe = getAlchemyRecipe(recipeId);
  if (!recipe) {
    return applyStyle(
      new EmbedBuilder()
        .setTitle(`${FURNACE_EMOJI} KHÔNG TÌM THẤY ĐAN PHƯƠNG`)
        .setDescription('Đan phương này không tồn tại.'),
    );
  }

  const available = getAlchemyIngredientQuantity(profile, recipe);

  return applyStyle(
    new EmbedBuilder()
      .setTitle(`${FURNACE_EMOJI} LUYỆN ${recipe.name.toUpperCase()}`)
      .setDescription([
        `${USER_EMOJI} **Đạo Hữu**: <@${user.id}>`,
        '',
        `${HERB_EMOJI} **Thiên Linh Thảo**: ${number(available)}`,
        `${HERB_EMOJI} **Cần mỗi lần**: ${number(recipe.ingredientAmount)}`,
        '',
        `**Tỷ Lệ Thành Công mỗi lần**: ${formatPercent(recipe.successChance)}`,
        '',
        '**Chọn số lượng khai lò:**',
        ...CULTIVATION_CRAFT_QUANTITIES.map(
          (quantity) => `×${quantity} — cần **${number(recipe.ingredientAmount * quantity)}** Thiên Linh Thảo`,
        ),
        '',
        SEPARATOR,
        '',
        '*Mỗi lần luyện trong mẻ đều roll thành công riêng; nguyên liệu của toàn bộ mẻ được tiêu ngay khi khai lò.*',
      ].join('\n')),
  );
}

export function buildAlchemyConfirmRows(ownerId, recipeId) {
  return [
    new ActionRowBuilder().addComponents(
      ...CULTIVATION_CRAFT_QUANTITIES.map((quantity) =>
        new ButtonBuilder()
          .setCustomId(`tutien_craft:${ownerId}:alchemy:${recipeId}:${quantity}`)
          .setLabel(`Luyện ×${quantity}`)
          .setEmoji(ALCHEMY_BUTTON_EMOJI)
          .setStyle(ButtonStyle.Success),
      ),
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tutien_action:${ownerId}:alchemy`)
        .setLabel('Quay lại Đan Lô')
        .setEmoji(ALCHEMY_BUTTON_EMOJI)
        .setStyle(ButtonStyle.Secondary),
    ),
  ];
}

export function buildAlchemyResultEmbed(result) {
  if (!result.ok && result.reason === 'not_enough_material') {
    return applyStyle(
      new EmbedBuilder()
        .setTitle(`${FURNACE_EMOJI} NGUYÊN LIỆU KHÔNG ĐỦ`)
        .setDescription([
          '**KHÔNG THỂ KHAI LÒ**',
          `Đạo hữu muốn luyện **×${number(result.quantity)}** nhưng Linh Thảo chưa đủ.`,
          '',
          SEPARATOR,
          '',
          `${HERB_EMOJI} **Hiện Có**: ${number(result.available)}`,
          `${HERB_EMOJI} **Cần**: ${number(result.requiredMaterial)}`,
        ].join('\n')),
    );
  }

  if (!result.ok) {
    return applyStyle(
      new EmbedBuilder()
        .setTitle(`${FURNACE_EMOJI} LUYỆN ĐAN KHÔNG THÀNH`)
        .setDescription('Không thể tiến hành luyện đan.'),
    );
  }

  return applyStyle(
    new EmbedBuilder()
      .setTitle(`${FURNACE_EMOJI} KHAI LÒ HOÀN TẤT`)
      .setDescription([
        `${PILL_EMOJI} **${result.resultItem.name}**`,
        '',
        `Đã luyện: **×${number(result.quantity)}**`,
        `Thành công: **×${number(result.successCount)}**`,
        `Thất bại: **×${number(result.failCount)}**`,
        `${PILL_EMOJI} Nhận được: **×${number(result.successCount)}**`,
        `${HERB_EMOJI} Thiên Linh Thảo tiêu hao: **-${number(result.consumed)}**`,
        `${HERB_EMOJI} Còn lại: **${number(result.remainingIngredient)}**`,
        '',
        '*Một mẻ nhiều lò, thành bại đều do hỏa hậu từng lần quyết định.*',
      ].join('\n')),
  );
}

export function buildAlchemyResultRows(ownerId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tutien_action:${ownerId}:alchemy`)
        .setLabel('Tiếp tục Luyện Đan')
        .setEmoji(ALCHEMY_BUTTON_EMOJI)
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`tutien_action:${ownerId}:dashboard`)
        .setLabel('Quay lại Tiên Lộ')
        .setEmoji(ALCHEMY_BUTTON_EMOJI)
        .setStyle(ButtonStyle.Secondary),
    ),
  ];
}
