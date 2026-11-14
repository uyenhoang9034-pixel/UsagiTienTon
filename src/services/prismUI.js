/**
 * prismUI.js
 * Toàn bộ giao diện Components V2 dạng Chữ + Icon cho "Sắc Màu Định Mệnh".
 * 100% không dùng EmbedBuilder hay MediaGallery/hình ảnh để tối ưu RAM tối đa.
 * Sử dụng ContainerBuilder (type 17), TextDisplayBuilder (type 10), SeparatorBuilder (type 14).
 */

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} from 'discord.js';

import {
  PRISM_EMOJIS,
  IDENTITY_PROFILES,
  PRISM_ITEMS,
  STORY_SCENARIOS,
  OUTFIT_THEMES,
  OUTFIT_TOPS,
  OUTFIT_BOTTOMS,
  OUTFIT_ACCESSORIES,
  formatWithIdentity,
  formatPointChanges,
} from '../data/prismData.js';

export const IS_COMPONENTS_V2 = 1 << 15; // 32768

/**
 * Components V2 Builders thuần
 */
export class ContainerBuilder {
  constructor(data = {}) {
    this.type = 17;
    this.components = data.components || [];
    this.accentColor = data.accentColor ?? null;
  }

  setComponents(...components) {
    this.components = components.flat().map((c) => (typeof c?.toJSON === 'function' ? c.toJSON() : c));
    return this;
  }

  addComponents(...components) {
    this.components.push(
      ...components.flat().map((c) => (typeof c?.toJSON === 'function' ? c.toJSON() : c)),
    );
    return this;
  }

  toJSON() {
    return {
      type: 17,
      ...(this.accentColor ? { accent_color: this.accentColor } : {}),
      components: this.components.map((c) => (typeof c?.toJSON === 'function' ? c.toJSON() : c)),
    };
  }
}

export class TextDisplayBuilder {
  constructor(content = '') {
    this.type = 10;
    this.content = Array.isArray(content) ? content.join('\n') : String(content);
  }

  setContent(content) {
    this.content = Array.isArray(content) ? content.join('\n') : String(content);
    return this;
  }

  toJSON() {
    return {
      type: 10,
      content: this.content,
    };
  }
}

export class SeparatorBuilder {
  constructor(divider = true, spacing = 1) {
    this.type = 14;
    this.divider = divider;
    this.spacing = spacing;
  }

  setDivider(divider) {
    this.divider = divider;
    return this;
  }

  setSpacing(spacing) {
    this.spacing = spacing;
    return this;
  }

  toJSON() {
    return {
      type: 14,
      divider: this.divider,
      spacing: this.spacing,
    };
  }
}

/**
 * Tiện ích tạo header điểm số của người chơi
 */
function formatPlayerHeader(playerRecord) {
  const profile = IDENTITY_PROFILES[playerRecord?.identity_key] || IDENTITY_PROFILES.pansexual;
  const slay = playerRecord?.slay_points || 0;
  const heart = playerRecord?.heart_points || 0;
  const rebel = playerRecord?.rebel_points || 0;
  const coins = playerRecord?.rainbow_coins || 0;

  return `${profile.emoji} **${profile.name}** | ${PRISM_EMOJIS.xucauvong} **${coins} Xu**\n${PRISM_EMOJIS.trangtrig41} Thần thái: **${slay}** | ${PRISM_EMOJIS.heartg3} Chân thành: **${heart}** | ${PRISM_EMOJIS.trangtrig29} Nổi loạn: **${rebel}**`;
}

/**
 * Định dạng phần phụ lục sau mỗi lượt mini-game (Hệ số nhân x2/x3, Bùa hộ mệnh, Xu và Loot drop)
 */
function formatGameEndAddendum(rewardInfo) {
  if (!rewardInfo) return '';
  const lines = [];

  if (rewardInfo.diceMultiplier && rewardInfo.diceMultiplier > 1) {
    lines.push(
      `${PRISM_EMOJIS.xuc_xac_may_man_discord} **Xúc Xắc May Mắn đã kích hoạt:** Nhân **x${rewardInfo.diceMultiplier}** toàn bộ điểm cộng lượt này!`,
    );
  }

  if (rewardInfo.amuletTriggered) {
    lines.push(
      `${PRISM_EMOJIS.bua_ho_menh_discord} **Bùa Hộ Mệnh đã kích hoạt:** Đã chặn toàn bộ điểm bị trừ ở lượt này!`,
    );
  }

  if (rewardInfo.coinsGained) {
    lines.push(
      `${PRISM_EMOJIS.xucauvong} **Thưởng hoàn thành:** +**${rewardInfo.coinsGained}** Xu Cầu Vồng`,
    );
  }

  if (rewardInfo.lootDropped) {
    lines.push(
      `${rewardInfo.lootDropped.emoji} **Rớt vật phẩm kỷ niệm:** **${rewardInfo.lootDropped.name}** *([${rewardInfo.lootDropped.rarity}])* đã được thêm vào Túi đồ!`,
    );
  }

  return lines.length > 0 ? lines.join('\n') : '';
}

/**
 * 1. Bảng Nhận Role tại Kênh Sảnh (/setup-prism)
 */
