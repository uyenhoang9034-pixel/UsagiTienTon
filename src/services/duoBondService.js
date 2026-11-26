import { getDatabaseValue, setDatabaseValue, deleteDatabaseValue, listDatabaseKeys } from '../utils/database.js';

const LEVEL_XP = [0, 30000, 100000, 250000, 600000, 1200000];
const LEVEL_NAMES = ['Khởi đầu bạn bè', 'Friendzone', 'Một chút cảm nắng', 'Kết đôi tình yêu', 'Nắm tay vợ chồng', 'Tuổi già cùng nhau'];
const LEVEL_BUFFS = [20, 22, 24, 26, 28, 30];
const LEVEL_RIBBONS = [2000, 20000, 40000, 90000, 200000, 1200000];
const TOY_POINTS = { teddy: 2, train: 4, musicBox: 7, snowGlobe: 11, santaSleigh: 19, polarExpress: 30, icePalace: 45, santaCrown: 66, magicLantern: 94, reindeerBell: 131, frostGuitar: 178, auroraPrism: 234, starCompass: 300, santaWatch: 375, polarOrb: 469, eternalGift: 600 };
const MATERIALS = ['wood', 'fabric', 'magicDust', 'ribbon'];
const DAILY_FEEDS = 20;
const DAILY_TOYS = 3;
const DAILY_INTIMACY_XP = 1800;
const DAILY_TRADES = 10;

const key = (guildId, userId) => `santa:duo:user:${guildId || 'global'}:${userId}`;
const pairKey = (guildId, pairId) => `santa:duo:pair:${guildId || 'global'}:${pairId}`;
const inviteKey = (guildId, userId) => `santa:duo:invite:${guildId || 'global'}:${userId}`;
const pairIdFor = (a, b) => [String(a), String(b)].sort().join(':');
const todayKey = () => new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10);
const cleanName = (s) => String(s || 'Yêu Tinh Noel').slice(0, 32);
const freshDaily = () => ({ date: todayKey(), feeds: {}, toys: {}, intimacyXp: 0, trades: 0 });

async function getPlayer(client, guildId, userId) {
  return getDatabaseValue(client, `santa:player:${guildId || 'global'}:${userId}`, null);
}
async function savePlayer(client, guildId, player) {
  return setDatabaseValue(client, `santa:player:${guildId || 'global'}:${player.userId}`, player);
}
async function getPair(client, guildId, userId) {
  const uid = String(userId);
  const currentKey = key(guildId, uid);
  const index = await getDatabaseValue(client, currentKey, null);

  if (index?.pairId) {
    const storedGuildId = index.guildId || guildId;
    const pair = await getDatabaseValue(client, pairKey(storedGuildId, index.pairId), null);
    if (pair?.status === 'active' && pair.members?.includes(uid)) return pair;
  }

  // Activity có thể trả guildId khác sau khi khởi động/cập nhật.
  // Tìm index cũ theo userId để không làm mất liên kết đang lưu trong PostgreSQL.
  const prefix = 'santa:duo:user:';
  const candidateKeys = await listDatabaseKeys(client, prefix);
  for (const candidateKey of candidateKeys) {
    if (!candidateKey.startsWith(prefix) || !candidateKey.endsWith(`:${uid}`)) continue;
    const storedGuildId = candidateKey.slice(prefix.length, -(uid.length + 1));
    if (!storedGuildId) continue;

    const candidateIndex = candidateKey === currentKey
      ? index
      : await getDatabaseValue(client, candidateKey, null);
    if (!candidateIndex?.pairId) continue;

    const pairGuildId = candidateIndex.guildId || storedGuildId;
    const pair = await getDatabaseValue(client, pairKey(pairGuildId, candidateIndex.pairId), null);
    if (!pair || pair.status !== 'active' || !pair.members?.includes(uid)) continue;

    // Tạo alias ở scope hiện tại; dữ liệu gốc và pairId không bị thay đổi.
    if (candidateKey !== currentKey) {
      await setDatabaseValue(client, currentKey, { pairId: candidateIndex.pairId, guildId: pairGuildId });
    }
    return pair;
  }

  return null;
}
function getLevel(xp) {
  let level = 1;
  for (let i = 1; i < LEVEL_XP.length; i++) if (xp >= LEVEL_XP[i]) level = i + 1;
  return level;
}
function updateLevel(pair) {
  const old = pair.level || 1;
  const next = getLevel(pair.xp || 0);
  pair.level = next;
  pair.buffPct = LEVEL_BUFFS[next - 1];
  pair.pendingMilestones = pair.pendingMilestones || [];
  for (let level = old + 1; level <= next; level++) {
    const reward = LEVEL_RIBBONS[level - 1];
    pair.pendingMilestones.push({ level, reward, at: Date.now() });
  }
  return pair.pendingMilestones.splice(0);
}
async function syncBuff(client, guildId, pair) {
  for (const userId of pair.members) {
    const player = await getPlayer(client, guildId, userId);
    if (!player) continue;
    player.duoBondBuffPct = pair.buffPct || 20;
    await savePlayer(client, guildId, player);
  }
}
async function grantMilestones(client, guildId, pair, milestones) {
  for (const milestone of milestones) {
    for (const userId of pair.members) {
      const player = await getPlayer(client, guildId, userId);
      if (!player) continue;
      player.materials = player.materials || {};
      player.materials.ribbon = (Number(player.materials.ribbon) || 0) + milestone.reward;
      await savePlayer(client, guildId, player);
    }
    pair.history = [...(pair.history || []), { type: 'milestone', level: milestone.level, reward: milestone.reward, at: Date.now() }];
  }
}
function daily(pair) {
  if (!pair.daily || pair.daily.date !== todayKey()) pair.daily = freshDaily();
  return pair.daily;
}
async function persistPair(client, guildId, pair) {
  pair.updatedAt = Date.now();
  await setDatabaseValue(client, pairKey(guildId, pair.id), pair);
}
async function state(client, identity) {
  const guildId = identity.guildId || 'global';
  const pair = await getPair(client, guildId, identity.userId);
  const incoming = await getDatabaseValue(client, inviteKey(guildId, identity.userId), null);
  const outgoing = await getDatabaseValue(client, `santa:duo:outgoing:${guildId}:${identity.userId}`, null);
  let partner = null;
  if (pair) {
    const partnerId = pair.members.find((id) => id !== String(identity.userId));
    const p = await getPlayer(client, guildId, partnerId);
    partner = p ? { userId: partnerId, username: p.username, avatarUrl: p.avatarUrl } : { userId: partnerId, username: 'Đối tác' };
  }
  return { pair, partner, incoming, outgoing, levels: LEVEL_NAMES.map((name, i) => ({ level: i + 1, name, xp: LEVEL_XP[i], buffPct: LEVEL_BUFFS[i], ribbonReward: LEVEL_RIBBONS[i] })) };
}

