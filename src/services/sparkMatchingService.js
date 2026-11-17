import { db } from '../utils/database/wrapper.js';
import { PermissionFlagsBits } from 'discord.js';
import { randomUUID } from 'node:crypto';
import { logger } from '../utils/logger.js';
import {
  SPARK_MATCHING_CONFIG,
  SPARK_STORAGE_KEYS,
  getDefaultSparkGuildConfig,
} from '../config/sparkMatchingConfig.js';
import {
  FEEDBACK_DIGIT_EMOJIS,
  FEEDBACK_DIGIT_EMOJIS_ALT,
  extractCustomEmojiId,
  resolveGuildDigitEmojiMap,
  damerauLevenshtein,
} from './serviceTicketService.js';
import {
  SPARK_FEEDBACK_STICKY_MARKER,
  buildSparkFeedbackStickyPayloadV2,
} from './sparkMatchingUI.js';

const clone = (value) => JSON.parse(JSON.stringify(value));

async function read(key, fallback) {
  const value = await db.get(key, fallback);
  return value ?? fallback;
}

async function write(key, value) {
  await db.set(key, value);
  return value;
}

export async function getSparkConfig(guildId) {
  const defaults = getDefaultSparkGuildConfig();
  const stored = await read(SPARK_STORAGE_KEYS.config(guildId), {});
  return { ...defaults, ...(stored || {}) };
}

export async function updateSparkConfig(guildId, patch) {
  const current = await getSparkConfig(guildId);
  const next = { ...current, ...patch, updatedAt: Date.now() };
  await write(SPARK_STORAGE_KEYS.config(guildId), next);
  return next;
}

export async function getSparkProfiles(guildId) {
  const value = await read(SPARK_STORAGE_KEYS.profiles(guildId), []);
  return Array.isArray(value) ? value : [];
}

export async function getSparkMatches(guildId) {
  const value = await read(SPARK_STORAGE_KEYS.matches(guildId), []);
  return Array.isArray(value) ? value : [];
}

export async function getSparkHistory(guildId) {
  const value = await read(SPARK_STORAGE_KEYS.history(guildId), []);
  return Array.isArray(value) ? value : [];
}

export async function getSparkProfile(guildId, userId) {
  const profiles = await getSparkProfiles(guildId);
  return profiles.find((item) => item.userId === String(userId)) || null;
}

export async function getSparkActiveMatchForUser(guildId, userId) {
  const matches = await getSparkMatches(guildId);
  return matches.find((item) =>
    item.test !== true &&
    ['invited', 'anonymous', 'reveal_pending', 'thread', 'connection_pending', 'feedback_pending'].includes(item.status) &&
    [item.userAId, item.userBId, item.requestedUserId].filter(Boolean).includes(String(userId))
  ) || null;
}

export async function beginSparkRegistration(guild, member) {
  const config = await getSparkConfig(guild.id);
  if (!config.enabled || !config.registrationEnabled) {
    return { ok: false, code: 'REGISTRATION_DISABLED' };
  }

  const userId = String(member?.id || member?.user?.id || '');
  if (!userId) return { ok: false, code: 'MEMBER_NOT_FOUND' };

  const existingProfile = await getSparkProfile(guild.id, userId);
  const activeMatch = await getSparkActiveMatchForUser(guild.id, userId);
  if (existingProfile && ['pending', 'approved', 'matched'].includes(existingProfile.status)) {
    return { ok: false, code: 'PROFILE_EXISTS' };
  }
  if (existingProfile?.status === 'rejected' && existingProfile.reapplyAllowed === false) {
    return { ok: false, code: 'REAPPLY_BLOCKED' };
  }
  if (activeMatch) return { ok: false, code: 'ACTIVE_MATCH' };

  const role = await guild.roles.fetch(config.memberRoleId).catch(() => null);
  if (!role) return { ok: false, code: 'ROLE_NOT_FOUND' };
  const guildMember = typeof member?.roles?.add === 'function'
    ? member
    : await guild.members.fetch(userId).catch(() => null);
  if (!guildMember?.roles?.add) return { ok: false, code: 'MEMBER_NOT_FOUND' };

  const sessions = await read(SPARK_STORAGE_KEYS.sessions(guild.id), {});
  sessions[userId] = {
    userId,
    guildId: guild.id,
    step: 1,
    data: {},
    startedAt: Date.now(),
  };
  await write(SPARK_STORAGE_KEYS.sessions(guild.id), sessions);
  await guildMember.roles.add(role, 'Đăng ký tham gia Spark Matching');

  return { ok: true };
}

export async function getSparkRegistrationSession(guildId, userId) {
  const sessions = await read(SPARK_STORAGE_KEYS.sessions(guildId), {});
  return sessions[String(userId)] || null;
}

export async function saveSparkRegistrationStep(guildId, userId, stepData) {
  const sessions = await read(SPARK_STORAGE_KEYS.sessions(guildId), {});
  const session = sessions[String(userId)];
  if (!session) return null;
  session.data = { ...session.data, ...stepData };
  session.step += 1;
  sessions[String(userId)] = session;
  await write(SPARK_STORAGE_KEYS.sessions(guildId), sessions);
  return session;
}

export async function cancelSparkRegistration(guildId, userId) {
  const sessions = await read(SPARK_STORAGE_KEYS.sessions(guildId), {});
  delete sessions[String(userId)];
  await write(SPARK_STORAGE_KEYS.sessions(guildId), sessions);
}