export function buildPrismSetupPayload() {
  const introLines = [
    'Chào mừng bạn đến với sân chơi nhập vai tình huống Sắc Màu Định Mệnh!',
    '',
    'Sắc màu định mệnh là tựa game nhập vai tình huống tương tác trực tiếp, nơi bạn được tự do lựa chọn bản dạng của chính mình để bước vào những tình huống dở khóc dở cười nhưng đầy ắp niềm tự hào.',
    '',
    'Từng lựa chọn của bạn sẽ tích lũy điểm và dẫn lối tới những cái kết bất ngờ.',
    `${PRISM_EMOJIS.trangtrig41} Thần thái`,
    `${PRISM_EMOJIS.heartg3} Chân thành`,
    `${PRISM_EMOJIS.trangtrig29} Nổi loạn`,
    '',
    'Vì hiện tại số lượng kênh của server khá nhiều và để bạn có không gian riêng tư bung xõa hết mình, mong bạn hãy bấm nút bên dưới để nhận vé thông hành (Role Sắc Màu) và mở khóa khu vực chơi game riêng nhé!',
    '',
    'Hãy sống thật rực rỡ theo cách của riêng bạn!',
    '',
    `${PRISM_EMOJIS.trangtrig49} Bọn mình làm con game này với tất cả sự trân trọng và mong muốn mang lại niềm vui cho mọi người. Các thông tin về bản dạng giới / xu hướng tính dục đều được Admin tìm hiểu và chắt lọc gọn lại cho vừa vặn với thiết kế game. Chắc chắn sẽ khó tránh khỏi vài thiếu sót nhỏ, nên nếu thấy chỗ nào chưa hợp lý, các bạn cứ mở ticket nhắn nhẹ góp ý để Admin chỉnh sửa cho thật chuẩn nha!`,
  ];

  const claimButtonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('prism_claim_role')
      .setLabel('Nhận Role')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(PRISM_EMOJIS.heartg5),
  );

  const container = new ContainerBuilder().setComponents(
    new TextDisplayBuilder(`# ${PRISM_EMOJIS.heartg5} **SẮC MÀU ĐỊNH MỆNH** ${PRISM_EMOJIS.heartg5}`),
    new SeparatorBuilder(true, 1),
    new TextDisplayBuilder(introLines),
    new SeparatorBuilder(true, 1),
    claimButtonRow,
  );

  return {
    flags: IS_COMPONENTS_V2,
    components: [container.toJSON()],
    allowedMentions: { parse: [] },
  };
}

/**
 * 2. Phản hồi Ephemeral sau khi bấm Nhận Role -> Dẫn sang Private Thread
 */
export function buildPrismClaimSuccessPayload(roleId, threadId, guildId) {
  const successText = `${PRISM_EMOJIS.heartg5} **Mở khóa thành công!**\nBạn đã nhận được role <@&${roleId}>! Cánh cổng dẫn vào các kênh chơi game đã chính thức mở ra. Hãy di chuyển sang kênh chơi game (ấn nút bên dưới) để chọn vai và viết nên câu chuyện của riêng mình ngay thôi!`;

  const linkRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('Đến Kênh Chơi Game')
      .setStyle(ButtonStyle.Link)
      .setURL(`https://discord.com/channels/${guildId}/${threadId}`),
  );

  const container = new ContainerBuilder().setComponents(
    new TextDisplayBuilder(successText),
    new SeparatorBuilder(true, 1),
    linkRow,
  );

  return {
    flags: IS_COMPONENTS_V2 | MessageFlags.Ephemeral,
    components: [container.toJSON()],
    allowedMentions: { parse: [] },
  };
}

/**
 * 3. Màn hình Chọn Vai (Cố định trong Private Thread - Chỉ chọn 1 lần)
 */
export function buildPrismIdentitySelectPayload(selectedKey = 'pansexual') {
  const profile = IDENTITY_PROFILES[selectedKey] || IDENTITY_PROFILES.pansexual;

  const previewText = [
    `**Phiên bản xem trước:** ${profile.emoji} **${profile.name}**`,
    `${profile.description}`,
    '',
    `**Điểm khởi đầu:** ${PRISM_EMOJIS.trangtrig41} Thần thái: **+${profile.initialPoints.slay}** | ${PRISM_EMOJIS.heartg3} Chân thành: **+${profile.initialPoints.heart}** | ${PRISM_EMOJIS.trangtrig29} Nổi loạn: **+${profile.initialPoints.rebel}**`,
  ];

  const selectOptions = Object.values(IDENTITY_PROFILES).map((p) => ({
    label: p.name,
    value: p.key,
    description: `Khởi đầu: Slay +${p.initialPoints.slay} | Heart +${p.initialPoints.heart} | Rebel +${p.initialPoints.rebel}`,
    default: p.key === selectedKey,
  }));

  const selectRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('prism_select_identity')
      .setPlaceholder('Chọn bản dạng / xu hướng tính dục của bạn...')
      .addOptions(selectOptions),
  );

  const startButtonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`prism_start_journey:${selectedKey}`)
      .setLabel('Bắt Đầu Hành Trình')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(PRISM_EMOJIS.heartg5),
  );

  const container = new ContainerBuilder().setComponents(
    new TextDisplayBuilder(
      `# ${PRISM_EMOJIS.trangtrig50} **CHÀO MỪNG ĐẾN VỚI HÀNH TRÌNH SẮC MÀU** ${PRISM_EMOJIS.trangtrig51}`,
    ),
    new TextDisplayBuilder(
      'Xin chào, bạn muốn bước vào thế giới này với phiên bản nào của chính mình? Mỗi phiên bản mà bạn chọn sẽ có điểm khởi đầu và tính cách khác nhau. Chỉ được chọn một lần nên hãy chọn thật cẩn thận nhé!',
    ),
    new SeparatorBuilder(true, 1),
    new TextDisplayBuilder(previewText),
    new SeparatorBuilder(true, 1),
    selectRow,
    startButtonRow,
  );

  return {
    flags: IS_COMPONENTS_V2,
    components: [container.toJSON()],
    allowedMentions: { parse: [] },
  };
}

/**
 * 4. Bảng Game Tổng Hợp (Cố định trong Private Thread - Đã nâng cấp 4 hàng nút & Xu Cầu Vồng)
 */