export async function getDuoBondState(client, identity) {
  return state(client, identity);
}

export async function handleDuoBondInvite(client, identity, targetUserId) {
  const guildId = identity.guildId || 'global';
  const fromId = String(identity.userId), toId = String(targetUserId || '');
  if (!/^\d{15,22}$/.test(toId) || toId === fromId) return { ok: false, message: 'ID Discord không hợp lệ hoặc bạn không thể tự kết đôi.' };
  if (fromId.startsWith('guest_') || toId.startsWith('guest_')) return { ok: false, message: 'Chế độ khách không thể kết đôi.' };
  if (await getPair(client, guildId, fromId)) return { ok: false, message: 'Bạn đang có đối tác rồi.' };
  if (await getPair(client, guildId, toId)) return { ok: false, message: 'Người này đã có đối tác.' };
  const target = await getPlayer(client, guildId, toId);
  if (!target) return { ok: false, message: 'Không tìm thấy hồ sơ Xưởng Noel của người này trong server.' };
  const existing = await getDatabaseValue(client, inviteKey(guildId, toId), null);
  if (existing && existing.expiresAt > Date.now()) return { ok: false, message: 'Người này đang có lời mời kết đôi chờ xử lý.' };
  const invite = { fromId, fromName: cleanName(identity.username), toId, toName: cleanName(target.username), createdAt: Date.now(), expiresAt: Date.now() + 24 * 3600000 };
  await setDatabaseValue(client, inviteKey(guildId, toId), invite);
  await setDatabaseValue(client, `santa:duo:outgoing:${guildId}:${fromId}`, invite);
  return { ok: true, message: `Đã gửi lời mời kết đôi đến ${target.username}. Họ cần chấp nhận để bắt đầu hành trình cùng Tony.` };
}

