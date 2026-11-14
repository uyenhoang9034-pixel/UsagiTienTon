import { getDatabaseValue, setDatabaseValue } from "../utils/database.js";
import { SERVICE_TICKET_IDS, SERVICE_TICKET_EMOJIS } from "../config/serviceTicketConfig.js";
import { getServiceTicketRecord, isServiceTicketChannel } from "./serviceTicketService.js";
import { logger } from "../utils/logger.js";

const COMPONENTS_V2 = 1 << 15;
const STAFF_ROLE_ID = SERVICE_TICKET_IDS.SP_TICKET_ROLE_ID;
const PAGE_SIZE = 5;
// Tài khoản dùng để kiểm thử: mọi giao dịch nhắm đến ID này chỉ chạy mô phỏng, không ghi DB hoặc đổi role.
const NO_SAVE_TEST_USER_IDS = new Set(["872792190651334707"]);

// Điền ID role Discord vào các chuỗi rỗng sau khi tạo role.
// Để trống sẽ bỏ qua đồng bộ role, không tự tìm theo tên và không tự tạo role.
const RANK_ROLE_IDS = {
  GUEST: "1570996973379518524",
  SILVER: "1570997425257058457",
  GOLD: "1570997522032369704",
  PLATINUM: "1570997606946050168",
  DIAMOND: "1570997774839980162",
};

const RANKS = [
  { name: "Usagi Guest", threshold: 0, roleId: RANK_ROLE_IDS.GUEST },
  { name: "Usagi Silver", threshold: 300000, roleId: RANK_ROLE_IDS.SILVER },
  { name: "Usagi Gold", threshold: 600000, roleId: RANK_ROLE_IDS.GOLD },
  { name: "Usagi Platinum", threshold: 1000000, roleId: RANK_ROLE_IDS.PLATINUM },
  { name: "Usagi Diamond", threshold: 2500000, roleId: RANK_ROLE_IDS.DIAMOND },
];

const RANK_PRICE_EMOJIS = Object.freeze({
  titleLeft: "<a:trangtrig50:1567818385306165301>",
  titleRight: "<a:trangtrig51:1567818549794439229>",
  section: "<a:trangtrig46:1547240249761996812>",
  notice: "<a:bang2:1546891483250954290>",
});

const RANK_PRICE_LISTS = Object.freeze({
  PLATINUM: {
    name: "Usagi Platinum",
    title: "USAGI PLATINUM SPECIAL PRICE LIST",
    retail: [
      ["66.000đ", "34.000đ"], ["79.000đ", "41.000đ"],
      ["92.000đ", "51.000đ"], ["105.000đ", "58.000đ"],
      ["111.000đ", "62.000đ"], ["118.000đ", "68.000đ"],
      ["131.000đ", "83.000đ"], ["141.000đ", "88.000đ"],
    ],
    combo: [
      ["118.000đ", "68.000đ"], ["136.000đ", "82.000đ"],
      ["146.000đ", "92.000đ"], ["155.000đ", "98.000đ"],
      ["189.000đ", "112.000đ"], ["220.000đ", "142.000đ"],
      ["300.000đ", "205.000đ"],
    ],
  },
  DIAMOND: {
    name: "Usagi Diamond",
    title: "USAGI DIAMOND SPECIAL PRICE LIST",
    retail: [
      ["66.000đ", "33.000đ"], ["79.000đ", "40.000đ"],
      ["92.000đ", "50.000đ"], ["105.000đ", "55.000đ"],
      ["111.000đ", "60.000đ"], ["118.000đ", "65.000đ"],
      ["131.000đ", "80.000đ"], ["141.000đ", "83.000đ"],
    ],
    combo: [
      ["118.000đ", "65.000đ"], ["136.000đ", "80.000đ"],
      ["146.000đ", "90.000đ"], ["155.000đ", "95.000đ"],
      ["189.000đ", "110.000đ"], ["220.000đ", "140.000đ"],
      ["300.000đ", "200.000đ"],
    ],
  },
});

function rankPriceRows(rows) {
  return rows.map(([original, discounted]) => "~~" + original + "~~  →  **" + discounted + "**").join("\n");
}

