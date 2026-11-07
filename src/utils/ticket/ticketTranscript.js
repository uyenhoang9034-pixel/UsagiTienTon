import { AttachmentBuilder } from 'discord.js';
import { logger } from '../logger.js';

const W = 794, H = 1123, M = 48, BOTTOM = 1060;
const P = { bg: '#FFF8FB', panel: '#FCEAF2', border: '#F1D5E2', text: '#493B48', muted: '#907D8C', accent: '#C8759D', card: '#FFFFFF' };

const esc = v => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
const time = v => v ? new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v)) : 'Không rõ';

function componentText(components = []) {
  const out = [];
  for (const component of components) {
    const data = component?.toJSON?.() || component?.data || component || {};
    if (data.content) out.push(data.content);
    if (Array.isArray(data.components)) out.push(componentText(data.components));
    if (data.accessory?.description) out.push(data.accessory.description);
  }
  return out.filter(Boolean).join('\n');
}

function readableDiscordText(message, value) {
  let text = String(value ?? '');
  const guild = message.guild;
  text = text.replace(/<@!?(\d+)>/g, (raw, id) => {
    const member = guild?.members?.cache?.get(id);
    const user = message.client?.users?.cache?.get(id);
    return '@' + (member?.displayName || user?.globalName || user?.username || 'thành viên');
  });
  text = text.replace(/<@&(\d+)>/g, (raw, id) => '@' + (guild?.roles?.cache?.get(id)?.name || 'vai trò'));
  text = text.replace(/<#(\d+)>/g, (raw, id) => '#' + (guild?.channels?.cache?.get(id)?.name || 'kênh'));
  text = text.replace(/<a?:([A-Za-z0-9_]+):\d+>/g, ':$1:');
  text = text.replace(/<t:(\d+)(?::[tTdDfFR])?>/g, (raw, seconds) => time(Number(seconds) * 1000));
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
  const body = readableDiscordText(message, message.cleanContent || message.content);
  if (body) out.push(body);
  const componentBody = readableDiscordText(message, componentText(message.components));
  if (componentBody) out.push(componentBody);
  for (const e of message.embeds || []) {
    if (e.title) out.push('[Embed] ' + readableDiscordText(message, e.title));
    if (e.description) out.push(readableDiscordText(message, e.description));
    for (const f of e.fields || []) out.push(readableDiscordText(message, f.name + ': ' + f.value));
  }
  for (const a of message.attachments?.values?.() || []) out.push('[Tệp đính kèm] ' + (a.name || 'Tệp'));
  for (const s of message.stickers?.values?.() || []) out.push('[Sticker] ' + s.name);
  return out.join('\n\n') || '[Tin nhắn không có nội dung văn bản]';
}

function md(v) {
  let s = esc(v);
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/~~([^~]+)~~/g, '<del>$1</del>').replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
  return s.replace(/\r?\n/g, '<br>');
}

function htmlMessage(m) {
  const name = m.member?.displayName || m.author?.globalName || m.author?.username || 'Unknown';
  const avatar = m.author?.displayAvatarURL?.({ extension: 'png', size: 64 }) || '';
  const files = [...(m.attachments?.values?.() || [])].map(a => {
    const url = esc(a.url), filename = esc(a.name || 'Tệp đính kèm');
    return a.contentType?.startsWith('image/')
      ? '<a class="file image" href="' + url + '" target="_blank"><img src="' + url + '" alt="' + filename + '">' + filename + '</a>'
      : '<a class="file" href="' + url + '" target="_blank">📎 ' + filename + '</a>';
  }).join('');
  const embeds = (m.embeds || []).map(e => {
    let x = '<aside class="embed">';
    if (e.author?.name) x += '<small>' + esc(e.author.name) + '</small>';
    if (e.title) x += '<h4>' + esc(e.title) + '</h4>';
    if (e.description) x += '<div>' + md(e.description) + '</div>';
    for (const f of e.fields || []) x += '<p><b>' + esc(f.name) + '</b><br>' + md(f.value) + '</p>';
    const image = e.image?.url || e.thumbnail?.url;
    if (image) x += '<img class="embed-img" src="' + esc(image) + '">';
    return x + '</aside>';
  }).join('');
  return '<article class="message"><img class="avatar" src="' + esc(avatar) + '" alt=""><div class="main"><div class="heading"><b>' + esc(name) + '</b>' +
    (m.author?.bot ? '<span class="bot">BOT</span>' : '') + '<time>' + esc(time(m.createdTimestamp)) + '</time></div>' +
    (m.content || componentText(m.components) ? '<div class="body">' + md(m.cleanContent || m.content || componentText(m.components)) + '</div>' : '') + (files ? '<div class="files">' + files + '</div>' : '') + embeds + '</div></article>';
}