export async function handleDuoBondAccept(client, identity) {
  const guildId = identity.guildId || 'global';
  const uid = String(identity.userId);
  const invite = await getDatabaseValue(client, inviteKey(guildId, uid), null);
  if (!invite || invite.expiresAt <= Date.now()) return { ok: false, message: 'Lời mời không còn hiệu lực.' };
  if (await getPair(client, guildId, uid) || await getPair(client, guildId, invite.fromId)) return { ok: false, message: 'Một trong hai người đã có đối tác.' };
  const pairId = pairIdFor(uid, invite.fromId);
  const pair = { id: pairId, guildId, members: [invite.fromId, uid], status: 'active', xp: 0, level: 1, buffPct: 20, sharedStorage: { wood: 0, fabric: 0, magicDust: 0, ribbon: 0 }, pendingTrade: null, breakupRequest: null, daily: freshDaily(), history: [{ type: 'paired', at: Date.now() }], createdAt: Date.now(), updatedAt: Date.now() };
  await persistPair(client, guildId, pair);
  await setDatabaseValue(client, key(guildId, uid), { pairId });
  await setDatabaseValue(client, key(guildId, invite.fromId), { pairId });
  await deleteDatabaseValue(client, inviteKey(guildId, uid));
  await deleteDatabaseValue(client, `santa:duo:outgoing:${guildId}:${invite.fromId}`);
  await syncBuff(client, guildId, pair);
  await grantMilestones(client, guildId, pair, [{ level: 1, reward: LEVEL_RIBBONS[0] }]);
  await persistPair(client, guildId, pair);
  return { ok: true, message: '💞 Hai bạn đã kết đôi! Tony – Tuần Lộc Đồng Hành đã xuất hiện. Cả hai nhận buff sản xuất +20% và mỗi người nhận 2.000 Ruy băng mốc đầu tiên.', duo: await state(client, identity) };
}

export async function handleDuoBondDecline(client, identity) {
  const guildId = identity.guildId || 'global', uid = String(identity.userId);
  const invite = await getDatabaseValue(client, inviteKey(guildId, uid), null);
  if (!invite) return { ok: false, message: 'Không có lời mời đang chờ.' };
  await deleteDatabaseValue(client, inviteKey(guildId, uid));
  await deleteDatabaseValue(client, `santa:duo:outgoing:${guildId}:${invite.fromId}`);
  return { ok: true, message: 'Bạn đã từ chối lời mời kết đôi.' };
}

export async function handleDuoBondBreakupRequest(client, identity) {
  const guildId = identity.guildId || 'global', uid = String(identity.userId);
  const pair = await getPair(client, guildId, uid);
  if (!pair) return { ok: false, message: 'Bạn hiện chưa kết đôi.' };
  if (pair.breakupRequest) return { ok: false, message: 'Đã có yêu cầu hủy kết đôi đang chờ người còn lại xác nhận.' };
  pair.breakupRequest = { fromId: uid, createdAt: Date.now() };
  await persistPair(client, guildId, pair);
  return { ok: true, message: 'Đã gửi yêu cầu hủy kết đôi. Tony chỉ rời đi khi cả hai cùng đồng ý.' };
}

export async function handleDuoBondBreakupRespond(client, identity, accept) {
  const guildId = identity.guildId || 'global', uid = String(identity.userId);
  const pair = await getPair(client, guildId, uid);
  if (!pair?.breakupRequest) return { ok: false, message: 'Không có yêu cầu hủy kết đôi đang chờ.' };
  if (pair.breakupRequest.fromId === uid) return { ok: false, message: 'Người gửi yêu cầu không thể tự xác nhận thay đối tác.' };
  if (!accept) {
    pair.breakupRequest = null;
    await persistPair(client, guildId, pair);
    return { ok: true, message: 'Bạn đã từ chối. Hai người vẫn tiếp tục đồng hành cùng Tony.' };
  }
  if (pair.pendingTrade) {
    const escrowOwner = await getPlayer(client, guildId, pair.pendingTrade.fromId);
    if (escrowOwner) {
      escrowOwner.materials = escrowOwner.materials || {};
      escrowOwner.materials[pair.pendingTrade.offerMat] = (escrowOwner.materials[pair.pendingTrade.offerMat] || 0) + pair.pendingTrade.offerAmount;
      await savePlayer(client, guildId, escrowOwner);
    }
  }
  pair.status = 'ended';
  pair.endedAt = Date.now();
  await persistPair(client, guildId, pair);
  for (const memberId of pair.members) {
    await deleteDatabaseValue(client, key(guildId, memberId));
    const p = await getPlayer(client, guildId, memberId);
    if (p) { p.duoBondBuffPct = 0; await savePlayer(client, guildId, p); }
  }
  return { ok: true, message: 'Hai bạn đã cùng xác nhận chia tay. Tony, kho chung và toàn bộ tiến trình quan hệ đã được reset. Lần kết đôi tiếp theo sẽ bắt đầu từ đầu.' };
}