function buildRankPriceContainer(rankKey) {
  const item = RANK_PRICE_LISTS[rankKey];
  return {
    type: 17,
    components: [
      { type: 10, content: "# " + RANK_PRICE_EMOJIS.titleLeft + " **" + item.title + "** " + RANK_PRICE_EMOJIS.titleRight },
      { type: 14, divider: true, spacing: 1 },
      { type: 10, content: "Bảng giá ưu đãi dành riêng cho thành viên " + item.name.replace("Usagi ", "") },
      { type: 14, divider: true, spacing: 1 },
      { type: 10, content: RANK_PRICE_EMOJIS.section + " **BẢNG GIÁ LẺ**\n" + rankPriceRows(item.retail) },
      { type: 14, divider: true, spacing: 1 },
      { type: 10, content: RANK_PRICE_EMOJIS.section + " **BẢNG GIÁ COMBO**\n" + rankPriceRows(item.combo) },
      { type: 14, divider: true, spacing: 1 },
      { type: 10, content: "-# Bảng giá ưu đãi chỉ dành riêng cho thành viên có role " + item.name + ". Vui lòng không chia sẻ bảng giá này." },
    ],
  };
}

function buildRankPricePayload(rankKeys) {
  return {
    flags: COMPONENTS_V2,
    components: rankKeys.map(buildRankPriceContainer),
    allowedMentions: { parse: [], repliedUser: false },
  };
}

function buildRankPriceDeniedPayload(guildId) {
  return {
    flags: COMPONENTS_V2,
    components: [{
      type: 17,
      components: [
        {
          type: 10,
          content: RANK_PRICE_EMOJIS.notice + " Xin lỗi bạn, bạn không thể dùng lệnh này vì bạn chưa đạt mức rank tối thiểu. Hãy đặt đơn ngay để đạt mốc được ưu đãi giảm giá nhé!",
        },
        {
          type: 1,
          components: [{
            type: 2,
            style: 5,
            label: "Mở Ticket",
            url: "https://discord.com/channels/" + guildId + "/" + SERVICE_TICKET_IDS.PANEL_CHANNEL_ID,
          }],
        },
      ],
    }],
    allowedMentions: { parse: [] },
  };
}

function isRankPriceAdmin(member, guild, userId) {
  if (!member) return false;
  if (member.permissions?.has?.("Administrator")) return true;
  if (String(guild?.ownerId || "") === String(userId || member.id || "")) return true;
  return member.roles?.cache?.has?.("1541303749916754001") === true ||
    member.roles?.cache?.has?.("1545305594712432640") === true;
}

async function handleRankPriceCommand(message) {
  const member = message.member ||
    await message.guild.members.fetch(message.author.id).catch(() => null);
  const isAdmin = isRankPriceAdmin(member, message.guild, message.author.id);

  // Admin được xem cả hai bảng; member chỉ xem bảng đúng với rank hiện tại.
  if (isAdmin) {
    await message.channel.send(buildRankPricePayload(["DIAMOND", "PLATINUM"]));
    return true;
  }
  if (member?.roles?.cache?.has?.(RANK_ROLE_IDS.DIAMOND)) {
    await message.channel.send(buildRankPricePayload(["DIAMOND"]));
    return true;
  }
  if (member?.roles?.cache?.has?.(RANK_ROLE_IDS.PLATINUM)) {
    await message.channel.send(buildRankPricePayload(["PLATINUM"]));
    return true;
  }
  await message.channel.send(buildRankPriceDeniedPayload(message.guild.id));
  return true;
}

const queues = new Map();

