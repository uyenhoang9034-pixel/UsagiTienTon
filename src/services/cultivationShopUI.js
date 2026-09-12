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
  CULTIVATION_SHOP_CATEGORIES,
  getCultivationShopItem,
  getCultivationShopItems,
} from './cultivationShop.js';

const TITLE_LEFT = '<a:trangtrig2:1546040703375904801>';
const TITLE_RIGHT = '<a:trangtrig3:1546040818261954610>';
const SEPARATOR = '꒷꒦︶꒷꒦︶ ๋ ࣭ ⭑꒷꒦';
const SPIRIT_STONE = CULTIVATION_CONFIG.ui.emojis.spiritStone;
const PET_BUTTON_EMOJI = { id: CULTIVATION_CONFIG.ui.buttonEmojis.pet };
const INVENTORY_BUTTON_EMOJI = { id: CULTIVATION_CONFIG.ui.buttonEmojis.inventory };
const TREASURE_BUTTON_EMOJI = { id: CULTIVATION_CONFIG.ui.buttonEmojis.treasure };
const FORMATION_BUTTON_EMOJI = { id: '1547915911497785435' };

function number(value) {
  return new Intl.NumberFormat('vi-VN').format(
    Math.max(0, Math.round(Number(value) || 0)),
  );
}

function style(embed) {
  embed.setColor(CULTIVATION_CONFIG.ui.color);
  embed.setFooter({ text: CULTIVATION_CONFIG.ui.footer });

  if (CULTIVATION_CONFIG.ui.image) {
    embed.setImage(CULTIVATION_CONFIG.ui.image);
  }

  return embed;
}

function title(label) {
  return `${TITLE_LEFT} ${label} ${TITLE_RIGHT}`;
}

function parseEmoji(emoji) {
  const match = String(emoji || '').match(/^<(a?):([^:]+):(\d+)>$/);

  if (!match) {
    return null;
  }

  return {
    id: match[3],
    name: match[2],
    animated: match[1] === 'a',
  };
}

function resolveTienPhuongEmoji(guild) {
  const emoji = guild?.emojis?.cache?.find?.(
    (item) => item.name === 'tttienphuong',
  );

  if (!emoji?.id) {
    return null;
  }

  return {
    id: emoji.id,
    name: emoji.name,
    animated: emoji.animated,
  };
}

function shopButton(ownerId, action, label, emoji = null) {
  const component = new ButtonBuilder()
    .setCustomId(`tutien_shop:${ownerId}:${action}`)
    .setLabel(label)
    .setStyle(ButtonStyle.Secondary);

  if (emoji) {
    component.setEmoji(emoji);
  }

  return component;
}

function productButton(ownerId, item) {
  return shopButton(
    ownerId,
    `item:${item.id}`,
    item.name,
    parseEmoji(item.emoji),
  );
}

function categoryButton(ownerId, categoryId) {
  if (categoryId === 'materials') {
    return shopButton(
      ownerId,
      `category:${categoryId}`,
      'Nguyên Liệu',
      INVENTORY_BUTTON_EMOJI,
    );
  }

  if (categoryId === 'formation') {
    return shopButton(
      ownerId,
      `category:${categoryId}`,
      'Trận Pháp',
      FORMATION_BUTTON_EMOJI,
    );
  }

  if (categoryId === 'treasures') {
    return shopButton(
      ownerId,
      `category:${categoryId}`,
      'Kỳ Trân',
      TREASURE_BUTTON_EMOJI,
    );
  }

  return shopButton(
    ownerId,
    `category:${categoryId}`,
    'Linh Thú',
    PET_BUTTON_EMOJI,
  );
}