export async function submitSparkProfile(guild, user) {
  const session = await getSparkRegistrationSession(guild.id, user.id);
  if (!session) return { ok: false, code: 'SESSION_EXPIRED' };

  const data = session.data || {};
  const required = ['age', 'gender', 'matchGender', 'area', 'intention', 'about', 'hobbies', 'relationshipHappy', 'traits', 'ageRange'];
  const missing = required.filter((key) => !String(data[key] || '').trim());
  if (missing.length) return { ok: false, code: 'INCOMPLETE_PROFILE', missing };

  const config = await getSparkConfig(guild.id);
  const channelId = /nữ|nu|female|woman/i.test(data.gender)
    ? config.femaleReviewChannelId
    : config.maleReviewChannelId;
  const reviewChannel = channelId ? await guild.channels.fetch(channelId).catch(() => null) : null;
  if (!reviewChannel?.isTextBased()) {
    return { ok: false, code: 'REVIEW_CHANNEL_UNAVAILABLE' };
  }

  const profile = {
    profileId: `SP-${randomUUID().slice(0, 8).toUpperCase()}`,
    guildId: guild.id,
    userId: user.id,
    usernameAtSubmission: user.username,
    data: clone(data),
    status: 'pending',
    submittedAt: Date.now(),
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
    matchId: null,
  };

  const profiles = await getSparkProfiles(guild.id);
  const existingIndex = profiles.findIndex((item) => item.userId === user.id);
  const previousProfile = existingIndex >= 0 ? profiles[existingIndex] : null;
  if (existingIndex >= 0) profiles[existingIndex] = profile;
  else profiles.push(profile);
  await write(SPARK_STORAGE_KEYS.profiles(guild.id), profiles);

  try {
    const { buildSparkAdminProfilePayload } = await import('./sparkMatchingUI.js');
    const message = await reviewChannel.send(buildSparkAdminProfilePayload(profile));
    profile.reviewMessageId = message.id;
    await write(SPARK_STORAGE_KEYS.profiles(guild.id), profiles);
  } catch {
    const restored = profiles.filter((item) => item.profileId !== profile.profileId);
    if (previousProfile) restored.push(previousProfile);
    await write(SPARK_STORAGE_KEYS.profiles(guild.id), restored);
    return { ok: false, code: 'REVIEW_CHANNEL_UNAVAILABLE' };
  }

  await cancelSparkRegistration(guild.id, user.id);
  return { ok: true, profile };
}

export async function reviewSparkProfile(guild, profileId, adminId, decision, reason = '', options = {}) {
  const profiles = await getSparkProfiles(guild.id);
  const profile = profiles.find((item) => item.profileId === String(profileId));
  if (!profile || profile.status !== 'pending') return { ok: false, code: 'PROFILE_NOT_PENDING' };

  profile.status = decision === 'approve' ? 'approved' : 'rejected';
  profile.reviewedAt = Date.now();
  profile.reviewedBy = String(adminId);
  profile.rejectionReason = decision === 'reject' ? String(reason).slice(0, 500) : null;
  profile.reapplyAllowed = decision === 'reject' ? options.reapplyAllowed !== false : null;
  await write(SPARK_STORAGE_KEYS.profiles(guild.id), profiles);

  const member = await guild.members.fetch(profile.userId).catch(() => null);
  if (member) {
    const payload = decision === 'approve'
      ? { content: 'Cupid đã duyệt hồ sơ Spark Matching của bạn rồi nè! Hãy kiên nhẫn chờ Cupid tìm Sparkmate phù hợp nhé.' }
      : { content: `Cupid rất tiếc phải thông báo hồ sơ chưa được duyệt.\nLý do: ${profile.rejectionReason || 'Chưa có ghi chú.'}\n${profile.reapplyAllowed ? 'Bạn có thể chỉnh sửa thông tin và đăng ký lại.' : 'Theo quyết định của đội ngũ quản trị, bạn sẽ không thể đăng ký lại Spark Matching.'}` };
    await member.send(payload).catch(() => {});
  }
  return { ok: true, profile };
}

export async function createSparkMatch(guild, userAId, userBId, options = {}) {
  if (String(userAId) === String(userBId)) return { ok: false, code: 'SAME_USER' };
  const profiles = await getSparkProfiles(guild.id);
  const a = profiles.find((item) => item.userId === String(userAId) && item.status === 'approved');
  const b = profiles.find((item) => item.userId === String(userBId) && item.status === 'approved');
  const targetProfile = profiles.find((item) => item.userId === String(userBId));
  if (options.requested && targetProfile && !['approved', 'rejected'].includes(targetProfile.status)) {
    return { ok: false, code: 'USER_BUSY' };
  }
  if (!options.test && (!a || (!b && !options.requested))) return { ok: false, code: 'PROFILE_NOT_APPROVED' };

  const busy = await Promise.all([userAId, userBId].map((id) => getSparkActiveMatchForUser(guild.id, id)));
  if (busy.some(Boolean)) return { ok: false, code: 'USER_BUSY' };

  const [memberA, memberB] = await Promise.all([
    guild.members.fetch(userAId).catch(() => null),
    guild.members.fetch(userBId).catch(() => null),
  ]);
  if (!memberA || !memberB) return { ok: false, code: 'MEMBER_NOT_FOUND' };

  const now = Date.now();
  const match = {
    matchId: `SM-${randomUUID().slice(0, 8).toUpperCase()}`,
    guildId: guild.id,
    userAId: String(userAId),
    userBId: String(userBId),
    profileSnapshots: options.test ? { userA: null, userB: null } : { userA: a ? clone(a) : null, userB: b ? clone(b) : null },
    matchType: options.matchType || (options.requested ? 'specific_request' : 'admin'),
    status: 'invited',
    inviteReady: false,
    createdAt: now,
    anonymousExpiresAt: now + (options.test ? 60 * 1000 : SPARK_MATCHING_CONFIG.anonymousChatDurationMs),
    threadExpiresAt: null,
    inviteVotes: options.requested ? { [String(userAId)]: true } : {},
    revealVotes: {},
    connectionVotes: {},
    feedbackBy: [],
    threadId: null,
    endedAt: null,
    endedReason: null,
    test: options.test === true,
  };

  const matches = await getSparkMatches(guild.id);
  matches.push(match);
  await write(SPARK_STORAGE_KEYS.matches(guild.id), matches);

  if (!options.test) {
    for (const profile of [a, b].filter(Boolean)) {
      profile.status = 'matched';
      profile.matchId = match.matchId;
    }
    await write(SPARK_STORAGE_KEYS.profiles(guild.id), profiles);
  }

  const { buildSparkMatchInvitePayload } = await import('./sparkMatchingUI.js');
  try {
    if (options.requested) {
      await memberB.send(buildSparkMatchInvitePayload(match, memberA.user));
      await memberA.send('Cupid đã gửi lời mời đến người bạn yêu cầu. Bây giờ mình sẽ chờ phản hồi của bạn ấy nhé!').catch(() => {});
    } else {
      await Promise.all([
        memberA.send(buildSparkMatchInvitePayload(match, memberB.user)),
        memberB.send(buildSparkMatchInvitePayload(match, memberA.user)),
      ]);
    }
  } catch {
    await archiveSparkMatch(guild, match, 'dm_unavailable');
    await Promise.all([memberA, memberB].map((member) =>
      member.send('Cupid chưa thể gửi lời mời đến cả hai tài khoản, nên lượt ghép đôi này đã được hủy. Bạn có thể thử lại sau nhé.').catch(() => {})
    ));
    return { ok: false, code: 'DM_UNAVAILABLE' };
  }

  match.inviteReady = true;
  const latestMatches = await getSparkMatches(guild.id);
  const matchIndex = latestMatches.findIndex((item) => item.matchId === match.matchId);
  if (matchIndex >= 0) latestMatches[matchIndex] = match;
  await write(SPARK_STORAGE_KEYS.matches(guild.id), latestMatches);

  return { ok: true, match };
}