export function normalizeServiceDisplayName(rawNote) {
  const original = String(rawNote || "").trim();
  if (!original) return original;
  const normalized = original.toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
  const hasWord = (word) => new RegExp("(^|[^a-z0-9])" + word + "([^a-z0-9]|$)", "i").test(normalized);

  if (hasWord("chinese") || hasWord("hsk") ||
      /day\s*kem\s*tieng\s*trung/.test(normalized) || /tieng\s*trung/.test(normalized)) {
    return "Dạy Kèm Tiếng Trung";
  }
  if (/vibe\s*code\s*bot/.test(normalized) || /code\s*bot\s*discord/.test(normalized) ||
      /code\s*discord/.test(normalized) || hasWord("codebot")) {
    return "Vibe Code Bot Discord";
  }
  if (/nitro\s*(?:&|and)?\s*decor/.test(normalized) || /decor\s*nitro/.test(normalized) ||
      hasWord("nitrodecor")) {
    return "Nitro Decor";
  }
  return original.charAt(0).toLocaleUpperCase("vi-VN") + original.slice(1);
}

function keyFor(guildId, userId) {
  return "guild:" + guildId + ":customer_service_ledger:" + userId;
}

function withLock(key, task) {
  const previous = queues.get(key) || Promise.resolve();
  const current = previous.then(task);
  const tail = current.catch(() => {});
  queues.set(key, tail);
  return current.finally(() => {
    if (queues.get(key) === tail) queues.delete(key);
  });
}

function money(value) {
  return Number(value || 0).toLocaleString("vi-VN") + " VNĐ";
}

function dateTime(value) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).format(new Date(value));
}

function shortDate(value) {
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(value));
}

function netSpent(records) {
  return records.reduce((sum, item) => sum + (item.type === "add" ? 1 : -1) * Number(item.amount || 0), 0);
}

function buildMockTestHistory(userId) {
  // Dữ liệu giả ổn định trong ngày để chuyển trang không làm thay đổi lịch sử.
  const dayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
  const seedText = String(userId) + dayKey;
  let seed = 0;
  for (const char of seedText) seed = (seed * 31 + char.charCodeAt(0)) >>> 0;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const services = ["Dạy Kèm Tiếng Trung", "Vibe Code Bot Discord", "Nitro Decor", "Dịch vụ thiết kế Discord"];
  const amounts = [150000, 200000, 250000, 300000, 350000, 450000, 500000, 600000];
  const now = Date.now();
  return Array.from({ length: 8 }, (_, index) => {
    const type = index === 3 || index === 6 ? "subtract" : "add";
    const amount = amounts[Math.floor(random() * amounts.length)];
    const note = type === "add" ? services[Math.floor(random() * services.length)] : "Điều chỉnh / hoàn tiền kiểm thử";
    return {
      id: "mock-" + index,
      type,
      amount,
      note,
      displayNote: note,
      ticketNumber: 120 + Math.floor(random() * 880),
      staffId: "872792190651334707",
      createdAt: now - (index + 1) * (1 + Math.floor(random() * 8)) * 86400000,
      testMode: true,
    };
  });
}

async function getLookupRecords(client, guildId, userId) {
  const value = await getDatabaseValue(client, keyFor(guildId, userId), null);
  const savedRecords = Array.isArray(value?.records) ? value.records : [];
  if (savedRecords.length) return { records: savedRecords, simulated: false };
  if (NO_SAVE_TEST_USER_IDS.has(userId)) {
    return { records: buildMockTestHistory(userId), simulated: true };
  }
  return { records: [], simulated: false };
}

function rankFor(total) {
  let current = RANKS[0];
  for (const rank of RANKS) if (total >= rank.threshold) current = rank;
  return current;
}

function nextRank(rank) {
  return RANKS[RANKS.findIndex((item) => item.name === rank.name) + 1] || null;
}

function emoji(guild, name, fallback) {
  return guild?.emojis?.cache?.find?.((item) => item.name === name)?.toString?.() || fallback || "";
}

function emojis(guild) {
  return {
    left: emoji(guild, "trangtrig50", SERVICE_TICKET_EMOJIS.HEADER_L),
    right: emoji(guild, "trangtrig51", SERVICE_TICKET_EMOJIS.HEADER_R),
    label: emoji(guild, "trangtrig61", SERVICE_TICKET_EMOJIS.SUB_SECTION),
    summary: emoji(guild, "trangtrig62", "<a:trangtrig62:1569560241190871152>"),
    bullet: emoji(guild, "trangtrig60", SERVICE_TICKET_EMOJIS.BULLET_SERVICE),
    history: emoji(guild, "trangtrig49", SERVICE_TICKET_EMOJIS.DOWNLOAD_HINT),
    heart: emoji(guild, "heartg1", SERVICE_TICKET_EMOJIS.HEART),
    bang: emoji(guild, "bang2", SERVICE_TICKET_EMOJIS.BANG),
  };
}