export async function handleDuoBondFeed(client, identity) {
  const guildId = identity.guildId || 'global', uid = String(identity.userId);
  const pair = await getPair(client, guildId, uid);
  if (!pair) return { ok: false, message: 'Bạn cần kết đôi trước khi chăm sóc Tony.' };
  const d = daily(pair), used = Number(d.feeds[uid] || 0);
  if (used >= DAILY_FEEDS) return { ok: false, message: 'Bạn đã cho Tony ăn đủ 20 lần hôm nay.' };
  const remainingXp = Math.max(0, DAILY_INTIMACY_XP - Number(d.intimacyXp || 0));
  if (remainingXp < 300) return { ok: false, message: 'Hôm nay hai bạn đã tích đủ 1.800 điểm thân mật. Không thể cho Tony ăn thêm; hãy quay lại vào ngày mai.' };
  const p = await getPlayer(client, guildId, uid);
  if (!p || Number(p.snowCoins || 0) < 300) return { ok: false, message: 'Cần 300 ❄️ Xu Tuyết để cho Tony ăn.' };
  p.snowCoins -= 300; await savePlayer(client, guildId, p);
  d.feeds[uid] = used + 1; d.intimacyXp = Number(d.intimacyXp || 0) + 300; pair.xp += 300;
  const milestones = updateLevel(pair);
  await grantMilestones(client, guildId, pair, milestones);
  await syncBuff(client, guildId, pair); await persistPair(client, guildId, pair);
  return { ok: true, message: `Bạn đã cho Tony ăn! +300 điểm thân mật. Hôm nay: ${d.feeds[uid]}/20 lần.${milestones.length ? ' Đã mở khóa mốc quan hệ mới và nhận Ruy băng!' : ''}` };
}

export async function handleDuoBondToy(client, identity, toyId) {
  const guildId = identity.guildId || 'global', uid = String(identity.userId);
  const pair = await getPair(client, guildId, uid);
  if (!pair) return { ok: false, message: 'Bạn cần kết đôi trước khi chơi với Tony.' };
  const d = daily(pair), used = Number(d.toys[uid] || 0);
  if (used >= DAILY_TOYS) return { ok: false, message: 'Bạn đã ném đồ chơi cho Tony đủ 3 lần hôm nay.' };
  const points = TOY_POINTS[String(toyId)];
  if (!points) return { ok: false, message: 'Đồ chơi không hợp lệ.' };
  const remainingXp = Math.max(0, DAILY_INTIMACY_XP - Number(d.intimacyXp || 0));
  if (remainingXp < points) return { ok: false, message: 'Hôm nay hai bạn đã tích đủ giới hạn 1.800 điểm thân mật. Không thể ném thêm đồ chơi hoặc cho Tony ăn nữa; hãy quay lại vào ngày mai.' };
  const p = await getPlayer(client, guildId, uid);
  if (!p || Number(p.toys?.[toyId] || 0) < 1) return { ok: false, message: 'Bạn không có món đồ chơi này.' };
  p.toys[toyId] -= 1; await savePlayer(client, guildId, p);
  d.toys[uid] = used + 1; d.intimacyXp = Number(d.intimacyXp || 0) + points; pair.xp += points;
  const milestones = updateLevel(pair);
  await grantMilestones(client, guildId, pair, milestones);
  await syncBuff(client, guildId, pair); await persistPair(client, guildId, pair);
  return { ok: true, message: `Tony rất thích món quà này! +${points.toLocaleString('vi-VN')} điểm thân mật.${milestones.length ? ' Hai bạn vừa mở khóa mốc quan hệ mới!' : ''}` };
}

export async function handleDuoBondStorage(client, identity, action, material, amount) {
  const guildId = identity.guildId || 'global', uid = String(identity.userId);
  const pair = await getPair(client, guildId, uid);
  const qty = Number(amount);
  if (!pair || !MATERIALS.includes(material) || !Number.isSafeInteger(qty) || qty < 1 || qty > 1000000000) return { ok: false, message: 'Thông tin thao tác kho chung không hợp lệ.' };
  const p = await getPlayer(client, guildId, uid);
  if (!p) return { ok: false, message: 'Không tìm thấy hồ sơ Xưởng Noel.' };
  if (action === 'deposit') {
    if (Number(p.materials?.[material] || 0) < qty) return { ok: false, message: 'Kho cá nhân không đủ nguyên liệu.' };
    p.materials[material] -= qty; pair.sharedStorage[material] = (pair.sharedStorage[material] || 0) + qty;
  } else if (action === 'withdraw') {
    if (Number(pair.sharedStorage[material] || 0) < qty) return { ok: false, message: 'Kho chung không đủ nguyên liệu.' };
    pair.sharedStorage[material] -= qty; p.materials[material] = (p.materials[material] || 0) + qty;
  } else return { ok: false, message: 'Thao tác kho không hợp lệ.' };
  await savePlayer(client, guildId, p); await persistPair(client, guildId, pair);
  return { ok: true, message: action === 'deposit' ? 'Đã gửi nguyên liệu vào kho chung.' : 'Đã rút nguyên liệu từ kho chung.' };
}