export function buildPrismHubPayload(playerRecord) {
  const profile = IDENTITY_PROFILES[playerRecord?.identity_key] || IDENTITY_PROFILES.pansexual;
  const slay = playerRecord?.slay_points || 0;
  const heart = playerRecord?.heart_points || 0;
  const rebel = playerRecord?.rebel_points || 0;
  const coins = playerRecord?.rainbow_coins || 0;

  const descText = [
    'Chào mừng bạn đến với sân chơi tự do! Hãy chọn một hoạt động bên dưới để tích lũy điểm và khám phá những tình huống thú vị nhé!',
    '',
    '**Danh sách Mini-Game:**',
    `${PRISM_EMOJIS.trangtrig62} **Tình Huống Khó Đỡ:** Xử lý các pha ứng xử "căng não" với gia đình, họ hàng và xã hội theo cách A/B/C.`,
    `${PRISM_EMOJIS.trangtrig62} **Sàn Diễn Outfit:** Phối đồ bằng chữ theo chủ đề để hội bạn thân chấm điểm độ "cháy".`,
    `${PRISM_EMOJIS.trangtrig62} **Chat Chit Cùng Crush:** Thử tài nhắn tin thả thính và đọc vị tín hiệu từ đối phương.`,
    `${PRISM_EMOJIS.trangtrig62} **Vòng Quay Định Mệnh:** Thử vận may ngẫu nhiên trên phố Cầu Vồng — hên xui không biết trước!`,
    `${PRISM_EMOJIS.trangtrig62} Sẽ còn update dần thêm trong tương lai.`,
  ];

  // Hàng 1
  const row1 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('prism_mg_story')
      .setLabel('Tình Huống Khó Đỡ')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(PRISM_EMOJIS.trangtrig62),
    new ButtonBuilder()
      .setCustomId('prism_mg_outfit')
      .setLabel('Sàn Diễn Outfit')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(PRISM_EMOJIS.trangtrig62),
  );

  // Hàng 2
  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('prism_mg_chat')
      .setLabel('Chat Chit Cùng Crush')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(PRISM_EMOJIS.trangtrig62),
    new ButtonBuilder()
      .setCustomId('prism_mg_spin')
      .setLabel('Vòng Quay Định Mệnh')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(PRISM_EMOJIS.trangtrig62),
  );

  // Hàng 3: Túi Đồ | Cửa Hàng | Nhiệm Vụ Ngày
  const row3 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('prism_bag')
      .setLabel('Túi Đồ')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(PRISM_EMOJIS.trangtrig62),
    new ButtonBuilder()
      .setCustomId('prism_shop')
      .setLabel('Cửa Hàng')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(PRISM_EMOJIS.trangtrig62),
    new ButtonBuilder()
      .setCustomId('prism_quests')
      .setLabel('Nhiệm Vụ Ngày')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(PRISM_EMOJIS.trangtrig62),
  );

  // Hàng 4: Xem Điểm & BXH
  const row4 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('prism_leaderboard')
      .setLabel('Xem Điểm & BXH')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(PRISM_EMOJIS.trangtrig62),
  );

  const container = new ContainerBuilder().setComponents(
    new TextDisplayBuilder(
      `# ${PRISM_EMOJIS.trangtrig50} **TRUNG TÂM GIẢI TRÍ: SẮC MÀU ĐỊNH MỆNH** ${PRISM_EMOJIS.trangtrig51}`,
    ),
    new TextDisplayBuilder(
      `Bản dạng: ${profile.emoji} **${profile.name}** | ${PRISM_EMOJIS.xucauvong} **Xu Cầu Vồng:** **${coins}**\n${PRISM_EMOJIS.trangtrig41} Thần thái: **${slay}** | ${PRISM_EMOJIS.heartg3} Chân thành: **${heart}** | ${PRISM_EMOJIS.trangtrig29} Nổi loạn: **${rebel}**`,
    ),
    new SeparatorBuilder(true, 1),
    new TextDisplayBuilder(descText),
    new SeparatorBuilder(true, 1),
    row1,
    row2,
    row3,
    row4,
  );

  return {
    flags: IS_COMPONENTS_V2,
    components: [container.toJSON()],
    allowedMentions: { parse: [] },
  };
}

/**
 * 5. Mini-game 1: Màn hình Tình Huống Khó Đỡ (Ephemeral)
 */
export function buildPrismStoryPayload(scenarioIdx, playerRecord) {
  const scenario = STORY_SCENARIOS[scenarioIdx] || STORY_SCENARIOS[0];
  const profile = IDENTITY_PROFILES[playerRecord?.identity_key] || IDENTITY_PROFILES.pansexual;
  const contextFormatted = formatWithIdentity(scenario.context, profile);

  const choicesRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`prism_story_pick:${scenarioIdx}:A`)
      .setLabel('A: ' + scenario.choices.A.label.replace(/^A:\s*/, ''))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(PRISM_EMOJIS.trangtrig62),
    new ButtonBuilder()
      .setCustomId(`prism_story_pick:${scenarioIdx}:B`)
      .setLabel('B: ' + scenario.choices.B.label.replace(/^B:\s*/, ''))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(PRISM_EMOJIS.trangtrig62),
    new ButtonBuilder()
      .setCustomId(`prism_story_pick:${scenarioIdx}:C`)
      .setLabel('C: ' + scenario.choices.C.label.replace(/^C:\s*/, ''))
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(PRISM_EMOJIS.trangtrig62),
  );

  const container = new ContainerBuilder().setComponents(
    new TextDisplayBuilder(
      `# ${PRISM_EMOJIS.trangtrig50} **NGÃ RẼ ĐỊNH MỆNH: ${scenario.title}** ${PRISM_EMOJIS.trangtrig51}`,
    ),
    new TextDisplayBuilder(formatPlayerHeader(playerRecord)),
    new SeparatorBuilder(true, 1),
    new TextDisplayBuilder(`**Bối cảnh:**\n${contextFormatted}`),
    new SeparatorBuilder(true, 1),
    choicesRow,
  );

  return {
    flags: IS_COMPONENTS_V2 | MessageFlags.Ephemeral,
    components: [container.toJSON()],
    allowedMentions: { parse: [] },
  };
}

/**
 * Kết quả Tình Huống Khó Đỡ (Ephemeral update)
 */