export async function recordSparkFeedback(guildId, matchId, userId) {
  const matches = await getSparkMatches(guildId);
  const match = matches.find((item) => item.matchId === String(matchId));
  if (!match) return { ok: false, code: 'MATCH_NOT_FOUND' };
  if (!match.feedbackBy.includes(String(userId))) {
    match.feedbackBy.push(String(userId));
    await write(SPARK_STORAGE_KEYS.matches(guildId), matches);
  }
  return { ok: true, readyToClose: match.feedbackBy.length >= 1 };
}

export async function finishSparkMatch(guild, matchId, reason, endedBy = null) {
  const matches = await getSparkMatches(guild.id);
  const match = matches.find((item) => item.matchId === String(matchId));
  if (!match || match.status === 'closed') return { ok: false, code: 'MATCH_NOT_FOUND' };

  const config = await getSparkConfig(guild.id);
  const feedbackTimeoutMs = config.feedbackTimeoutMs || SPARK_MATCHING_CONFIG.feedbackTimeoutMs;

  match.status = 'feedback_pending';
  match.endedReason = reason;
  match.endedBy = endedBy ? String(endedBy) : null;
  match.endedAt = Date.now();
  match.feedbackExpiresAt = Date.now() + (match.test ? 60 * 1000 : feedbackTimeoutMs);
  const lockThread = ['early', 'admin_cancel'].includes(reason);
  match.chatLocked = lockThread;
  await write(SPARK_STORAGE_KEYS.matches(guild.id), matches);

  const { buildSparkFinalPayload } = await import('./sparkMatchingUI.js');
  const thread = match.threadId ? await guild.channels.fetch(match.threadId).catch(() => null) : null;
  if (thread?.isTextBased()) await thread.send(await buildSparkFinalPayload(match));
  if (lockThread && thread?.isThread?.()) {
    await thread.setLocked(true, 'Spark Matching kết thúc sớm; chờ feedback và thao tác xóa thread.');
  }
  return { ok: true, match };
}

export async function closeSparkMatchAfterFeedback(guild, matchId, userId, channelId = null, member = null) {
  const matches = await getSparkMatches(guild.id);
  const cleanId = String(matchId || '').trim().toUpperCase();

  let match = cleanId
    ? matches.find((item) => String(item.matchId || '').toUpperCase() === cleanId)
    : null;

  if (!match && channelId) {
    match = matches.find((item) => String(item.threadId) === String(channelId));
  }

  const history = await getSparkHistory(guild.id);
  let histMatch = null;
  if (!match) {
    histMatch = cleanId
      ? history.find((item) => String(item.matchId || '').toUpperCase() === cleanId)
      : (channelId ? history.find((item) => String(item.threadId) === String(channelId)) : null);
  }

  // Nếu match đã được đóng trước đó hoặc đã nằm trong history, vẫn đảm bảo xóa thread cho người dùng
  if (match?.status === 'closed' || histMatch) {
    const targetThreadId = match?.threadId || histMatch?.threadId || channelId;
    const thread = targetThreadId ? await guild.channels.fetch(targetThreadId).catch(() => null) : null;
    if (thread?.isThread?.()) {
      setTimeout(async () => {
        await thread.delete('Đã xóa thread Spark Matching.').catch(() => {});
      }, 1200);
    }
    return { ok: true, alreadyClosed: true };
  }

  if (!match) return { ok: false, code: 'MATCH_NOT_FOUND' };

  if (match.status !== 'feedback_pending') {
    return { ok: false, code: 'NOT_WAITING_FEEDBACK' };
  }

  const isAdmin = member ? isSparkAdmin(member) : false;
  const isParticipant = [match.userAId, match.userBId].map(String).includes(String(userId));
  if (!isParticipant && !isAdmin) {
    return { ok: false, code: 'NOT_PARTICIPANT' };
  }

  if (!match.feedbackBy?.length && !isAdmin) {
    return { ok: false, code: 'FEEDBACK_REQUIRED' };
  }

  const targetThreadId = match.threadId || channelId;
  const thread = targetThreadId ? await guild.channels.fetch(targetThreadId).catch(() => null) : null;
  if (thread?.isThread?.()) {
    setTimeout(async () => {
      await thread.delete('Đã nhận feedback Spark Matching và xóa thread.').catch(() => {});
    }, 1200);
  }

  match.status = 'closed';
  match.closedAt = Date.now();
  match.closedBy = String(userId);
  await write(SPARK_STORAGE_KEYS.matches(guild.id), matches);

  await unlockSparkProfiles(guild.id, match.matchId);

  if (!history.some((item) => item.matchId === match.matchId)) {
    history.push(clone(match));
    await write(SPARK_STORAGE_KEYS.history(guild.id), history);
  }
  return { ok: true, match };
}

export async function createSparkPublicThread(guild, match) {
  const config = await getSparkConfig(guild.id);
  const parent = await guild.channels.fetch(config.threadParentChannelId).catch(() => null);
  if (!parent?.threads?.create) return { ok: false, code: 'THREAD_CHANNEL_INVALID' };

  const thread = await parent.threads.create({
    name: `Spark · ${match.matchId}`.slice(0, 100),
    autoArchiveDuration: 10080,
    type: 12,
    reason: 'Hai thành viên đồng ý công khai danh tính Spark Matching.',
  });

  try {
    await Promise.all([
      thread.members.add(match.userAId),
      thread.members.add(match.userBId),
    ]);
  } catch {
    await thread.delete('Không thể thêm đủ thành viên vào private thread Spark Matching.').catch(() => {});
    return { ok: false, code: 'THREAD_MEMBER_ADD_FAILED' };
  }
  match.threadId = thread.id;
  match.status = 'thread';
  match.threadExpiresAt = Date.now() + (match.test ? 2 * 60 * 1000 : config.publicThreadDurationMs);
  const matches = await getSparkMatches(guild.id);
  const index = matches.findIndex((item) => item.matchId === match.matchId);
  if (index >= 0) matches[index] = match;
  await write(SPARK_STORAGE_KEYS.matches(guild.id), matches);

  return { ok: true, thread };
}