function title(guild, value) {
  const e = emojis(guild);
  return e.left + " **" + value + "** " + e.right;
}

function text(content) {
  return { type: 10, content: String(content || "") };
}

function divider() {
  return { type: 14, divider: true, spacing: 1 };
}

function payload(components) {
  return {
    flags: COMPONENTS_V2,
    components: [{ type: 17, components }],
    allowedMentions: { parse: [], repliedUser: false },
  };
}

async function sendPrivate(message, data) {
  // Các phản hồi của lệnh prefix hiển thị trực tiếp trong kênh hiện tại, không gửi DM.
  await message.channel.send(data).catch((error) => {
    logger.warn("[CustomerSpending] Could not send channel response:", error);
  });
  return true;
}

function transactionPayload({ guild, member, staff, record, total, oldRank, newRank }) {
  const e = emojis(guild);
  const adding = record.type === "add";
  const fields = [
    text(title(guild, adding ? "GHI NHẬN DỊCH VỤ THÀNH CÔNG" : "CẬP NHẬT DỮ LIỆU DỊCH VỤ")),
    ...(record.testMode ? [text("⚠️ **CHẾ ĐỘ KIỂM THỬ — giao dịch này không được lưu và không thay đổi role.**")] : []),
    text("**THÔNG TIN KHÁCH HÀNG**\n<@" + member.id + ">\nID: " + member.id),
    divider(),
    text(e.label + " **" + (adding ? "Dịch vụ:" : "Lý do trừ tiền:") + "**\n" +
      (adding ? record.displayNote : record.note)),
    text(e.label + " **Giá trị:**\n" + (adding ? "+" : "-") + money(record.amount)),
    text(e.label + " **Ticket:**\n#" + record.ticketNumber),
    divider(),
    text(e.summary + " **Tổng chi tiêu:**\n" + money(total)),
    text(e.summary + " **Cấp bậc hiện tại:**\n" + newRank.name),
    text(e.summary + " **Staff thực hiện:**\n<@" + staff.id + ">"),
    divider(),
  ];

  const oldIndex = RANKS.findIndex((item) => item.name === oldRank.name);
  const newIndex = RANKS.findIndex((item) => item.name === newRank.name);
  if (newIndex > oldIndex) {
    fields.push(text(e.heart + " **Chúc mừng bạn đã được thăng hạng!**\n" + oldRank.name + " → " + newRank.name));
    if (newRank.name === "Usagi Platinum" || newRank.name === "Usagi Diamond") {
      fields.push(text("<a:trangtrig45:1547239010190237819> Sử dụng lệnh `&bgrank` để xem bảng giá ưu đãi dành riêng cho role **" + newRank.name + "** nhé!"));
    }
  } else if (newIndex < oldIndex) {
    fields.push(text(e.bang + " **Xin chia buồn, bạn đã bị hạ cấp!**\n" + oldRank.name + " → " + newRank.name));
  }
  fields.push(text("-# " + dateTime(record.createdAt)));
  return payload(fields);
}

function noDataPayload(guild) {
  const e = emojis(guild);
  return payload([
    text(title(guild, "THÔNG TIN KHÁCH HÀNG")),
    text(e.bang + " Xin lỗi, bạn chưa có dữ liệu sử dụng dịch vụ! Hãy mở ticket ngay để mua hàng và sở hữu các role rank độc quyền nhé!"),
    {
      type: 1,
      components: [{
        type: 2,
        style: 5,
        label: "Mở Ticket",
        url: "https://discord.com/channels/" + guild.id + "/" + SERVICE_TICKET_IDS.PANEL_CHANNEL_ID,
      }],
    },
  ]);
}