export function buildPrismStoryResultPayload(summaryText, pointChanges, playerRecord, rewardInfo) {
  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('prism_story_next')
      .setLabel('Tiếp Tục Hành Trình')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(PRISM_EMOJIS.trangtrig20),
  );

  const containerComponents = [
    new TextDisplayBuilder(
      `# ${PRISM_EMOJIS.trangtrig50} **BƯỚC NGOẶT MỚI** ${PRISM_EMOJIS.trangtrig51}`,
    ),
    new TextDisplayBuilder(formatPlayerHeader(playerRecord)),
    new SeparatorBuilder(true, 1),
    new TextDisplayBuilder(`**Diễn biến tiếp theo:**\n${summaryText}`),
    new SeparatorBuilder(true, 1),
    new TextDisplayBuilder(`**Điểm vừa thay đổi:** ${formatPointChanges(pointChanges)}`),
  ];

  const addendum = formatGameEndAddendum(rewardInfo);
  if (addendum) {
    containerComponents.push(new SeparatorBuilder(true, 1));
    containerComponents.push(new TextDisplayBuilder(addendum));
  }

  containerComponents.push(new SeparatorBuilder(true, 1));
  containerComponents.push(actionRow);

  const container = new ContainerBuilder().setComponents(...containerComponents);

  return {
    flags: IS_COMPONENTS_V2 | MessageFlags.Ephemeral,
    components: [container.toJSON()],
    allowedMentions: { parse: [] },
  };
}

/**
 * 6. Mini-game 2: Sàn Diễn Outfit (Ephemeral)
 */
export function buildPrismOutfitPayload(themeIdx, topIdx, bottomIdx, accIdx, playerRecord) {
  const theme = OUTFIT_THEMES[themeIdx] || OUTFIT_THEMES[0];
  const top = OUTFIT_TOPS[topIdx] || OUTFIT_TOPS[0];
  const bottom = OUTFIT_BOTTOMS[bottomIdx] || OUTFIT_BOTTOMS[0];
  const acc = OUTFIT_ACCESSORIES[accIdx] || OUTFIT_ACCESSORIES[0];
  const profile = IDENTITY_PROFILES[playerRecord?.identity_key] || IDENTITY_PROFILES.pansexual;

  const descLines = [
    `**Chủ đề sự kiện:** ${theme.name}`,
    `*${formatWithIdentity(theme.desc, profile)}*`,
    '',
    '**Trang phục đang chọn:**',
    `${PRISM_EMOJIS.hamster1} **Áo:** ${top.name}`,
    `${PRISM_EMOJIS.hamster1} **Quần / Váy:** ${bottom.name}`,
    `${PRISM_EMOJIS.trangtrig60} **Phụ kiện:** ${acc.name}`,
  ];

  const topSelect = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`prism_outfit_top:${themeIdx}:${bottomIdx}:${accIdx}`)
      .setPlaceholder('Chọn Áo...')
      .addOptions(
        OUTFIT_TOPS.map((t) => ({
          label: t.name.slice(0, 100),
          value: String(t.id),
          default: t.id === top.id,
        })),
      ),
  );

  const botSelect = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`prism_outfit_bot:${themeIdx}:${topIdx}:${accIdx}`)
      .setPlaceholder('Chọn Quần / Váy...')
      .addOptions(
        OUTFIT_BOTTOMS.map((b) => ({
          label: b.name.slice(0, 100),
          value: String(b.id),
          default: b.id === bottom.id,
        })),
      ),
  );

  const accSelect = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(`prism_outfit_acc:${themeIdx}:${topIdx}:${bottomIdx}`)
      .setPlaceholder('Chọn Phụ Kiện...')
      .addOptions(
        OUTFIT_ACCESSORIES.map((a) => ({
          label: a.name.slice(0, 100),
          value: String(a.id),
          default: a.id === acc.id,
        })),
      ),
  );

  const submitRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`prism_outfit_submit:${themeIdx}:${top.id}:${bottom.id}:${acc.id}`)
      .setLabel('Chốt bộ này & Chấm điểm!')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(PRISM_EMOJIS.trangtrig5),
  );

  const container = new ContainerBuilder().setComponents(
    new TextDisplayBuilder(
      `# ${PRISM_EMOJIS.trangtrig50} **PHỐI ĐỒ ĐI HỘI** ${PRISM_EMOJIS.trangtrig51}`,
    ),
    new TextDisplayBuilder(formatPlayerHeader(playerRecord)),
    new SeparatorBuilder(true, 1),
    new TextDisplayBuilder(descLines),
    new SeparatorBuilder(true, 1),
    topSelect,
    botSelect,
    accSelect,
    submitRow,
  );

  return {
    flags: IS_COMPONENTS_V2 | MessageFlags.Ephemeral,
    components: [container.toJSON()],
    allowedMentions: { parse: [] },
  };
}

/**
 * Kết quả Sàn Diễn Outfit (Ephemeral update)
 */
export function buildPrismOutfitResultPayload(praiseText, totalGain, playerRecord, rewardInfo) {
  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('prism_mg_outfit')
      .setLabel('Phối Bộ Khác')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(PRISM_EMOJIS.trangtrig20),
  );

  const containerComponents = [
    new TextDisplayBuilder(
      `# ${PRISM_EMOJIS.trangtrig50} **KẾT QUẢ SÀN DIỄN OUTFIT** ${PRISM_EMOJIS.trangtrig51}`,
    ),
    new TextDisplayBuilder(formatPlayerHeader(playerRecord)),
    new SeparatorBuilder(true, 1),
    new TextDisplayBuilder(`**Đánh giá từ hội bạn thân:**\n${praiseText}`),
    new SeparatorBuilder(true, 1),
    new TextDisplayBuilder(`**Tổng điểm cộng thêm:** ${formatPointChanges(totalGain)}`),
  ];

  const addendum = formatGameEndAddendum(rewardInfo);
  if (addendum) {
    containerComponents.push(new SeparatorBuilder(true, 1));
    containerComponents.push(new TextDisplayBuilder(addendum));
  }

  containerComponents.push(new SeparatorBuilder(true, 1));
  containerComponents.push(actionRow);

  const container = new ContainerBuilder().setComponents(...containerComponents);

  return {
    flags: IS_COMPONENTS_V2 | MessageFlags.Ephemeral,
    components: [container.toJSON()],
    allowedMentions: { parse: [] },
  };
}