export function buildShopMainEmbed(user, profile) {
  return style(
    new EmbedBuilder()
      .setTitle(title('𝓣𝓲𝓮̂𝓷 𝓟𝓱𝓾̛𝓸̛̀𝓷𝓰 · 仙坊'))
      .setDescription([
        '*Tiên gia khai phường, vạn bảo lưu chuyển.*',
        '',
        `${SPIRIT_STONE} **Linh Thạch:** ${number(profile.spiritStones)}`,
        '',
        SEPARATOR,
        '',
        `${CULTIVATION_CONFIG.ui.emojis.herb} **Nguyên Liệu**`,
        'Thiên Linh Thảo · Huyền Thiết',
        '',
        '<a:ttranvan:1547959053114671297> **Trận Pháp**',
        'Trận Văn · Ngũ Hành Tinh Thạch · Dị Thuộc Tính Tinh Thạch',
        '',
        `${CULTIVATION_CONFIG.ui.emojis.swordManual} **Kỳ Trân**`,
        'Vô Danh Kiếm Phổ · Thượng Cổ Phù',
        '',
        `${getCultivationShopItem('thai_co_long_tuong')?.emoji || ''} **Linh Thú**`,
        '**Thái Cổ Long Tượng · Thần Thoại**',
        `${SPIRIT_STONE} **2.000.000.000 Linh Thạch**`,
        '*Không thể gặp hoặc thu phục tự nhiên.*',
        '',
        SEPARATOR,
        '',
        '<a:ttlinhquang:1547489273949978725> *Tiên duyên hữu định — Thám Hiểm nếu hữu duyên gặp **Thương Nhân Bí Ẩn**, đạo hữu có thể mua được bảo vật với giá rẻ bất ngờ.*',
        '',
        `**Đạo hữu:** <@${user.id}>`,
      ].join('\n')),
  );
}

export function buildShopMainRows(ownerId, guild = null) {
  const shopEmoji = resolveTienPhuongEmoji(guild);

  return [
    new ActionRowBuilder().addComponents(
      categoryButton(ownerId, 'materials'),
      categoryButton(ownerId, 'formation'),
      categoryButton(ownerId, 'treasures'),
      categoryButton(ownerId, 'pets'),
    ),
    new ActionRowBuilder().addComponents(
      shopButton(ownerId, 'dashboard', 'Quay lại Tiên Lộ', shopEmoji),
    ),
  ];
}

export function buildShopCategoryEmbed(categoryId, profile) {
  const category = CULTIVATION_SHOP_CATEGORIES[categoryId];
  const items = getCultivationShopItems(categoryId);

  return style(
    new EmbedBuilder()
      .setTitle(title(`Tiên Phường · ${category?.name || 'Hàng Hóa'}`))
      .setDescription([
        `${SPIRIT_STONE} **Linh Thạch:** ${number(profile.spiritStones)}`,
        '',
        ...(items.length
          ? items.map(
              (item) => `${item.emoji || ''} **${item.name}** — ${SPIRIT_STONE} **${number(item.price)}**`,
            )
          : ['*Chưa có hàng hóa trong quầy này.*']),
        '',
        '*Chọn vật phẩm bên dưới để xem trước rồi mới xác nhận mua.*',
      ].join('\n')),
  );
}

export function buildShopCategoryRows(ownerId, categoryId, guild = null) {
  const items = getCultivationShopItems(categoryId);
  const rows = [];

  for (let index = 0; index < items.length; index += 5) {
    rows.push(
      new ActionRowBuilder().addComponents(
        ...items.slice(index, index + 5).map((item) => productButton(ownerId, item)),
      ),
    );
  }

  const shopEmoji = resolveTienPhuongEmoji(guild);

  rows.push(
    new ActionRowBuilder().addComponents(
      shopButton(ownerId, 'main', 'Tiên Phường', shopEmoji),
      shopButton(ownerId, 'dashboard', 'Tiên Lộ', shopEmoji),
    ),
  );

  return rows.slice(0, 5);
}