export async function expireSparkMatches(client) {
  for (const guild of client.guilds.cache.values()) {
    const matches = await getSparkMatches(guild.id);
    for (const match of matches) {
      if (['closed', 'connection_pending', 'reveal_pending'].includes(match.status)) continue;

      if (match.status === 'feedback_pending') {
        const config = await getSparkConfig(guild.id);
        const timeoutMs = config.feedbackTimeoutMs || SPARK_MATCHING_CONFIG.feedbackTimeoutMs;
        const expiry = match.feedbackExpiresAt || ((match.endedAt || 0) + timeoutMs);
        if (!expiry || expiry > Date.now()) continue;

        const guildFresh = await client.guilds.fetch(guild.id).catch(() => null);
        if (!guildFresh) continue;

        if (match.threadId) {
          const thread = await guildFresh.channels.fetch(match.threadId).catch(() => null);
          if (thread?.isThread?.()) {
            await thread.delete('Quá thời hạn gửi feedback (24h), tự động xóa thread Spark Matching.').catch(() => {});
          }
        }

        match.status = 'closed';
        match.closedAt = Date.now();
        match.endedReason = 'feedback_timeout';

        await unlockSparkProfiles(guild.id, match.matchId);

        const all = await getSparkMatches(guild.id);
        const idx = all.findIndex((item) => item.matchId === match.matchId);
        if (idx >= 0) all[idx] = match;
        await write(SPARK_STORAGE_KEYS.matches(guild.id), all);

        const history = await getSparkHistory(guild.id);
        if (!history.some((item) => item.matchId === match.matchId)) {
          history.push(clone(match));
          await write(SPARK_STORAGE_KEYS.history(guild.id), history);
        }
        continue;
      }

      const expiry = match.status === 'thread' ? match.threadExpiresAt : match.anonymousExpiresAt;
      if (!expiry || expiry > Date.now()) continue;
      const guildFresh = await client.guilds.fetch(guild.id).catch(() => null);
      if (!guildFresh) continue;
      if (match.status === 'invited') {
        await archiveSparkMatch(guildFresh, match, 'invite_timeout');
        const [a, b] = await Promise.all([
          guildFresh.members.fetch(match.userAId).catch(() => null),
          guildFresh.members.fetch(match.userBId).catch(() => null),
        ]);
        await Promise.all([a, b].filter(Boolean).map((member) => member.send('Lời mời Spark Matching đã hết hạn vì chưa nhận đủ phản hồi. Cupid đã khép lại lượt ghép đôi này nhé.').catch(() => {})));
        continue;
      } else if (match.status === 'thread') {
        const { buildSparkConnectionConfirmPayload } = await import('./sparkMatchingUI.js');
        const thread = await guildFresh.channels.fetch(match.threadId).catch(() => null);
        if (thread?.isTextBased()) await thread.send(buildSparkConnectionConfirmPayload(match));
        match.status = 'connection_pending';
      } else if (match.status === 'anonymous') {
        match.status = 'reveal_pending';
        const { buildSparkRevealPayload } = await import('./sparkMatchingUI.js');
        const [a,b] = await Promise.all([guildFresh.members.fetch(match.userAId).catch(()=>null),guildFresh.members.fetch(match.userBId).catch(()=>null)]);
        await Promise.all([a,b].filter(Boolean).map((m)=>m.send(buildSparkRevealPayload(match)).catch(()=>{})));
      }
      const all = await getSparkMatches(guild.id);
      const idx = all.findIndex((item)=>item.matchId===match.matchId);
      if(idx>=0) all[idx]=match;
      await write(SPARK_STORAGE_KEYS.matches(guild.id),all);
    }
  }
}

export function isSparkAdmin(member) {
  if (!member) return false;
  if (member.permissions?.has?.(PermissionFlagsBits.Administrator)) return true;
  if (member.memberPermissions?.has?.(PermissionFlagsBits.Administrator)) return true;
  if (member.guild?.ownerId && String(member.guild.ownerId) === String(member.user?.id || member.id)) return true;

  const roleIds = member.roles?.cache
    ? [...member.roles.cache.keys()]
    : Array.isArray(member.roles)
      ? member.roles
      : Array.isArray(member._roles)
        ? member._roles
        : [];

  return SPARK_MATCHING_CONFIG.adminRoleIds.some((id) => roleIds.includes(id));
}

export async function getSparkMatchByThread(guildId, threadId) {
  const matches = await getSparkMatches(guildId);
  return matches.find((item) => String(item.threadId) === String(threadId) && item.status !== 'closed') || null;
}

export async function endSparkMatchFromThread(guild, threadId, userId) {
  const match = await getSparkMatchByThread(guild.id, threadId);
  if (!match) return { ok: false, code: 'MATCH_NOT_FOUND' };
  if (![match.userAId, match.userBId].includes(String(userId))) {
    return { ok: false, code: 'NOT_PARTICIPANT' };
  }
  if (match.status === 'feedback_pending') return { ok: false, code: 'ALREADY_ENDING' };
  return finishSparkMatch(guild, match.matchId, 'early', userId);
}

const sparkFeedbackCounterQueues = new Map();
const sparkStickyQueues = new Map();
const sparkStickyMessageIds = new Map();

export async function nextSparkFeedbackNumber(guildId) {
  const gid = String(guildId || 'unknown');
  const prev = sparkFeedbackCounterQueues.get(gid) || Promise.resolve();

  const task = prev.then(async () => {
    const key = SPARK_STORAGE_KEYS.feedbackCounter(gid);
    const current = Number(await read(key, 0)) || 0;
    const next = current + 1;
    await write(key, next);
    return next;
  });

  sparkFeedbackCounterQueues.set(
    gid,
    task.catch(() => {}).finally(() => {
      if (sparkFeedbackCounterQueues.get(gid) === task) {
        sparkFeedbackCounterQueues.delete(gid);
      }
    }),
  );

  return task;
}

