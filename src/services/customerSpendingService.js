import { getDatabaseValue, setDatabaseValue } from "../utils/database.js";
import { SERVICE_TICKET_IDS, SERVICE_TICKET_EMOJIS } from "../config/serviceTicketConfig.js";
import { getServiceTicketRecord, isServiceTicketChannel } from "./serviceTicketService.js";
import { logger } from "../utils/logger.js";

const COMPONENTS_V2 = 1 << 15;
const STAFF_ROLE_ID = SERVICE_TICKET_IDS.SP_TICKET_ROLE_ID;
const PAGE_SIZE = 5;

// Điền ID role Discord vào các chuỗi rỗng sau khi tạo role.
// Để trống sẽ bỏ qua đồng bộ role, không tự tìm theo tên và không tự tạo role.
const RANK_ROLE_IDS = {
  GUEST: "",
  SILVER: "",
  GOLD: "",
  PLATINUM: "",
  DIAMOND: "",
};

const RANKS = [
  { name: "Usagi Guest", threshold: 0, roleId: RANK_ROLE_IDS.GUEST },
  { name: "Usagi Silver", threshold: 300000, roleId: RANK_ROLE_IDS.SILVER },
  { name: "Usagi Gold", threshold: 600000, roleId: RANK_ROLE_IDS.GOLD },
  { name: "Usagi Platinum", threshold: 1000000, roleId: RANK_ROLE_IDS.PLATINUM },
  { name: "Usagi Diamond", threshold: 2500000, roleId: RANK_ROLE_IDS.DIAMOND },
];
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
    summary: emoji(guild, "trangtrig62", SERVICE_TICKET_EMOJIS.SUB_SECTION),
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
  try {
    await message.author.send(data);
    return true;
  } catch {
    await message.channel.send(data).catch(() => {});
    return false;
  }
}

function transactionPayload({ guild, member, staff, record, total, oldRank, newRank }) {
  const e = emojis(guild);
  const adding = record.type === "add";
  const fields = [
    text(title(guild, adding ? "GHI NHẬN DỊCH VỤ THÀNH CÔNG" : "CẬP NHẬT DỮ LIỆU DỊCH VỤ")),
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

function profilePayload({ guild, member, records, page, requesterId }) {
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
    if (type === "subtract" && amount > before) {
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
  if (!transactionCommand && !lookupCommand) return false;

  await message.delete().catch(() => {});

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

  const lookup = content.match(/^&ttgd\s+<@!?(\d+)>$/i);
  if (!lookup) {
    await sendPrivate(message, { content: "Cú pháp: &ttgd @User" });
    return true;
  }
  const member = await message.guild.members.fetch(lookup[1]).catch(() => null);
  if (!member) {
    await sendPrivate(message, { content: emojis(message.guild).bang + " Không tìm thấy thành viên được nhắc đến." });
    return true;
  }
  const value = await getDatabaseValue(client, keyFor(message.guild.id, member.id), null);
  const records = Array.isArray(value?.records) ? value.records : [];
  if (!records.length) {
    await sendPrivate(message, noDataPayload(message.guild));
    return true;
  }
  await sendPrivate(message, profilePayload({
    guild: message.guild, member, records, page: 1, requesterId: message.author.id,
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
  const value = await getDatabaseValue(client, keyFor(guildId, userId), null);
  const records = Array.isArray(value?.records) ? value.records : [];
  if (!records.length) return interaction.update(noDataPayload(guild));
  return interaction.update(profilePayload({
    guild, member, records, page: Number(pageRaw), requesterId,
  }));
}