function profilePayload({ guild, member, records, page, requesterId, simulated = false }) {
  const e = emojis(guild);
  const total = Math.max(0, netSpent(records));
  const rank = rankFor(total);
  const next = nextRank(rank);
  const sorted = [...records].sort((a, b) => Number(b.createdAt) - Number(a.createdAt));
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(Math.max(1, Number(page) || 1), pages);
  const visible = sorted.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const first = records.filter((item) => item.type === "add")
    .reduce((oldest, item) => !oldest || item.createdAt < oldest ? item.createdAt : oldest, null);

  let progress;
  if (next) {
    const percent = Math.max(0, Math.min(100, ((total - rank.threshold) / (next.threshold - rank.threshold)) * 100));
    const blocks = Math.round(percent / 10);
    progress = rank.name + "  " + "█".repeat(blocks) + "░".repeat(10 - blocks) +
      "\n" + money(total) + " / " + money(next.threshold) +
      "\nCòn " + money(Math.max(0, next.threshold - total)) + " để lên " + next.name;
  } else {
    progress = rank.name + "  ██████████\nĐã đạt cấp bậc cao nhất!";
  }

  const components = [
    text(title(guild, "THÔNG TIN KHÁCH HÀNG")),
    ...(simulated ? [text("⚠️ **DỮ LIỆU MÔ PHỎNG — chỉ dùng để kiểm thử giao diện, không được lưu vào hệ thống.**")] : []),
    {
      type: 12,
      items: [{ media: { url: member.displayAvatarURL({ extension: "png", size: 256 }) }, description: "Ảnh đại diện khách hàng" }],
    },
    text("<@" + member.id + ">\nID: " + member.id + "\n**" + rank.name.toUpperCase() + "**"),
    divider(),
    text(e.bullet + " **ĐÃ CHI**\n# " + money(total)),
    text(e.bullet + " **Dịch vụ đầu tiên:**\n" + (first ? dateTime(first) : "—")),
    divider(),
    text(e.bullet + " **TIẾN ĐỘ CẤP BẬC**\n" + progress),
    divider(),
    text(e.history + " **LỊCH SỬ DỊCH VỤ**"),
  ];

  for (const item of visible) {
    const serviceName = item.type === "add"
      ? normalizeServiceDisplayName(item.displayNote || item.note)
      : item.note;
    components.push(text(
      e.bullet + " **Ticket #" + (item.ticketNumber || "?") + "**\n" +
      serviceName + "\n" + (item.type === "add" ? "+" : "-") + money(item.amount) +
      "\n-# " + shortDate(item.createdAt)
    ));
  }

  if (!visible.length) components.push(text("Chưa có lịch sử dịch vụ."));
  components.push(divider());
  components.push(text("-# Trang " + currentPage + "/" + pages + " • " + dateTime(Date.now())));

  if (pages > 1) {
    components.push({
      type: 1,
      components: [
        {
          type: 2, style: 2, label: "Trước",
          custom_id: "csp_page:" + guild.id + ":" + member.id + ":" + (currentPage - 1) + ":" + requesterId,
          disabled: currentPage <= 1,
        },
        {
          type: 2, style: 2, label: "Sau",
          custom_id: "csp_page:" + guild.id + ":" + member.id + ":" + (currentPage + 1) + ":" + requesterId,
          disabled: currentPage >= pages,
        },
      ],
    });
  }
  return payload(components);
}

async function syncRankRole(guild, member, rank) {
  try {
    // Chỉ thao tác với role có ID được cấu hình; ID để trống thì bỏ qua an toàn.
    if (!rank.roleId) {
      logger.info("[CustomerSpending] Rank role ID is not configured for: " + rank.name);
      return;
    }

    const fetched = await guild.roles.fetch().catch(() => guild.roles.cache);
    const cache = fetched?.cache || fetched || guild.roles.cache;
    const configuredRoles = RANKS
      .filter((item) => item.roleId)
      .map((item) => cache.get(item.roleId))
      .filter(Boolean);
    const target = cache.get(rank.roleId);

    if (!target) {
      logger.warn("[CustomerSpending] Configured rank role ID was not found: " + rank.name);
      return;
    }

    const remove = configuredRoles.filter((role) =>
      role.id !== target.id && member.roles.cache.has(role.id)
    );
    if (remove.length) await member.roles.remove(remove);
    if (!member.roles.cache.has(target.id)) await member.roles.add(target);
  } catch (error) {
    logger.error("[CustomerSpending] Rank role update failed:", error);
  }
}

