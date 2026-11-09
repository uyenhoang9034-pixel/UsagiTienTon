import { AttachmentBuilder } from 'discord.js';
import { logger } from '../logger.js';

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const time = (v) => {
  if (!v) return 'Không rõ';
  const date = new Date(v);
  if (Number.isNaN(date.getTime())) return 'Không rõ';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

function componentText(components = []) {
  if (!Array.isArray(components)) return '';
  const out = [];
  for (const component of components) {
    const data = component?.toJSON?.() || component?.data || component || {};
    if (data.content) out.push(data.content);
    if (Array.isArray(data.components)) out.push(componentText(data.components));
    if (Array.isArray(data.items)) {
      for (const item of data.items) {
        const desc = item?.description ? ` (${item.description})` : '';
        if (item?.media?.url) out.push(`[Ảnh]${desc}: ${item.media.url}`);
      }
    }
    if (data.file?.url) out.push(`[Tệp V2] ${data.file.url}`);
    if (data.accessory?.description) out.push(data.accessory.description);
  }
  return out.filter(Boolean).join('\n');
}

function formatDiscordTokens(message, value, channel = null) {
  let text = String(value ?? '');
  const guild = message?.guild || channel?.guild;
  const client = message?.client || channel?.client;
  text = text.replace(/<@!?(\d+)>/g, (raw, id) => {
    const member = message?.mentions?.members?.get?.(id) || guild?.members?.cache?.get?.(id);
    const user = message?.mentions?.users?.get?.(id) || client?.users?.cache?.get?.(id);
    return '@' + (member?.displayName || user?.globalName || user?.username || id);
  });
  text = text.replace(/<@&(\d+)>/g, (raw, id) => {
    const role = message?.mentions?.roles?.get?.(id) || guild?.roles?.cache?.get?.(id);
    return '@' + (role?.name || 'vai-trò');
  });
  text = text.replace(/<#(\d+)>/g, (raw, id) => {
    const ch = message?.mentions?.channels?.get?.(id) || guild?.channels?.cache?.get?.(id);
    return '#' + (ch?.name || 'kênh');
  });
  text = text.replace(/<a?:([A-Za-z0-9_]+):\d+>/g, ':$1:');
  text = text.replace(/<t:(\d+)(?::[tTdDfFR])?>/g, (raw, seconds) => time(Number(seconds) * 1000));
  return text;
}

function readableDiscordText(message, value) {
  let text = formatDiscordTokens(message, value);
  text = text.replace(/<((?:https?:\/\/)[^>]+)>/g, '$1');
  text = text.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '$1 ($2)');
  const fence = String.fromCharCode(96).repeat(3);
  text = text.split(fence).join('');
  text = text.replace(/\|\|([\s\S]*?)\|\|/g, '$1');
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/__([^_]+)__/g, '$1');
  text = text.replace(/~~([^~]+)~~/g, '$1').replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '$1');
  text = text.replace(/(?<!_)_([^_\n]+)_(?!_)/g, '$1');
  return text;
}

function plain(message) {
  const out = [];
  let rawContent = '';
  try {
    rawContent = message?.cleanContent || message?.content || '';
  } catch {
    rawContent = message?.content || '';
  }
  const body = readableDiscordText(message, rawContent);
  if (body) out.push(body);
  const componentBody = readableDiscordText(message, componentText(message?.components));
  if (componentBody) out.push(componentBody);
  for (const e of message?.embeds || []) {
    if (e.title) out.push('[Embed] ' + readableDiscordText(message, e.title));
    if (e.description) out.push(readableDiscordText(message, e.description));
    for (const f of e.fields || []) out.push(readableDiscordText(message, f.name + ': ' + f.value));
  }
  for (const a of message?.attachments?.values?.() || []) out.push('[Tệp đính kèm] ' + (a.name || 'Tệp'));
  for (const s of message?.stickers?.values?.() || []) out.push('[Sticker] ' + s.name);
  return out.join('\n\n') || '[Tin nhắn không có nội dung văn bản]';
}

function md(v) {
  let s = esc(v);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/~~([^~]+)~~/g, '<del>$1</del>').replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  return s.replace(/\r?\n/g, '<br>');
}