/**
 * 7. Mini-game 3: Chat Chit Cùng Crush (Ephemeral)
 */
export function buildPrismChatPayload(messageIdx, rawMessage, playerRecord) {
  const profile = IDENTITY_PROFILES[playerRecord?.identity_key] || IDENTITY_PROFILES.pansexual;
  const formattedMsg = formatWithIdentity(rawMessage, profile);

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`prism_crush_open:${messageIdx}`)
      .setLabel('Nhập Tin Nhắn')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(PRISM_EMOJIS.trangtrig30),
  );

  const container = new ContainerBuilder().setComponents(
    new TextDisplayBuilder(
      `# ${PRISM_EMOJIS.trangtrig50} **CHAT CHIT CÙNG CRUSH** ${PRISM_EMOJIS.trangtrig51}`,
    ),
    new TextDisplayBuilder(formatPlayerHeader(playerRecord)),
    new SeparatorBuilder(true, 1),
    new TextDisplayBuilder(
      `**Tin nhắn mới từ ${profile.crushTitle}:**\n${PRISM_EMOJIS.trangtrig30} "${formattedMsg}"`,
    ),
    new SeparatorBuilder(true, 1),
    actionRow,
  );

  return {
    flags: IS_COMPONENTS_V2 | MessageFlags.Ephemeral,
    components: [container.toJSON()],
    allowedMentions: { parse: [] },
  };
}

/**
 * Modal thuần chữ (KHÔNG chứa emoji) cho Chat Chit Cùng Crush
 */
export function buildPrismCrushModal(messageIdx) {
  const modal = new ModalBuilder()
    .setCustomId(`prism_crush_modal:${messageIdx}`)
    .setTitle('Nhắn Tin Cho Người Ấy');

  const textInput = new TextInputBuilder()
    .setCustomId('prism_crush_input')
    .setLabel('Bạn muốn nhắn gì lại cho đối phương?')
    .setStyle(TextInputStyle.Paragraph)
    .setMinLength(2)
    .setMaxLength(200)
    .setRequired(true)
    .setPlaceholder('Gõ câu trả lời ngọt ngào, lầy lội hoặc kiêu kỳ của bạn tại đây...');

  modal.addComponents(new ActionRowBuilder().addComponents(textInput));
  return modal;
}

/**
 * Kết quả Chat Chit Cùng Crush (Ephemeral update)
 */
export function buildPrismChatResultPayload(userMsg, replyText, pointChanges, playerRecord, rewardInfo) {
  const profile = IDENTITY_PROFILES[playerRecord?.identity_key] || IDENTITY_PROFILES.pansexual;
  const formattedReply = formatWithIdentity(replyText, profile);

  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('prism_mg_chat')
      .setLabel('Nhắn Tiếp Câu Khác')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(PRISM_EMOJIS.trangtrig20),
  );

  const containerComponents = [
    new TextDisplayBuilder(
      `# ${PRISM_EMOJIS.trangtrig50} **TÍN HIỆU TỪ CRUSH** ${PRISM_EMOJIS.trangtrig51}`,
    ),
    new TextDisplayBuilder(formatPlayerHeader(playerRecord)),
    new SeparatorBuilder(true, 1),
    new TextDisplayBuilder(
      `**Bạn đã nhắn:**\n"${userMsg}"\n\n**${profile.crushTitle} phản hồi:**\n${PRISM_EMOJIS.trangtrig30} "${formattedReply}"`,
    ),
    new SeparatorBuilder(true, 1),
    new TextDisplayBuilder(`**Điểm nhận được:** ${formatPointChanges(pointChanges)}`),
  ];

  const addendum = formatGameEndAddendum(rewardInfo);
  if (addendum) {
    containerComponents.push(new SeparatorBuilder(true, 1));
    containerComponents.push(new TextDisplayBuilder(addendum));
  }

  containerComponents.push(new SeparatorBuilder(true, 1));
  containerComponents.push(actionRow);

  const container = new ContainerBuilder().setComponents(...containerComponents);

  return {
    flags: IS_COMPONENTS_V2 | MessageFlags.Ephemeral,
    components: [container.toJSON()],
    allowedMentions: { parse: [] },
  };
}

/**
 * 8. Mini-game 4: Vòng Quay Định Mệnh (Ephemeral)
 */
export function buildPrismSpinPayload(playerRecord) {
  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('prism_spin_roll')
      .setLabel('Quay Ngay!')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(PRISM_EMOJIS.trangtrig20),
  );

  const container = new ContainerBuilder().setComponents(
    new TextDisplayBuilder(
      `# ${PRISM_EMOJIS.trangtrig50} **VÒNG QUAY ĐỊNH MỆNH** ${PRISM_EMOJIS.trangtrig51}`,
    ),
    new TextDisplayBuilder(formatPlayerHeader(playerRecord)),
    new SeparatorBuilder(true, 1),
    new TextDisplayBuilder(
      'Mỗi ngã rẽ trên Phố Cầu Vồng đều ẩn chứa những cuộc hội ngộ bất ngờ và đầy ắp niềm vui! Hãy bấm nút bên dưới để thử vận may của bạn nhé!',
    ),
    new SeparatorBuilder(true, 1),
    actionRow,
  );

  return {
    flags: IS_COMPONENTS_V2 | MessageFlags.Ephemeral,
    components: [container.toJSON()],
    allowedMentions: { parse: [] },
  };
}

/**
 * Kết quả Vòng Quay Định Mệnh (Ephemeral update)
 */