export function buildSparkFeedbackReactionSequence(feedbackNumber, digitEmojiMap = null) {
  const SPARK_FEEDBACK_REACT = '<a:heartg8:1567818755793358928>';
  const sequence = [SPARK_FEEDBACK_REACT];
  const usedIds = new Set(sequence.map(extractCustomEmojiId));
  const digits = String(Math.max(1, Number(feedbackNumber) || 1));

  for (const ch of digits) {
    const candidates = [];
    const pushCandidate = (emoji) => {
      if (!emoji) return;
      const candidateId = extractCustomEmojiId(emoji);
      if (!candidates.some((item) => extractCustomEmojiId(item) === candidateId)) {
        candidates.push(emoji);
      }
    };

    pushCandidate(FEEDBACK_DIGIT_EMOJIS[ch]);
    pushCandidate(FEEDBACK_DIGIT_EMOJIS_ALT[ch]);

    const extra = Array.isArray(digitEmojiMap?.[ch])
      ? digitEmojiMap[ch]
      : digitEmojiMap?.[ch]
        ? [digitEmojiMap[ch]]
        : [];
    for (const item of extra) {
      pushCandidate(item);
    }

    const picked = candidates.find((emoji) => emoji && !usedIds.has(extractCustomEmojiId(emoji)));
    if (picked) {
      sequence.push(picked);
      usedIds.add(extractCustomEmojiId(picked));
    }
  }

  return sequence;
}