export async function handleDuoBondTradeCreate(client, identity, { offerMat, offerAmount, wantMat, wantAmount }) {
  const guildId = identity.guildId || 'global', uid = String(identity.userId);
  const pair = await getPair(client, guildId, uid), d = pair && daily(pair);
  if (!pair || !MATERIALS.includes(offerMat) || !MATERIALS.includes(wantMat) || offerMat === wantMat) return { ok: false, message: 'Giao dịch không hợp lệ hoặc bạn chưa kết đôi.' };
  if (pair.pendingTrade) return { ok: false, message: 'Cặp đôi đang có một giao dịch chờ duyệt.' };
  if (d.trades >= DAILY_TRADES) return { ok: false, message: 'Hai bạn đã hoàn tất đủ 10 giao dịch hôm nay.' };
  const a = Number(offerAmount), b = Number(wantAmount);
  if (![a,b].every(n => Number.isSafeInteger(n) && n > 0 && n <= 100000000)) return { ok: false, message: 'Số lượng giao dịch không hợp lệ.' };
  const p = await getPlayer(client, guildId, uid);
  if (!p || Number(p.materials?.[offerMat] || 0) < a) return { ok: false, message: 'Kho cá nhân không đủ nguyên liệu để đặt giao dịch.' };
  p.materials[offerMat] -= a; await savePlayer(client, guildId, p);
  pair.pendingTrade = { id: `${Date.now()}-${uid}`, fromId: uid, offerMat, offerAmount: a, wantMat, wantAmount: b, createdAt: Date.now() };
  await persistPair(client, guildId, pair);
  return { ok: true, message: 'Đã gửi đề nghị giao dịch. Nguyên liệu của bạn đã được giữ riêng cho đến khi đối tác duyệt.' };
}

export async function handleDuoBondTradeRespond(client, identity, accept) {
  const guildId = identity.guildId || 'global', uid = String(identity.userId);
  const pair = await getPair(client, guildId, uid), trade = pair?.pendingTrade;
  if (!trade) return { ok: false, message: 'Không có giao dịch nào đang chờ duyệt.' };
  if (trade.fromId === uid) return { ok: false, message: 'Người tạo giao dịch không thể tự duyệt.' };
  const sender = await getPlayer(client, guildId, trade.fromId);
  if (!sender) return { ok: false, message: 'Không tìm thấy người gửi; giao dịch đã được hủy.' };
  if (!accept) {
    sender.materials[trade.offerMat] = (sender.materials[trade.offerMat] || 0) + trade.offerAmount;
    await savePlayer(client, guildId, sender);
    pair.pendingTrade = null; await persistPair(client, guildId, pair);
    return { ok: true, message: 'Đã từ chối. Nguyên liệu được hoàn trả chính xác cho người gửi.' };
  }
  const d = daily(pair), receiver = await getPlayer(client, guildId, uid);
  if (d.trades >= DAILY_TRADES) return { ok: false, message: 'Hai bạn đã hoàn tất đủ 10 giao dịch hôm nay.' };
  if (!receiver || Number(receiver.materials?.[trade.wantMat] || 0) < trade.wantAmount) return { ok: false, message: 'Kho cá nhân của bạn không đủ nguyên liệu yêu cầu.' };
  receiver.materials[trade.wantMat] -= trade.wantAmount;
  receiver.materials[trade.offerMat] = (receiver.materials[trade.offerMat] || 0) + trade.offerAmount + Math.max(1, Math.ceil(trade.offerAmount * 0.2));
  sender.materials[trade.wantMat] = (sender.materials[trade.wantMat] || 0) + trade.wantAmount + Math.max(1, Math.ceil(trade.wantAmount * 0.2));
  await savePlayer(client, guildId, receiver); await savePlayer(client, guildId, sender);
  d.trades += 1; pair.pendingTrade = null; pair.history = [...(pair.history || []), { type: 'trade', fromId: trade.fromId, toId: uid, at: Date.now() }];
  await persistPair(client, guildId, pair);
  return { ok: true, message: 'Giao dịch hoàn tất! Cả hai đã nhận nguyên liệu kèm thưởng +20% (làm tròn lên phần lẻ, tối thiểu +1).' };
}