export function buildPrismSpinResultPayload(eventDesc, pointChanges, playerRecord, rewardInfo) {
  const actionRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('prism_spin_roll')
      .setLabel('Quay Lần Nữa')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(PRISM_EMOJIS.trangtrig20),
  );

  const containerComponents = [
    new TextDisplayBuilder(
      `# ${PRISM_EMOJIS.trangtrig50} **KẾT QUẢ VÒNG QUAY** ${PRISM_EMOJIS.trangtrig51}`,
    ),
    new TextDisplayBuilder(formatPlayerHeader(playerRecord)),
    new SeparatorBuilder(true, 1),
    new TextDisplayBuilder(`**Sự kiện phố Cầu Vồng:**\n${eventDesc}`),
    new SeparatorBuilder(true, 1),
    new TextDisplayBuilder(`**Điểm vừa cập nhật:** ${formatPointChanges(pointChanges)}`),
  ];

  const addendum = formatGameEndAddendum(rewardInfo);
  if (addendum) {
    containerComponents.push(new SeparatorBuilder(true, 1));
    containerComponents.push(new TextDisplayBuilder(addendum));
  }

  containerComponents.push(new SeparatorBuilder(true, 1));
  containerComponents.push(actionRow);

  const container = new ContainerBuilder().setComponents(...containerComponents);

  return {
    flags: IS_COMPONENTS_V2 | MessageFlags.Ephemeral,
    components: [container.toJSON()],
    allowedMentions: { parse: [] },
  };
}

/**
 * 9. TÚI ĐỒ CÁ NHÂN & TẶNG QUÀ CHO CRUSH (Ephemeral)
 */
export function buildPrismBagPayload(playerRecord, noticeText = '') {
  const inv = playerRecord?.inventory || {};
  const buffs = playerRecord?.active_buffs || { amulet: 0, dice: 0 };

  const countLollipop = inv.lollipop || 0;
  const countFan = inv.fan || 0;
  const countCrown = inv.crown || 0;
  const countAmulet = inv.amulet || 0;
  const countDice = inv.dice || 0;

  const countBoba = inv.boba || 0;
  const countFlowers = inv.flowers || 0;
  const countMovie = inv.movie_tickets || 0;

  const group1Lines = [
    '**1. Vật Phẩm Kỷ Niệm & Hỗ Trợ:**',
    `${PRISM_EMOJIS.lcbluelollipop} \`[Thường]\` **Kẹo Mút Lục Sắc** \`(x${countLollipop})\` — Dùng để cộng random \`+8 ~ +15\` Chân thành.`,
    `${PRISM_EMOJIS.remdance} \`[Hiếm]\` **Quạt Xếp Ánh Kim** \`(x${countFan})\` — Dùng để cộng random \`+15 ~ +25\` Thần thái.`,
    `${PRISM_EMOJIS.trangtrig62} \`[Cực Hiếm]\` **Vương Miện Tự Hào** \`(x${countCrown})\` — Dùng để cộng random \`+20 ~ +35\` cho cả 3 chỉ số.`,
    `${PRISM_EMOJIS.bua_ho_menh_discord} \`[Hỗ Trợ]\` **Bùa Hộ Mệnh** \`(x${countAmulet})\` — Bấm dùng để kích hoạt bảo vệ (\`amulet + 1\`), chặn 1 lần bị trừ điểm.`,
    `${PRISM_EMOJIS.xuc_xac_may_man_discord} \`[Hỗ Trợ]\` **Xúc Xắc May Mắn** \`(x${countDice})\` — Bấm dùng để kích hoạt buff (\`dice + 1\`), nhân đôi (\`x2\`) hoặc nhân ba (\`x3\`) điểm ở lượt mini-game tiếp theo.`,
  ];

  const group2Lines = [
    '**2. Quà Tặng Dành Cho Người Ấy:**',
    `${PRISM_EMOJIS.boba} **Trà Sữa Trân Châu Đường Đen** \`(x${countBoba})\``,
    `${PRISM_EMOJIS.flowerswhite} **Bó Hoa Tươi Thắm** \`(x${countFlowers})\``,
    `${PRISM_EMOJIS.trangtrig62} **Cặp Vé Xem Phim Đôi** \`(x${countMovie})\``,
  ];

  // Menu 1: Chọn vật phẩm để sử dụng
  const useOptions = [
    { label: `Kẹo Mút Lục Sắc (x${countLollipop})`, value: 'lollipop', description: '+8 ~ +15 Chân thành', default: false },
    { label: `Quạt Xếp Ánh Kim (x${countFan})`, value: 'fan', description: '+15 ~ +25 Thần thái', default: false },
    { label: `Vương Miện Tự Hào (x${countCrown})`, value: 'crown', description: '+20 ~ +35 cả 3 chỉ số', default: false },
    { label: `Bùa Hộ Mệnh (x${countAmulet})`, value: 'amulet', description: 'Kích hoạt 1 lần chặn trừ điểm', default: false },
    { label: `Xúc Xắc May Mắn (x${countDice})`, value: 'dice', description: 'Kích hoạt x2 hoặc x3 điểm lượt kế', default: false },
  ];

  const useSelectRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('prism_bag_use_item')
      .setPlaceholder('Chọn Vật Phẩm Để Sử Dụng...')
      .addOptions(useOptions),
  );

  // Menu 2: Chọn quà tặng Crush
  const giftOptions = [
    { label: `Trà Sữa Trân Châu Đường Đen (x${countBoba})`, value: 'boba', description: 'Tặng người ấy để nhận điểm Chân thành & Thần thái', default: false },
    { label: `Bó Hoa Tươi Thắm (x${countFlowers})`, value: 'flowers', description: 'Tặng hoa tươi thắm thể hiện tình cảm ngọt ngào', default: false },
    { label: `Cặp Vé Xem Phim Đôi (x${countMovie})`, value: 'movie_tickets', description: 'Rủ người ấy đi xem phim hẹn hò lãng mạn', default: false },
  ];

  const giftSelectRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('prism_bag_gift_crush')
      .setPlaceholder('Chọn Quà Để Tặng Người Ấy...')
      .addOptions(giftOptions),
  );

  const containerComponents = [
    new TextDisplayBuilder(
      `# ${PRISM_EMOJIS.trangtrig50} **TÚI ĐỒ CÁ NHÂN** ${PRISM_EMOJIS.trangtrig51}`,
    ),
    new TextDisplayBuilder(
      `${formatPlayerHeader(playerRecord)}\nTrạng thái Buff: ${PRISM_EMOJIS.bua_ho_menh_discord} Bùa Hộ Mệnh: **${buffs.amulet || 0}** | ${PRISM_EMOJIS.xuc_xac_may_man_discord} Xúc Xắc May Mắn: **${buffs.dice || 0}**`,
    ),
  ];

  if (noticeText) {
    containerComponents.push(new SeparatorBuilder(true, 1));
    containerComponents.push(new TextDisplayBuilder(noticeText));
  }

  containerComponents.push(
    new SeparatorBuilder(true, 1),
    new TextDisplayBuilder(group1Lines),
    new SeparatorBuilder(true, 1),
    new TextDisplayBuilder(group2Lines),
    new SeparatorBuilder(true, 1),
    useSelectRow,
    giftSelectRow,
  );

  const container = new ContainerBuilder().setComponents(...containerComponents);

  return {
    flags: IS_COMPONENTS_V2 | MessageFlags.Ephemeral,
    components: [container.toJSON()],
    allowedMentions: { parse: [] },
  };
}