function parseAmount(raw) {
  const value = String(raw || "").replace(/[.,\s_]/g, "");
  if (!/^\d+$/.test(value)) return null;
  const amount = Number(value);
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

function ticketNumberFrom(channel, record) {
  if (record?.number) return Number(record.number);
  const topic = String(channel.topic || "").match(/#(\d+)/);
  if (topic) return Number(topic[1]);
  const name = String(channel.name || "").match(/-(\d+)$/);
  return name ? Number(name[1]) : null;
}

async function saveTransaction({ client, guild, channel, staff, member, type, amount, note }) {
  const key = keyFor(guild.id, member.id);
  return withLock(key, async () => {
    const existing = await getDatabaseValue(client, key, null);
    const records = Array.isArray(existing?.records) ? existing.records : [];
    const before = Math.max(0, netSpent(records));
    if (type === "subtract" && amount > before && !NO_SAVE_TEST_USER_IDS.has(member.id)) {
      return { ok: false, error: "Số tiền trừ vượt quá tổng chi tiêu hiện tại (" + money(before) + ")." };
    }

    const ticket = await getServiceTicketRecord(client, guild.id, channel.id);
    const number = ticketNumberFrom(channel, ticket);
    if (!number) return { ok: false, error: "Không xác định được số ticket hiện tại." };

    const oldRank = rankFor(before);
    const now = Date.now();
    const record = {
      id: String(now) + "-" + Math.random().toString(36).slice(2, 8),
      type,
      amount,
      note: String(note).trim(),
      displayNote: type === "add" ? normalizeServiceDisplayName(note) : String(note).trim(),
      ticketNumber: number,
      staffId: staff.id,
      createdAt: now,
    };
    const nextRecords = [...records, record];
    const total = Math.max(0, netSpent(nextRecords));
    const newRank = rankFor(total);

    // Chỉ mô phỏng giao dịch nếu khách hàng là tài khoản test được chỉ định.
    // Không gọi setDatabaseValue và không đồng bộ/cấp/hạ role trong nhánh này.
    if (NO_SAVE_TEST_USER_IDS.has(member.id)) {
      record.testMode = true;
      return { ok: true, record, total, oldRank, newRank };
    }

    const saved = await setDatabaseValue(client, key, {
      guildId: guild.id, userId: member.id, records: nextRecords, updatedAt: now,
    });
    if (!saved) return { ok: false, error: "Không thể lưu dữ liệu vào cơ sở dữ liệu. Vui lòng thử lại." };
    await syncRankRole(guild, member, newRank);
    return { ok: true, record, total, oldRank, newRank };
  });
}

export async function handleCustomerSpendingMessage(message, client) {
  if (!message?.guild || message.author?.bot || typeof message.content !== "string") return false;
  const content = message.content.trim();
  const transactionCommand = /^[+-]dv(?:\s|$)/i.test(content);
  const lookupCommand = /^&ttgd(?:\s|$)/i.test(content);
  const rankPriceCommand = /^&bgrank\s*$/i.test(content);
  if (!transactionCommand && !lookupCommand && !rankPriceCommand) return false;

  await message.delete().catch(() => {});

  if (rankPriceCommand) {
    await handleRankPriceCommand(message);
    return true;
  }

  if (transactionCommand) {
    if (!message.member?.roles?.cache?.has?.(STAFF_ROLE_ID)) {
      await sendPrivate(message, {
        content: emojis(message.guild).bang +
          " Bạn không có quyền sử dụng tính năng này, chỉ có <@&" + STAFF_ROLE_ID + "> mới có thể sử dụng tính năng.",
      });
      return true;
    }

    const match = content.match(/^([+-]dv)\s+<@!?(\d+)>\s+([\d.,\s_]+)\s+(.+)$/i);
    const amount = match ? parseAmount(match[3]) : null;
    const note = match?.[4]?.trim();
    if (!match || !amount || !note) {
      await sendPrivate(message, {
        content: emojis(message.guild).bang +
          " Cú pháp không hợp lệ! Vui lòng sử dụng đúng cú pháp sau:\n- Ghi nhận: +dv @User Số tiền Ghi chú\n- Refund: -dv @User Số tiền Ghi chú",
      });
      return true;
    }

    const ticket = await getServiceTicketRecord(client, message.guild.id, message.channel.id);
    if (!isServiceTicketChannel(message.channel, ticket)) return true;

    const member = await message.guild.members.fetch(match[2]).catch(() => null);
    if (!member) {
      await message.channel.send({ content: emojis(message.guild).bang + " Không tìm thấy thành viên được nhắc đến." });
      return true;
    }

    const result = await saveTransaction({
      client, guild: message.guild, channel: message.channel, staff: message.author, member,
      type: match[1].startsWith("+") ? "add" : "subtract", amount, note,
    });
    if (!result.ok) {
      await message.channel.send({ content: emojis(message.guild).bang + " " + result.error });
      return true;
    }
    await message.channel.send(transactionPayload({
      guild: message.guild, member, staff: message.author, record: result.record,
      total: result.total, oldRank: result.oldRank, newRank: result.newRank,
    }));
    return true;
  }

  // Mặc định mọi thành viên đều tra cứu hồ sơ của chính mình bằng &ttgd.
  // Chỉ role SP Ticket (STAFF_ROLE_ID) mới được truyền ID/mention để tra cứu người khác.
  const lookup = content.match(/^&ttgd(?:\\s+(?:<@!?(\\d+)>|(\\d+)))?$/i);
  if (!lookup) {
    await sendPrivate(message, { content: "Cú pháp tra cứu:\\n- Cá nhân: &ttgd\\n- Admin (SP Ticket): &ttgd ID_User hoặc &ttgd @User" });
    return true;
  }

  const requestedUserId = lookup[1] || lookup[2] || message.author.id;
  const isStaffAdmin = message.member?.roles?.cache?.has?.(STAFF_ROLE_ID) === true;
  const isLookingUpOther = requestedUserId !== message.author.id;

  if (isLookingUpOther && !isStaffAdmin) {
    await sendPrivate(message, {
      content: emojis(message.guild).bang + " Bạn chỉ có thể tra cứu thông tin dịch vụ của chính mình.",
    });
    return true;
  }

  const member = await message.guild.members.fetch(requestedUserId).catch(() => null);
  if (!member) {
    await sendPrivate(message, { content: emojis(message.guild).bang + " Không tìm thấy thành viên cần tra cứu." });
    return true;
  }
  const lookupData = await getLookupRecords(client, message.guild.id, member.id);
  const { records, simulated } = lookupData;
  if (!records.length) {
    await sendPrivate(message, noDataPayload(message.guild));
    return true;
  }
  await sendPrivate(message, profilePayload({
    guild: message.guild, member, records, page: 1, requesterId: message.author.id, simulated,
  }));
  return true;
}

export async function handleCustomerSpendingPage(interaction, client, args = []) {
  const [guildId, userId, pageRaw, requesterId] = args;
  const guild = interaction.guild || await client.guilds.fetch(guildId).catch(() => null);
  if (!guild || guild.id !== guildId || interaction.user.id !== requesterId) {
    return interaction.reply({ content: "Bạn không có quyền thao tác trên bảng tra cứu này.", ephemeral: true });
  }
  const member = await guild.members.fetch(userId).catch(() => null);
  if (!member) return interaction.reply({ content: "Không tìm thấy thành viên.", ephemeral: true });
  const lookupData = await getLookupRecords(client, guildId, userId);
  const { records, simulated } = lookupData;
  if (!records.length) return interaction.update(noDataPayload(guild));
  return interaction.update(profilePayload({
    guild, member, records, page: Number(pageRaw), requesterId, simulated,
  }));
}