export function isSparkedWordTypoOrPartial(rawToken) {
  const token = String(rawToken || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  if (!token || token === 'sparked') return false;
  if (token.length < 2 || token.length > 12) return false;

  if ('sparked'.startsWith(token) || ['spk', 'sprk', 'spraked', 'sparck'].includes(token)) {
    return true;
  }

  if (token.length >= 4 && damerauLevenshtein(token, 'sparked') <= 2) {
    return true;
  }

  return false;
}

export function classifySparkFeedbackMessage(rawContent) {
  const content = String(rawContent || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  if (!content) return 'ignore';

  if (/(?:^|\s)\+1\s*sparked(?=$|[\s\W])/i.test(content)) {
    return 'valid';
  }

  const candidateRegex = /(?:^|\s)(\++\s*1?|[=-]\s*1|1)\s*([a-z0-9]+)(?=$|[\s\W])/gi;
  let match;
  while ((match = candidateRegex.exec(content)) !== null) {
    const exactPlusOne = match[1] === '+1';
    const token = match[2];

    if (exactPlusOne) {
      if (isSparkedWordTypoOrPartial(token)) {
        return 'invalid_syntax';
      }
      continue;
    }

    if (token === 'sparked' || token === 'spark' || (token.length >= 4 && damerauLevenshtein(token, 'sparked') <= 2)) {
      return 'invalid_syntax';
    }
  }

  return 'ignore';
}

export async function refreshSparkFeedbackStickyMessage(channel, client) {
  if (!channel || !channel.guild || typeof channel.send !== 'function') {
    return null;
  }

  const guildId = channel.guild.id;
  const queueKey = `${guildId}:${channel.id}`;
  const prev = sparkStickyQueues.get(queueKey) || Promise.resolve();

  const task = prev.then(async () => {
    const oldMessageIds = new Set();

    const cachedId = sparkStickyMessageIds.get(channel.id);
    if (cachedId) {
      oldMessageIds.add(String(cachedId));
    }

    const storageKey = SPARK_STORAGE_KEYS.feedbackSticky(guildId);
    const dbSavedId = await read(storageKey, null);
    if (dbSavedId) {
      oldMessageIds.add(String(dbSavedId));
    }

    if (typeof channel.messages?.fetch === 'function') {
      const recent = await channel.messages.fetch({ limit: 20 }).catch(() => null);
      if (recent?.values) {
        const botId = client?.user?.id || channel.client?.user?.id;
        for (const msg of recent.values()) {
          if (botId && String(msg.author?.id) !== String(botId)) {
            continue;
          }
          let serialized = '';
          try {
            serialized = `${msg.content || ''}\n${JSON.stringify(msg.components ?? [])}`;
          } catch {
            serialized = String(msg.content || '');
          }
          if (serialized.includes(SPARK_FEEDBACK_STICKY_MARKER)) {
            oldMessageIds.add(String(msg.id));
          }
        }
      }
    }

    const sentMsg = await channel.send(buildSparkFeedbackStickyPayloadV2()).catch((err) => {
      logger.warn('[SparkMatching] Không thể gửi sticky feedback:', err?.message || err);
      return null;
    });

    if (sentMsg?.id) {
      sparkStickyMessageIds.set(channel.id, sentMsg.id);
      await write(storageKey, sentMsg.id).catch(() => {});
    }

    for (const oldId of oldMessageIds) {
      if (sentMsg?.id && String(oldId) === String(sentMsg.id)) {
        continue;
      }
      if (typeof channel.messages?.delete === 'function') {
        await channel.messages.delete(oldId).catch(() => {});
      }
    }

    return sentMsg;
  });

  sparkStickyQueues.set(
    queueKey,
    task.catch(() => {}).finally(() => {
      if (sparkStickyQueues.get(queueKey) === task) {
        sparkStickyQueues.delete(queueKey);
      }
    }),
  );

  return task;
}

async function replyAndAutoDeleteSparkMessage(message, replyText, delayMs = 5000) {
  let replyMsg = null;
  try {
    if (typeof message.reply === 'function') {
      replyMsg = await message.reply({
        content: replyText,
        allowedMentions: { repliedUser: true },
      });
    } else if (typeof message.channel?.send === 'function') {
      replyMsg = await message.channel.send({
        content: replyText,
        ...(message.id ? { reply: { messageReference: message.id } } : {}),
        allowedMentions: { repliedUser: true },
      });
    }
  } catch (replyErr) {
    logger.warn('[SparkMatching] Không thể reply cảnh báo feedback:', replyErr?.message || replyErr);
  }

  const targetMessage = message;
  const targetReply = replyMsg;

  const cleanupTimer = setTimeout(async () => {
    if (typeof targetMessage?.delete === 'function') {
      await targetMessage.delete().catch(() => {});
    } else if (targetMessage?.id && typeof targetMessage.channel?.messages?.delete === 'function') {
      await targetMessage.channel.messages.delete(targetMessage.id).catch(() => {});
    }

    if (typeof targetReply?.delete === 'function') {
      await targetReply.delete().catch(() => {});
    } else if (targetReply?.id && typeof targetMessage?.channel?.messages?.delete === 'function') {
      await targetMessage.channel.messages.delete(targetReply.id).catch(() => {});
    }
  }, delayMs);

  cleanupTimer.unref?.();
}

export async function handleSparkFeedbackMessage(message, client) {
  if (!message?.guild || message.author?.bot) return false;
  const content = String(message.content || '').trim();
  if (!content) return false;

  const config = await getSparkConfig(message.guild.id);
  if (String(message.channelId) !== String(config.feedbackChannelId)) return false;

  const classification = classifySparkFeedbackMessage(content);
  if (classification === 'ignore') {
    return false;
  }

  if (classification === 'invalid_syntax') {
    await replyAndAutoDeleteSparkMessage(
      message,
      '<a:bang2:1546891483250954290> Bạn ơi chưa đúng cú pháp nè, bạn vui lòng nhắn theo mẫu `+1 sparked` để bot dễ xử lý nhé!',
      5000,
    );
    return true;
  }

  const matches = await getSparkMatches(message.guild.id);
  const pendingMatches = matches.filter((item) =>
    item.status === 'feedback_pending' &&
    [item.userAId, item.userBId].map(String).includes(String(message.author.id))
  );

  const isAdmin = isSparkAdmin(message.member);

  if (pendingMatches.length === 0 && !isAdmin) {
    await replyAndAutoDeleteSparkMessage(
      message,
      '<a:bang2:1546891483250954290> Xin lỗi, bạn hiện không có lượt ghép đôi nào đang chờ feedback. Mình sẽ tự động xóa tin nhắn sau 5 giây!',
      5000,
    );
    return true;
  }

  // 1. Tăng bộ đếm và thả emoji react
  const sparkNumber = await nextSparkFeedbackNumber(message.guild.id);
  const botClient = client || message.client;
  const digitEmojiMap = await resolveGuildDigitEmojiMap(message.guild, botClient).catch(() => null);
  const reactionSequence = buildSparkFeedbackReactionSequence(sparkNumber, digitEmojiMap);

  for (const emoji of reactionSequence) {
    await message.react(emoji).catch((err) => {
      logger.warn('[SparkMatching] Không thể auto react feedback:', {
        emoji,
        error: err?.message || err,
      });
    });
  }

  // 2. Làm mới sticky message Components V2
  await refreshSparkFeedbackStickyMessage(message.channel, botClient).catch((err) => {
    logger.warn('[SparkMatching] Không thể làm mới sticky feedback:', err?.message || err);
  });

  // 3. Ghi nhận feedback vào tất cả các match đang chờ feedback của thành viên này
  for (const activeMatch of pendingMatches) {
    if (!Array.isArray(activeMatch.feedbackBy)) activeMatch.feedbackBy = [];
    if (!activeMatch.feedbackBy.includes(String(message.author.id))) {
      activeMatch.feedbackBy.push(String(message.author.id));
      activeMatch.feedbackMessageIds = [...(activeMatch.feedbackMessageIds || []), message.id];
    }
  }
  if (pendingMatches.length > 0) {
    await write(SPARK_STORAGE_KEYS.matches(message.guild.id), matches);
  }

  return true;
}

async function saveSparkMatchList(guildId, matches) {
  await write(SPARK_STORAGE_KEYS.matches(guildId), matches);
}

async function unlockSparkProfiles(guildId, matchId) {
  const profiles = await getSparkProfiles(guildId);
  for (const profile of profiles) {
    if (profile.matchId === matchId) {
      profile.status = 'approved';
      profile.matchId = null;
    }
  }
  await write(SPARK_STORAGE_KEYS.profiles(guildId), profiles);
}

async function archiveSparkMatch(guild, match, reason) {
  match.status = 'closed';
  match.endedAt = Date.now();
  match.endedReason = reason;
  const matches = await getSparkMatches(guild.id);
  const index = matches.findIndex((item) => item.matchId === match.matchId);
  if (index >= 0) matches[index] = match;
  await saveSparkMatchList(guild.id, matches);
  await unlockSparkProfiles(guild.id, match.matchId);
  const history = await getSparkHistory(guild.id);
  history.push(clone(match));
  await write(SPARK_STORAGE_KEYS.history(guild.id), history);
}

export async function respondSparkInvite(guild, matchId, userId, accepted) {
  const matches = await getSparkMatches(guild.id);
  const match = matches.find((item) => item.matchId === String(matchId));
  if (!match || match.status !== 'invited') return { ok: false, code: 'INVITE_EXPIRED' };
  if (match.inviteReady === false) return { ok: false, code: 'INVITE_NOT_READY' };
  if (![match.userAId, match.userBId].includes(String(userId))) return { ok: false, code: 'NOT_PARTICIPANT' };

  match.inviteVotes = match.inviteVotes || {};
  if (!accepted) {
    const otherId = match.userAId === String(userId) ? match.userBId : match.userAId;
    await archiveSparkMatch(guild, match, 'invite_declined');
    const other = await guild.members.fetch(otherId).catch(() => null);
    await other?.send('Sparkmate đã từ chối lời mời trò chuyện. Cupid đã khép lại lượt ghép đôi này; bạn có thể tiếp tục đăng ký hoặc chờ một Sparkmate khác nhé.').catch(() => {});
    return { ok: true, declined: true };
  }

  match.inviteVotes[String(userId)] = true;
  if (match.inviteVotes[match.userAId] && match.inviteVotes[match.userBId]) {
    match.status = 'anonymous';
    match.anonymousStartedAt = Date.now();
    const config = await getSparkConfig(guild.id);
    match.anonymousExpiresAt = Date.now() + (match.test ? 60 * 1000 : config.anonymousChatDurationMs);
    const all = await getSparkMatches(guild.id);
    const index = all.findIndex((item) => item.matchId === match.matchId);
    if (index >= 0) all[index] = match;
    await saveSparkMatchList(guild.id, all);
    const { buildSparkAnonymousChatPayload } = await import('./sparkMatchingUI.js');
    const [a, b] = await Promise.all([
      guild.members.fetch(match.userAId).catch(() => null),
      guild.members.fetch(match.userBId).catch(() => null),
    ]);
    await Promise.all([a, b].filter(Boolean).map((member) => member.send(buildSparkAnonymousChatPayload(match)).catch(() => {})));
    return { ok: true, started: true, match };
  }

  await saveSparkMatchList(guild.id, matches);
  return { ok: true, waiting: true };
}

export async function submitSparkRevealVote(guild, matchId, userId, agreed) {
  const matches = await getSparkMatches(guild.id);
  const match = matches.find((item) => item.matchId === String(matchId));
  if (!match || match.status !== 'reveal_pending') return { ok: false, code: 'NOT_REVEAL_PENDING' };
  if (![match.userAId, match.userBId].includes(String(userId))) return { ok: false, code: 'NOT_PARTICIPANT' };

  match.revealVotes = match.revealVotes || {};
  match.revealVotes[String(userId)] = Boolean(agreed);
  if (!agreed) {
    const [a, b] = await Promise.all([
      guild.members.fetch(match.userAId).catch(() => null),
      guild.members.fetch(match.userBId).catch(() => null),
    ]);
    await Promise.all([a, b].filter(Boolean).map((member) => member.send('Có vẻ như hai bạn chưa đủ duyên để cùng tiếp tục hành trình này. Cảm ơn bạn đã dành thời gian trò chuyện cùng Cupid nhé!').catch(() => {})));
    await archiveSparkMatch(guild, match, 'reveal_declined');
    return { ok: true, ended: true };
  }

  if (match.revealVotes[match.userAId] && match.revealVotes[match.userBId]) {
    const result = await createSparkPublicThread(guild, match);
    if (!result.ok) return result;
    const { buildSparkThreadWelcomePayload } = await import('./sparkMatchingUI.js');
    await result.thread.send(buildSparkThreadWelcomePayload(match, `https://discord.com/channels/${guild.id}/${result.thread.id}`));
    const [memberA, memberB] = await Promise.all([
      guild.members.fetch(match.userAId).catch(() => null),
      guild.members.fetch(match.userBId).catch(() => null),
    ]);
    const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = await import('discord.js');
    const threadLinkRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setLabel('Đến Thread').setStyle(ButtonStyle.Link).setURL(`https://discord.com/channels/${guild.id}/${result.thread.id}`),
    );
    await Promise.all([memberA, memberB].filter(Boolean).map((member) =>
      member.send({
        content: 'Cả hai đã đồng ý công khai danh tính! Cupid đã tạo thread riêng cho hai bạn.',
        components: [threadLinkRow],
      }).catch(() => {})
    ));
    return { ok: true, thread: result.thread };
  }

  const index = matches.findIndex((item) => item.matchId === match.matchId);
  if (index >= 0) matches[index] = match;
  await saveSparkMatchList(guild.id, matches);
  return { ok: true, waiting: true };
}

export async function submitSparkConnectionVote(guild, matchId, userId, agreed) {
  const matches = await getSparkMatches(guild.id);
  const match = matches.find((item) => item.matchId === String(matchId));
  if (!match || !['thread', 'connection_pending'].includes(match.status)) return { ok: false, code: 'NOT_CONNECTION_PENDING' };
  if (![match.userAId, match.userBId].includes(String(userId))) return { ok: false, code: 'NOT_PARTICIPANT' };

  match.connectionVotes = match.connectionVotes || {};
  match.connectionVotes[String(userId)] = Boolean(agreed);
  const index = matches.findIndex((item) => item.matchId === match.matchId);
  if (index >= 0) matches[index] = match;
  await saveSparkMatchList(guild.id, matches);

  if (!agreed) {
    await finishSparkMatch(guild, match.matchId, 'connection_declined', userId);
    return { ok: true, ended: true };
  }
  if (match.connectionVotes[match.userAId] && match.connectionVotes[match.userBId]) {
    await finishSparkMatch(guild, match.matchId, 'connection_accepted', userId);
    return { ok: true, connected: true };
  }
  return { ok: true, waiting: true };
}

export async function handleSparkAnonymousMessage(message, client) {
  if (message.author?.bot || message.guild) return false;
  for (const guild of client.guilds.cache.values()) {
    const matches = await getSparkMatches(guild.id);
    const match = matches.find((item) =>
      item.status === 'anonymous' &&
      [item.userAId, item.userBId].includes(String(message.author.id))
    );
    if (!match) continue;

    const recipientId = match.userAId === String(message.author.id) ? match.userBId : match.userAId;
    const recipient = await client.users.fetch(recipientId).catch(() => null);
    if (!recipient) {
      await message.reply('Cupid chưa thể chuyển tin nhắn vì đối phương không nhận được DM.').catch(() => {});
      return true;
    }

    const attachmentLines = [...message.attachments.values()].map((attachment) => attachment.url);
    const safeText = String(message.content || '')
      .replace(/<@!?\d+>/g, '[mention]')
      .replace(/<@&\d+>/g, '[role mention]')
      .replace(/@everyone|@here/gi, '[everyone]');
    const content = [safeText.trim(), ...attachmentLines].filter(Boolean).join('\n');
    const { buildSparkIncomingMessagePayload } = await import('./sparkMatchingUI.js');
    await recipient.send({
      ...buildSparkIncomingMessagePayload(match, content || '[Tin nhắn đính kèm]'),
      allowedMentions: { parse: [] },
    }).catch(async () => {
      await message.reply('Cupid không thể chuyển tin nhắn. Có thể đối phương đã tắt DM.').catch(() => {});
    });
    return true;
  }
  return false;
}

export async function sendSparkAnonymousReply(guildId, matchId, senderId, content, client) {
  const matches = await getSparkMatches(guildId);
  const match = matches.find((item) => item.matchId === String(matchId) && item.status === 'anonymous');
  if (!match || ![match.userAId, match.userBId].includes(String(senderId))) return { ok: false };
  const recipientId = match.userAId === String(senderId) ? match.userBId : match.userAId;
  const recipient = await client.users.fetch(recipientId).catch(() => null);
  if (!recipient) return { ok: false };
  const { buildSparkIncomingMessagePayload } = await import('./sparkMatchingUI.js');
  await recipient.send(buildSparkIncomingMessagePayload(match, String(content).slice(0, 1800))).catch(() => {});
  return { ok: true };
}

export async function endSparkAnonymousChat(guild, matchId, userId) {
  const matches = await getSparkMatches(guild.id);
  const match = matches.find((item) => item.matchId === String(matchId) && item.status === 'anonymous');
  if (!match || ![match.userAId, match.userBId].includes(String(userId))) return { ok: false };
  const [a, b] = await Promise.all([
    guild.members.fetch(match.userAId).catch(() => null),
    guild.members.fetch(match.userBId).catch(() => null),
  ]);
  await Promise.all([a, b].filter(Boolean).map((member) => member.send('Cuộc trò chuyện ẩn danh đã kết thúc vì một trong hai bên đã ấn nút "Kết Thúc". Cảm ơn hai bạn đã tham gia Spark Matching, chúc hai bạn tìm được Sparkmate phù hợp hơn cho riêng mình nhé!').catch(() => {})));
  await archiveSparkMatch(guild, match, 'anonymous_ended');
  return { ok: true };
}

export async function getSparkAdminMatchSelection(guildId, adminId) {
  return read(`spark:admin-match-select:${guildId}:${adminId}`, {
    maleId: null, femaleId: null, malePage: 0, femalePage: 0,
  });
}

export async function updateSparkAdminMatchSelection(guildId, adminId, patch) {
  const current = await getSparkAdminMatchSelection(guildId, adminId);
  const next = { ...current, ...patch, updatedAt: Date.now() };
  await write(`spark:admin-match-select:${guildId}:${adminId}`, next);
  return next;
}

export async function cancelSparkMatchByAdmin(guild, matchId, adminId) {
  const matches = await getSparkMatches(guild.id);
  const match = matches.find((item) => item.matchId === String(matchId));
  if (!match || match.status === 'closed') return { ok: false, code: 'MATCH_NOT_FOUND' };
  if (match.status === 'feedback_pending') return { ok: false, code: 'ALREADY_FEEDBACK_PENDING' };

  if (match.threadId && ['thread', 'connection_pending'].includes(match.status)) {
    await finishSparkMatch(guild, match.matchId, 'admin_cancel', adminId);
    return { ok: true, feedbackPending: true };
  }

  const [a, b] = await Promise.all([
    guild.members.fetch(match.userAId).catch(() => null),
    guild.members.fetch(match.userBId).catch(() => null),
  ]);
  await Promise.all([a, b].filter(Boolean).map((member) => member.send('Cupid xin thông báo lượt ghép đôi hiện đã được admin kết thúc. Cảm ơn bạn đã tham gia Spark Matching nhé!').catch(() => {})));
  await archiveSparkMatch(guild, match, 'admin_cancel');
  return { ok: true, feedbackPending: false };
}

export async function setSparkAdminNote(guildId, matchId, adminId, note) {
  const matches = await getSparkMatches(guildId);
  const activeIndex = matches.findIndex((item) => item.matchId === String(matchId));
  if (activeIndex >= 0) {
    matches[activeIndex].adminNotes = String(note).slice(0, 1000);
    matches[activeIndex].adminNoteUpdatedBy = String(adminId);
    matches[activeIndex].adminNoteUpdatedAt = Date.now();
    await write(SPARK_STORAGE_KEYS.matches(guildId), matches);
    return { ok: true };
  }
  const history = await getSparkHistory(guildId);
  const historyIndex = history.findIndex((item) => item.matchId === String(matchId));
  if (historyIndex >= 0) {
    history[historyIndex].adminNotes = String(note).slice(0, 1000);
    history[historyIndex].adminNoteUpdatedBy = String(adminId);
    history[historyIndex].adminNoteUpdatedAt = Date.now();
    await write(SPARK_STORAGE_KEYS.history(guildId), history);
    return { ok: true };
  }
  return { ok: false, code: 'MATCH_NOT_FOUND' };
}

export async function deleteSparkHistory(guildId, options = {}) {
  const { matchId, scope } = options;
  const history = await getSparkHistory(guildId);
  const matches = await getSparkMatches(guildId);

  const targetIds = new Set();

  if (matchId) {
    const cleanId = String(matchId).trim().toUpperCase();
    const foundInHistory = history.some((item) => String(item.matchId).toUpperCase() === cleanId);
    const foundInClosedMatches = matches.some((item) => String(item.matchId).toUpperCase() === cleanId && item.status === 'closed');
    const isActive = matches.some((item) => String(item.matchId).toUpperCase() === cleanId && item.status !== 'closed');

    if (isActive) {
      return { ok: false, code: 'MATCH_STILL_ACTIVE' };
    }
    if (!foundInHistory && !foundInClosedMatches) {
      return { ok: false, code: 'MATCH_NOT_FOUND' };
    }
    targetIds.add(cleanId);
  } else if (scope === 'test_only') {
    for (const item of history) {
      if (item.test === true || item.matchType === 'admin_test') {
        if (item.matchId) targetIds.add(String(item.matchId).toUpperCase());
      }
    }
    for (const item of matches) {
      if ((item.test === true || item.matchType === 'admin_test') && item.status === 'closed') {
        if (item.matchId) targetIds.add(String(item.matchId).toUpperCase());
      }
    }
  } else if (scope === 'failed_only') {
    for (const item of history) {
      if (item.endedReason !== 'connection_accepted') {
        if (item.matchId) targetIds.add(String(item.matchId).toUpperCase());
      }
    }
    for (const item of matches) {
      if (item.status === 'closed' && item.endedReason !== 'connection_accepted') {
        if (item.matchId) targetIds.add(String(item.matchId).toUpperCase());
      }
    }
  } else if (scope === 'all_closed') {
    for (const item of history) {
      if (item.matchId) targetIds.add(String(item.matchId).toUpperCase());
    }
    for (const item of matches) {
      if (item.status === 'closed') {
        if (item.matchId) targetIds.add(String(item.matchId).toUpperCase());
      }
    }
  } else {
    return { ok: false, code: 'INVALID_OPTIONS' };
  }

  if (targetIds.size === 0) {
    return { ok: true, deletedCount: 0, deletedIds: [] };
  }

  const newHistory = history.filter((item) => !targetIds.has(String(item.matchId).toUpperCase()));
  const newMatches = matches.filter((item) => !(targetIds.has(String(item.matchId).toUpperCase()) && item.status === 'closed'));

  await write(SPARK_STORAGE_KEYS.history(guildId), newHistory);
  await write(SPARK_STORAGE_KEYS.matches(guildId), newMatches);

  return { ok: true, deletedCount: targetIds.size, deletedIds: Array.from(targetIds) };
}