/**
 * 10. TIỆM TẠP HÓA SẮC MÀU (CỬA HÀNG) (Ephemeral)
 */
export function buildPrismShopPayload(playerRecord, noticeText = '') {
  const coins = playerRecord?.rainbow_coins || 0;

  const group1Lines = [
    '**1. Vật Phẩm Kỷ Niệm & Bùa Hỗ Trợ:**',
    `${PRISM_EMOJIS.lcbluelollipop} **Kẹo Mút Lục Sắc** (\`40\` ${PRISM_EMOJIS.xucauvong})`,
    `${PRISM_EMOJIS.remdance} **Quạt Xếp Ánh Kim** (\`85\` ${PRISM_EMOJIS.xucauvong})`,
    `${PRISM_EMOJIS.bua_ho_menh_discord} **Bùa Hộ Mệnh** (\`90\` ${PRISM_EMOJIS.xucauvong})`,
    `${PRISM_EMOJIS.xuc_xac_may_man_discord} **Xúc Xắc May Mắn** (\`120\` ${PRISM_EMOJIS.xucauvong})`,
    `${PRISM_EMOJIS.trangtrig62} **Hộp Mù Bí Ẩn** (\`100\` ${PRISM_EMOJIS.xucauvong}) — Mở ngay: 2% Vương Miện, 18% Quạt Xếp, 50% Kẹo Mút, 30% hoàn 30~60 Xu!`,
  ];

  const group2Lines = [
    '**2. Quà Tặng Crush (Chỉ mua được ở Shop):**',
    `${PRISM_EMOJIS.boba} **Trà Sữa Trân Châu Đường Đen** (\`50\` ${PRISM_EMOJIS.xucauvong})`,
    `${PRISM_EMOJIS.flowerswhite} **Bó Hoa Tươi Thắm** (\`80\` ${PRISM_EMOJIS.xucauvong})`,
    `${PRISM_EMOJIS.trangtrig62} **Cặp Vé Xem Phim Đôi** (\`150\` ${PRISM_EMOJIS.xucauvong})`,
  ];

  const buyItemSelect = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('prism_shop_buy_item')
      .setPlaceholder('Chọn mua Vật Phẩm Kỷ Niệm & Bùa...')
      .addOptions([
        { label: 'Kẹo Mút Lục Sắc (40 Xu)', value: 'lollipop', description: 'Vật phẩm kỷ niệm bậc Thường (+8~15 Chân thành)' },
        { label: 'Quạt Xếp Ánh Kim (85 Xu)', value: 'fan', description: 'Vật phẩm kỷ niệm bậc Hiếm (+15~25 Thần thái)' },
        { label: 'Bùa Hộ Mệnh (90 Xu)', value: 'amulet', description: 'Kích hoạt 1 lần chặn trừ điểm mini-game' },
        { label: 'Xúc Xắc May Mắn (120 Xu)', value: 'dice', description: 'Kích hoạt buff x2 hoặc x3 điểm ở lượt kế' },
        { label: 'Hộp Mù Bí Ẩn (100 Xu)', value: 'mystery_box', description: 'Mở ngay nhận thưởng ngẫu nhiên siêu hấp dẫn!' },
      ]),
  );

  const buyGiftSelect = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('prism_shop_buy_gift')
      .setPlaceholder('Chọn mua Quà Tặng Crush...')
      .addOptions([
        { label: 'Trà Sữa Trân Châu Đường Đen (50 Xu)', value: 'boba', description: 'Tặng Crush nhận phản ứng ngọt ngào & điểm thưởng' },
        { label: 'Bó Hoa Tươi Thắm (80 Xu)', value: 'flowers', description: 'Món quà tinh tế khiến người ấy xao xuyến' },
        { label: 'Cặp Vé Xem Phim Đôi (150 Xu)', value: 'movie_tickets', description: 'Hẹn hò lãng mạn tại rạp chiếu phim' },
      ]),
  );

  const containerComponents = [
    new TextDisplayBuilder(
      `# ${PRISM_EMOJIS.trangtrig50} **TIỆM TẠP HÓA SẮC MÀU** ${PRISM_EMOJIS.trangtrig51}`,
    ),
    new TextDisplayBuilder(
      `${formatPlayerHeader(playerRecord)}\n${PRISM_EMOJIS.xucauvong} **Số dư hiện có:** **${coins} Xu Cầu Vồng**`,
    ),
  ];

  if (noticeText) {
    containerComponents.push(new SeparatorBuilder(true, 1));
    containerComponents.push(new TextDisplayBuilder(noticeText));
  }

  containerComponents.push(
    new SeparatorBuilder(true, 1),
    new TextDisplayBuilder(group1Lines),
    new SeparatorBuilder(true, 1),
    new TextDisplayBuilder(group2Lines),
    new SeparatorBuilder(true, 1),
    buyItemSelect,
    buyGiftSelect,
  );

  const container = new ContainerBuilder().setComponents(...containerComponents);

  return {
    flags: IS_COMPONENTS_V2 | MessageFlags.Ephemeral,
    components: [container.toJSON()],
    allowedMentions: { parse: [] },
  };
}