function htmlMessage(m, channel = null) {
  const name = m.member?.displayName || m.author?.globalName || m.author?.username || m.author?.tag || 'Unknown';
  const avatar = m.author?.displayAvatarURL?.({ extension: 'png', size: 64 }) || '';
  const files = [...(m.attachments?.values?.() || [])].map((a) => {
    const url = esc(a.url), filename = esc(a.name || 'Tệp đính kèm');
    return a.contentType?.startsWith('image/')
      ? '<a class="file image" href="' + url + '" target="_blank"><img src="' + url + '" alt="' + filename + '">' + filename + '</a>'
      : '<a class="file" href="' + url + '" target="_blank">📎 ' + filename + '</a>';
  }).join('');
  const embeds = (m.embeds || []).map((e) => {
    let x = '<aside class="embed">';
    if (e.author?.name) x += '<small>' + esc(e.author.name) + '</small>';
    if (e.title) x += '<h4>' + esc(formatDiscordTokens(m, e.title, channel)) + '</h4>';
    if (e.description) x += '<div>' + md(formatDiscordTokens(m, e.description, channel)) + '</div>';
    for (const f of e.fields || []) {
      x += '<p><b>' + esc(formatDiscordTokens(m, f.name, channel)) + '</b><br>' + md(formatDiscordTokens(m, f.value, channel)) + '</p>';
    }
    const image = e.image?.url || e.thumbnail?.url;
    if (image) x += '<img class="embed-img" src="' + esc(image) + '">';
    return x + '</aside>';
  }).join('');

  let rawText = '';
  try {
    rawText = m.cleanContent || m.content || '';
  } catch {
    rawText = m.content || '';
  }
  const compText = componentText(m.components);
  const combinedBody = [rawText, compText].filter(Boolean).join('\n\n');
  const formattedBody = combinedBody ? formatDiscordTokens(m, combinedBody, channel) : '';

  const avatarHtml = avatar ? '<img class="avatar" src="' + esc(avatar) + '" alt="">' : '<div class="avatar"></div>';

  return '<article class="message">' + avatarHtml + '<div class="main"><div class="heading"><b>' + esc(name) + '</b>' +
    (m.author?.bot ? '<span class="bot">BOT</span>' : '') + '<time>' + esc(time(m.createdTimestamp || Date.now())) + '</time></div>' +
    (formattedBody ? '<div class="body">' + md(formattedBody) + '</div>' : '') + (files ? '<div class="files">' + files + '</div>' : '') + embeds + '</div></article>';
}

function makeHtml(channel, messages, ticket, creatorDisplay = 'Không rõ') {
  const channelName = channel?.name || 'ticket';
  const num = ticket?.number || ticket?.ticketNumber || String(channelName).match(/\d+/)?.[0] || channel?.id || 'ticket';
  const reason = ticket?.closeReason || ticket?.reason || 'Không ghi nhận';
  const cards = messages.map((m) => htmlMessage(m, channel)).join('\n');
  return '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Transcript · ' + esc(channelName) + '</title><style>' +
    '*{box-sizing:border-box}body{margin:0;padding:25px 14px;background:linear-gradient(145deg,#fff8fb,#f8eef7,#f2edf9);color:#493b48;font:15px/1.6 Inter,"Segoe UI",Arial,sans-serif}.wrap{max-width:900px;margin:auto}.hero{background:linear-gradient(130deg,#fbe7f0,#f0e9f7);border:1px solid #f1d5e2;border-radius:22px;padding:24px;margin-bottom:20px}.tag{color:#c8759d;font-size:12px;font-weight:bold;letter-spacing:.1em}.hero h1{color:#65465a;font-size:26px;margin:5px 0}.muted,small,time{color:#907d8c}.stats{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin-top:18px}.stat{background:#ffffffbb;border:1px solid white;border-radius:12px;padding:9px 12px}.stat small{display:block}.reason{margin-top:12px;padding:10px;border-left:3px solid #c8759d;background:#ffffffa0}.list{display:grid;gap:10px}.message{display:flex;gap:12px;background:white;border:1px solid #f0e3ea;border-radius:15px;padding:14px}.avatar{width:38px;height:38px;flex:0 0 38px;border-radius:50%;object-fit:cover;background:#f5e6ee}.main{min-width:0;flex:1}.heading{display:flex;gap:8px;align-items:center;flex-wrap:wrap;color:#69485c}.heading time{margin-left:auto;font-size:12px}.bot{font-size:10px;background:#eee5fa;padding:1px 5px;border-radius:5px}.body{margin-top:5px;overflow-wrap:anywhere}.files{display:flex;flex-wrap:wrap;gap:8px;margin-top:9px}.file{padding:8px 10px;border:1px solid #f1d5e2;border-radius:9px;background:#fff8fb;color:#81516c;text-decoration:none}.image{display:flex;flex-direction:column}.image img,.embed-img{max-width:min(100%,400px);max-height:300px;object-fit:contain;border-radius:8px}.embed{margin-top:9px;padding:11px;background:#faf7fc;border-left:3px solid #c9a7d9;border-radius:8px}.embed-img{display:block;margin-top:8px}.footer{text-align:center;color:#907d8c;font-size:12px;padding:20px}@media(min-width:650px){.stats{grid-template-columns:repeat(4,1fr)}}@media print{body{background:white;padding:0}.hero,.message{break-inside:avoid}}</style></head><body><main class="wrap"><header class="hero"><div class="tag">SERENDIPITY · TICKET ARCHIVE</div><h1>📜 Transcript · #' + esc(channelName) + '</h1><div class="muted">Bản lưu hội thoại được xuất bởi Usagi Bot</div><div class="stats"><div class="stat"><small>Mã ticket</small><b>#' + esc(num) + '</b></div><div class="stat"><small>Người tạo</small><b>' + esc(creatorDisplay) + '</b></div><div class="stat"><small>Số tin nhắn</small><b>' + messages.length + '</b></div><div class="stat"><small>Xuất lúc</small><b>' + esc(time(Date.now())) + '</b></div><div class="stat"><small>Mở lúc</small><b>' + esc(time(ticket?.createdAt)) + '</b></div><div class="stat"><small>Đóng lúc</small><b>' + esc(time(ticket?.closedAt || Date.now())) + '</b></div></div><div class="reason"><b>Lý do:</b> ' + esc(reason) + '</div></header><h2>💬 Nội dung hội thoại</h2><section class="list">' + (cards || '<p>Ticket chưa có tin nhắn.</p>') + '</section><footer class="footer">Serendipity · Múi giờ Việt Nam (UTC+7)</footer></main></body></html>';
}