function makeHtml(channel, messages, ticket) {
  const num = ticket?.number || ticket?.ticketNumber || channel.name.match(/\d+/)?.[0] || channel.id;
  const creator = ticket?.userId ? (channel.guild.members.cache.get(ticket.userId)?.user?.tag || 'ID ' + ticket.userId) : 'Không rõ';
  const reason = ticket?.closeReason || ticket?.reason || 'Không ghi nhận';
  const cards = messages.map(htmlMessage).join('\n');
  return '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Transcript · ' + esc(channel.name) + '</title><style>' +
    '*{box-sizing:border-box}body{margin:0;padding:25px 14px;background:linear-gradient(145deg,#fff8fb,#f8eef7,#f2edf9);color:#493b48;font:15px/1.6 Inter,"Segoe UI",Arial,sans-serif}.wrap{max-width:900px;margin:auto}.hero{background:linear-gradient(130deg,#fbe7f0,#f0e9f7);border:1px solid #f1d5e2;border-radius:22px;padding:24px;margin-bottom:20px}.tag{color:#c8759d;font-size:12px;font-weight:bold;letter-spacing:.1em}.hero h1{color:#65465a;font-size:26px;margin:5px 0}.muted,small,time{color:#907d8c}.stats{display:grid;grid-template-columns:repeat(2,1fr);gap:9px;margin-top:18px}.stat{background:#ffffffbb;border:1px solid white;border-radius:12px;padding:9px 12px}.stat small{display:block}.reason{margin-top:12px;padding:10px;border-left:3px solid #c8759d;background:#ffffffa0}.list{display:grid;gap:10px}.message{display:flex;gap:12px;background:white;border:1px solid #f0e3ea;border-radius:15px;padding:14px}.avatar{width:38px;height:38px;flex:0 0 38px;border-radius:50%;object-fit:cover}.main{min-width:0;flex:1}.heading{display:flex;gap:8px;align-items:center;flex-wrap:wrap;color:#69485c}.heading time{margin-left:auto;font-size:12px}.bot{font-size:10px;background:#eee5fa;padding:1px 5px;border-radius:5px}.body{margin-top:5px;overflow-wrap:anywhere}.files{display:flex;flex-wrap:wrap;gap:8px;margin-top:9px}.file{padding:8px 10px;border:1px solid #f1d5e2;border-radius:9px;background:#fff8fb;color:#81516c;text-decoration:none}.image{display:flex;flex-direction:column}.image img,.embed-img{max-width:min(100%,400px);max-height:300px;object-fit:contain;border-radius:8px}.embed{margin-top:9px;padding:11px;background:#faf7fc;border-left:3px solid #c9a7d9;border-radius:8px}.embed-img{display:block;margin-top:8px}.footer{text-align:center;color:#907d8c;font-size:12px;padding:20px}@media(min-width:650px){.stats{grid-template-columns:repeat(4,1fr)}}@media print{body{background:white;padding:0}.hero,.message{break-inside:avoid}}</style></head><body><main class="wrap"><header class="hero"><div class="tag">SERENDIPITY · TICKET ARCHIVE</div><h1>📜 Transcript · #' + esc(channel.name) + '</h1><div class="muted">Bản lưu hội thoại được xuất bởi Usagi Bot</div><div class="stats"><div class="stat"><small>Mã ticket</small><b>#' + esc(num) + '</b></div><div class="stat"><small>Người tạo</small><b>' + esc(creator) + '</b></div><div class="stat"><small>Số tin nhắn</small><b>' + messages.length + '</b></div><div class="stat"><small>Xuất lúc</small><b>' + esc(time(Date.now())) + '</b></div><div class="stat"><small>Mở lúc</small><b>' + esc(time(ticket?.createdAt)) + '</b></div><div class="stat"><small>Đóng lúc</small><b>' + esc(time(ticket?.closedAt || Date.now())) + '</b></div></div><div class="reason"><b>Lý do:</b> ' + esc(reason) + '</div></header><h2>💬 Nội dung hội thoại</h2><section class="list">' + (cards || '<p>Ticket chưa có tin nhắn.</p>') + '</section><footer class="footer">Serendipity · Múi giờ Việt Nam (UTC+7)</footer></main></body></html>';
}

export async function generateTranscriptFiles(channel, ticket = {}) {
  try {
    const messages = [];
    let before;
    while (true) {
      const batch = await channel.messages.fetch({ limit: 100, ...(before ? { before } : {}) });
      if (!batch.size) break;
      messages.push(...batch.values());
      before = batch.last()?.id;
      if (batch.size < 100) break;
    }

    messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
    const html = makeHtml(channel, messages, ticket);
    const files = [
      new AttachmentBuilder(
        Buffer.from(html, 'utf8'),
        { name: 'ticket-' + channel.id + '.html' },
      ),
    ];

    logger.info('Ticket HTML transcript generated', {
      channelId: channel.id,
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