/**
 * 11. NHIỆM VỤ NGÀY (DAILY QUESTS) (Ephemeral)
 */
export function buildPrismQuestsPayload(playerRecord, questsData, noticeText = '') {
  const coins = playerRecord?.rainbow_coins || 0;
  const quests = questsData?.quests || [];

  let hasUnclaimed = false;

  const questLines = [
    `**Nhiệm vụ ngày hôm nay (${questsData?.date || 'Hôm nay'}):**`,
    '',
  ];

  for (const q of quests) {
    const isCompleted = q.progress >= q.target;
    if (isCompleted && !q.claimed) {
      hasUnclaimed = true;
    }

    const statusBadge = q.claimed
      ? 'Đã nhận thưởng'
      : isCompleted
      ? '**Đã hoàn thành!**'
      : `Đang làm (${q.progress}/${q.target})`;

    questLines.push(
      `${PRISM_EMOJIS.trangtrig62} **${q.title}**\nTiến độ: **${q.progress}/${q.target}** | Thưởng: +**${q.reward}** ${PRISM_EMOJIS.xucauvong} | Trạng thái: ${statusBadge}`,
      '',
    );
  }

  const claimAllRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('prism_quests_claim_all')
      .setLabel('Nhận Tất Cả Thưởng Đã Xong')
      .setStyle(ButtonStyle.Secondary)
      .setEmoji(PRISM_EMOJIS.trangtrig62)
      .setDisabled(!hasUnclaimed),
  );

  const containerComponents = [
    new TextDisplayBuilder(
      `# ${PRISM_EMOJIS.trangtrig50} **NHIỆM VỤ NGÀY SẮC MÀU** ${PRISM_EMOJIS.trangtrig51}`,
    ),
    new TextDisplayBuilder(
      `${formatPlayerHeader(playerRecord)}\n${PRISM_EMOJIS.xucauvong} **Số dư hiện có:** **${coins} Xu Cầu Vồng**`,
    ),
  ];

  if (noticeText) {
    containerComponents.push(new SeparatorBuilder(true, 1));
    containerComponents.push(new TextDisplayBuilder(noticeText));
  }

  containerComponents.push(
    new SeparatorBuilder(true, 1),
    new TextDisplayBuilder(questLines),
    new SeparatorBuilder(true, 1),
    claimAllRow,
  );

  const container = new ContainerBuilder().setComponents(...containerComponents);

  return {
    flags: IS_COMPONENTS_V2 | MessageFlags.Ephemeral,
    components: [container.toJSON()],
    allowedMentions: { parse: [] },
  };
}

/**
 * 12. Xem Điểm & BXH Top 10 (Ephemeral)
 */
export function buildPrismLeaderboardPayload(userRecord, topPlayers, userRank) {
  const profile = IDENTITY_PROFILES[userRecord?.identity_key] || IDENTITY_PROFILES.pansexual;
  const userTotal =
    (userRecord?.slay_points || 0) +
    (userRecord?.heart_points || 0) +
    (userRecord?.rebel_points || 0);

  const userLines = [
    `**Bản dạng của bạn:** ${profile.emoji} **${profile.name}**`,
    `${PRISM_EMOJIS.trangtrig41} Thần thái: **${userRecord?.slay_points || 0}** | ${PRISM_EMOJIS.heartg3} Chân thành: **${userRecord?.heart_points || 0}** | ${PRISM_EMOJIS.trangtrig29} Nổi loạn: **${userRecord?.rebel_points || 0}**`,
    `=> **Tổng điểm:** **${userTotal}** (Hạng: **#${userRank || 'N/A'}**) | ${PRISM_EMOJIS.xucauvong} **${userRecord?.rainbow_coins || 0} Xu**`,
  ];

  const topLines =
    topPlayers.length === 0
      ? ['Chưa có người chơi nào trên bảng xếp hạng. Hãy là người đầu tiên bứt phá nhé!']
      : topPlayers.map((p, index) => {
          const idProfile = IDENTITY_PROFILES[p.identity_key] || IDENTITY_PROFILES.pansexual;
          const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `**#${index + 1}**`;
          return `${medal} <@${p.user_id}> • ${idProfile.emoji} **${p.total_points}** điểm *(${idProfile.name})*`;
        });

  const container = new ContainerBuilder().setComponents(
    new TextDisplayBuilder(
      `# ${PRISM_EMOJIS.trangtrig50} **BẢNG VINH DANH SẮC MÀU** ${PRISM_EMOJIS.trangtrig51}`,
    ),
    new TextDisplayBuilder(userLines),
    new SeparatorBuilder(true, 1),
    new TextDisplayBuilder(['**TOP 10 NGƯỜI CHƠI XUẤT SẮC NHẤT:**', ...topLines]),
    new SeparatorBuilder(true, 1),
    new TextDisplayBuilder('-# Điểm tích lũy được tự động cập nhật qua các mini-game của Sắc Màu Định Mệnh.'),
  );

  return {
    flags: IS_COMPONENTS_V2 | MessageFlags.Ephemeral,
    components: [container.toJSON()],
    allowedMentions: { parse: [] },
  };
}