export function buildTranscriptFileName(channel) {
  const rawChannelName = String(channel?.name || channel?.id || 'ticket')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'ticket';

  return rawChannelName.startsWith('transcript-')
    ? `${rawChannelName}.html`
    : `transcript-${rawChannelName}.html`;
}

export async function generateTranscriptFiles(channel, ticket = {}) {
  try {
    const messages = [];
    if (channel?.messages?.fetch) {
      let before;
      while (true) {
        let batch = null;
        try {
          batch = await channel.messages.fetch({ limit: 100, ...(before ? { before } : {}) });
        } catch (fetchErr) {
          logger.warn('Failed to fetch message batch for transcript', {
            channelId: channel?.id,
            before,
            errorMessage: fetchErr?.message,
          });
          break;
        }
        if (!batch || !batch.size) break;
        messages.push(...batch.values());
        if (batch.size < 100) break;
        const nextBefore = typeof batch.last === 'function'
          ? batch.last()?.id
          : Array.from(batch.values()).at(-1)?.id;
        if (!nextBefore || nextBefore === before) break;
        before = nextBefore;
      }
    }

    messages.sort((a, b) => (a.createdTimestamp || 0) - (b.createdTimestamp || 0));

    let creatorDisplay = 'Không rõ';
    if (ticket?.userId) {
      const cachedMember = channel?.guild?.members?.cache?.get?.(ticket.userId);
      const cachedUser = channel?.client?.users?.cache?.get?.(ticket.userId);
      let userLabel =
        cachedMember?.user?.tag ||
        cachedUser?.tag ||
        cachedMember?.displayName ||
        cachedUser?.globalName;

      if (!userLabel) {
        const fetchedMember = await channel?.guild?.members?.fetch?.(ticket.userId).catch(() => null);
        const fetchedUser =
          fetchedMember?.user ||
          (await channel?.client?.users?.fetch?.(ticket.userId).catch(() => null));
        userLabel =
          fetchedUser?.tag ||
          fetchedMember?.displayName ||
          fetchedUser?.globalName;
      }

      creatorDisplay = userLabel ? `${userLabel} (${ticket.userId})` : `ID ${ticket.userId}`;
    }

    const html = makeHtml(channel, messages, ticket, creatorDisplay);
    const fileName = buildTranscriptFileName(channel);
    const files = [
      new AttachmentBuilder(
        Buffer.from(html, 'utf8'),
        { name: fileName },
      ),
    ];

    logger.info('Ticket HTML transcript generated', {
      channelId: channel?.id,
      fileName,
      messageCount: messages.length,
    });

    return files;
  } catch (error) {
    logger.error('Ticket HTML transcript generation failed', {
      channelId: channel?.id,
      errorMessage: error.message,
      errorStack: error.stack,
    });
    return [];
  }
}

export { plain };