export function buildShopItemEmbed(itemId, profile) {
  const item = getCultivationShopItem(itemId);

  if (!item) {
    return style(
      new EmbedBuilder()
        .setTitle(title('Tiên Phường'))
        .setDescription('Không tìm thấy vật phẩm này trong Tiên Phường.'),
    );
  }

  const canAfford =
    (Number(profile.spiritStones) || 0) >= item.price;

  return style(
    new EmbedBuilder()
      .setTitle(title(item.name))
      .setDescription([
        `${item.emoji || ''} **${item.name}**`,
        '',
        `${SPIRIT_STONE} **Giá:** ${number(item.price)} Linh Thạch`,
        `${SPIRIT_STONE} **Đang có:** ${number(profile.spiritStones)} Linh Thạch`,
        '',
        canAfford
          ? '*Linh Thạch đã đủ, đạo hữu có thể xác nhận giao dịch.*'
          : '*Linh Thạch chưa đủ để đổi lấy vật phẩm này.*',
      ].join('\n')),
  );
}

export function buildShopItemRows(ownerId, itemId, guild = null) {
  const item = getCultivationShopItem(itemId);
  const shopEmoji = resolveTienPhuongEmoji(guild);

  if (!item) {
    return [
      new ActionRowBuilder().addComponents(
        shopButton(ownerId, 'main', 'Tiên Phường', shopEmoji),
      ),
    ];
  }

  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`tutien_shop:${ownerId}:buy:${item.id}`)
        .setLabel('Mua ×1')
        .setEmoji(parseEmoji(item.emoji) || SPIRIT_STONE)
        .setStyle(ButtonStyle.Success),
      shopButton(
        ownerId,
        `category:${item.category}`,
        'Quay lại quầy',
        shopEmoji,
      ),
      shopButton(ownerId, 'main', 'Tiên Phường', shopEmoji),
    ),
  ];
}

export function buildShopPurchaseEmbed(result) {
  const item = result.item;

  if (!result.ok) {
    let text = 'Giao dịch không thể hoàn tất.';

    if (result.reason === 'not_enough_stones') {
      text = `${SPIRIT_STONE} **Linh Thạch không đủ.**\nCần **${number(item?.price)}**, hiện có **${number(result.profile?.spiritStones)}**.`;
    }

    if (result.reason === 'already_owned') {
      text = `${item?.emoji || ''} **${item?.name || 'Linh Thú'}** đã nhận đạo hữu làm chủ, không thể mua lần thứ hai.`;
    }

    return style(
      new EmbedBuilder()
        .setTitle(title('Giao Dịch Chưa Thành'))
        .setDescription(text),
    );
  }

  return style(
    new EmbedBuilder()
      .setTitle(title('Giao Dịch Hoàn Thành'))
      .setDescription([
        `${item.emoji || ''} Đã mua **${item.name} ×1**`,
        `${SPIRIT_STONE} Đã tiêu: **${number(result.price)} Linh Thạch**`,
        `${SPIRIT_STONE} Còn lại: **${number(result.profile.spiritStones)} Linh Thạch**`,
        '',
        item.kind === 'pet'
          ? '*Thái Cổ Long Tượng đã chính thức nhận chủ.*'
          : `*Số lượng hiện có: **${number(result.ownedQuantity)}***`,
      ].join('\n')),
  );
}

export function buildShopPurchaseRows(ownerId, result, guild = null) {
  const item = result.item;
  const shopEmoji = resolveTienPhuongEmoji(guild);

  if (!item) {
    return [
      new ActionRowBuilder().addComponents(
        shopButton(ownerId, 'main', 'Tiên Phường', shopEmoji),
      ),
    ];
  }

  return [
    new ActionRowBuilder().addComponents(
      shopButton(
        ownerId,
        `category:${item.category}`,
        'Tiếp tục xem quầy',
        shopEmoji,
      ),
      shopButton(ownerId, 'main', 'Tiên Phường', shopEmoji),
    ),
  ];
}

export function getTienPhuongButtonEmoji(guild) {
  return resolveTienPhuongEmoji(guild);
}
