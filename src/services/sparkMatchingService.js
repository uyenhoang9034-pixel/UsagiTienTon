import { db } from '../utils/database/wrapper.js';
import {
  SPARK_MATCHING_CONFIG,
  SPARK_STORAGE_KEYS,
  getDefaultSparkGuildConfig,
} from '../config/sparkMatchingConfig.js';

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
    ['invited', 'anonymous', 'reveal_pending', 'thread', 'connection_pending', 'feedback_pending'].includes(item.status) &&
    [item.userAId, item.userBId, item.requestedUserId].filter(Boolean).includes(String(userId))
  ) || null;
}

export async function beginSparkRegistration(guild, member) {
  const config = await getSparkConfig(guild.id);
  if (!config.enabled || !config.registrationEnabled) {
    return { ok: false, code: 'REGISTRATION_DISABLED' };
  }

  const existingProfile = await getSparkProfile(guild.id, member.id);
  const activeMatch = await getSparkActiveMatchForUser(guild.id, member.id);
  if (existingProfile && ['pending', 'approved', 'matched'].includes(existingProfile.status)) {
    return { ok: false, code: 'PROFILE_EXISTS' };
  }
  if (existingProfile?.status === 'rejected' && existingProfile.reapplyAllowed === false) {
    return { ok: false, code: 'REAPPLY_BLOCKED' };
  }
  if (activeMatch) return { ok: false, code: 'ACTIVE_MATCH' };

  const sessions = await read(SPARK_STORAGE_KEYS.sessions(guild.id), {});
  sessions[member.id] = {
    userId: member.id,
    guildId: guild.id,
    step: 1,
    data: {},
    startedAt: Date.now(),
  };
  await write(SPARK_STORAGE_KEYS.sessions(guild.id), sessions);

  const role = await guild.roles.fetch(config.memberRoleId).catch(() => null);
  if (!role) return { ok: false, code: 'ROLE_NOT_FOUND' };
  await member.roles.add(role, 'Đăng ký tham gia Spark Matching');

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

  const profile = {
    profileId: `SP-${Date.now().toString(36).toUpperCase()}`,
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
  if (existingIndex >= 0) profiles[existingIndex] = profile;
  else profiles.push(profile);
  await write(SPARK_STORAGE_KEYS.profiles(guild.id), profiles);
  await cancelSparkRegistration(guild.id, user.id);

  const config = await getSparkConfig(guild.id);
  const channelId = /nữ|female|woman/i.test(data.gender)
    ? config.femaleReviewChannelId
    : config.maleReviewChannelId;
  const reviewChannel = channelId ? await guild.channels.fetch(channelId).catch(() => null) : null;

  if (reviewChannel?.isTextBased()) {
    const { buildSparkAdminProfilePayload } = await import('./sparkMatchingUI.js');
    const message = await reviewChannel.send(buildSparkAdminProfilePayload(profile));
    profile.reviewMessageId = message.id;
    await write(SPARK_STORAGE_KEYS.profiles(guild.id), profiles.map((item) =>
      item.profileId === profile.profileId ? profile : item
    ));
  }

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
    matchId: `SM-${now.toString(36).toUpperCase()}`,
    guildId: guild.id,
    userAId: String(userAId),
    userBId: String(userBId),
    matchType: options.matchType || (options.requested ? 'specific_request' : 'admin'),
    status: 'invited',
    createdAt: now,
    anonymousExpiresAt: now + SPARK_MATCHING_CONFIG.anonymousChatDurationMs,
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

  const { buildSparkMatchInvitePayload } = await import('./sparkMatchingUI.js');
  try {
    if (options.requested) {
      await memberB.send(buildSparkMatchInvitePayload(match, memberA.user));
    } else {
      await Promise.all([
        memberA.send(buildSparkMatchInvitePayload(match, memberB.user)),
        memberB.send(buildSparkMatchInvitePayload(match, memberA.user)),
      ]);
    }
  } catch {
    return { ok: false, code: 'DM_UNAVAILABLE' };
  }

  const matches = await getSparkMatches(guild.id);
  matches.push(match);
  await write(SPARK_STORAGE_KEYS.matches(guild.id), matches);

  for (const profile of [a, b].filter(Boolean)) {
    profile.status = 'matched';
    profile.matchId = match.matchId;
  }
  await write(SPARK_STORAGE_KEYS.profiles(guild.id), profiles);

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

  match.status = 'feedback_pending';
  match.endedReason = reason;
  match.endedBy = endedBy ? String(endedBy) : null;
  match.endedAt = Date.now();
  match.chatLocked = true;
  await write(SPARK_STORAGE_KEYS.matches(guild.id), matches);

  const { buildSparkFinalPayload } = await import('./sparkMatchingUI.js');
  const thread = match.threadId ? await guild.channels.fetch(match.threadId).catch(() => null) : null;
  if (thread?.isTextBased()) await thread.send(buildSparkFinalPayload(match));
  if (thread?.isThread?.()) {
    await thread.setLocked(true, 'Spark Matching kết thúc; chờ feedback và thao tác đóng thread.');
  }
  return { ok: true, match };
}

export async function closeSparkMatchAfterFeedback(guild, matchId, userId) {
  const matches = await getSparkMatches(guild.id);
  const match = matches.find((item) => item.matchId === String(matchId));
  if (!match || match.status !== 'feedback_pending') return { ok: false, code: 'NOT_WAITING_FEEDBACK' };
  if (!match.feedbackBy?.length) return { ok: false, code: 'FEEDBACK_REQUIRED' };
  if (![match.userAId, match.userBId].includes(String(userId))) return { ok: false, code: 'NOT_PARTICIPANT' };

  const thread = match.threadId ? await guild.channels.fetch(match.threadId).catch(() => null) : null;
  if (thread?.isThread?.()) await thread.setArchived(true, 'Đã nhận feedback Spark Matching.');

  match.status = 'closed';
  match.closedAt = Date.now();
  await write(SPARK_STORAGE_KEYS.matches(guild.id), matches);

  const profiles = await getSparkProfiles(guild.id);
  for (const profile of profiles) {
    if (profile.matchId === match.matchId) {
      profile.status = 'rejected';
      profile.matchId = null;
    }
  }
  await write(SPARK_STORAGE_KEYS.profiles(guild.id), profiles);

  const history = await getSparkHistory(guild.id);
  history.push(clone(match));
  await write(SPARK_STORAGE_KEYS.history(guild.id), history);
  return { ok: true };
}

export async function createSparkPublicThread(guild, match) {
  const config = await getSparkConfig(guild.id);
  const parent = await guild.channels.fetch(config.threadParentChannelId).catch(() => null);
  if (!parent?.threads?.create) return { ok: false, code: 'THREAD_CHANNEL_INVALID' };

  const thread = await parent.threads.create({
    name: `Spark · ${match.matchId}`.slice(0, 100),
    autoArchiveDuration: 1440,
    type: 12,
    reason: 'Hai thành viên đồng ý công khai danh tính Spark Matching.',
  });

  await thread.members.add(match.userAId).catch(() => {});
  await thread.members.add(match.userBId).catch(() => {});
  match.threadId = thread.id;
  match.status = 'thread';
  match.threadExpiresAt = Date.now() + config.publicThreadDurationMs;
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
      if (match.status === 'closed' || match.status === 'feedback_pending') continue;
      const expiry = match.status === 'thread' ? match.threadExpiresAt : match.anonymousExpiresAt;
      if (!expiry || expiry > Date.now()) continue;
      const guildFresh = await client.guilds.fetch(guild.id).catch(() => null);
      if (!guildFresh) continue;
      if (match.status === 'thread') {
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
  if (member?.permissions?.has?.('Administrator')) return true;
  const roles = member?.roles?.cache;
  return SPARK_MATCHING_CONFIG.adminRoleIds.some((id) => roles?.has?.(id));
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

export async function handleSparkFeedbackMessage(message) {
  if (!message.guild || message.author?.bot) return false;
  const config = await getSparkConfig(message.guild.id);
  if (String(message.channelId) !== String(config.feedbackChannelId)) return false;

  const matches = await getSparkMatches(message.guild.id);
  const match = matches.find((item) =>
    item.status === 'feedback_pending' &&
    [item.userAId, item.userBId].includes(String(message.author.id))
  );
  if (!match) return false;

  if (!Array.isArray(match.feedbackBy)) match.feedbackBy = [];
  if (!match.feedbackBy.includes(String(message.author.id))) {
    match.feedbackBy.push(String(message.author.id));
    match.feedbackMessageIds = [...(match.feedbackMessageIds || []), message.id];
    await write(SPARK_STORAGE_KEYS.matches(message.guild.id), matches);
  }

  await message.reply('Cupid đã nhận feedback của bạn rồi nè! Bây giờ một trong hai bạn có thể quay lại thread và nhấn **Đóng Thread** nhé.').catch(() => {});
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
    match.anonymousExpiresAt = Date.now() + config.anonymousChatDurationMs;
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
    await result.thread.send({
      content: 'Chào mừng hai bạn đến với không gian riêng của Sparkmate! Danh tính của hai bạn đã được công khai theo sự đồng ý của cả hai.',
      allowedMentions: { users: [match.userAId, match.userBId] },
    });
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
    const content = [message.content?.trim(), ...attachmentLines].filter(Boolean).join('\n');
    const { buildSparkIncomingMessagePayload } = await import('./sparkMatchingUI.js');
    await recipient.send(buildSparkIncomingMessagePayload(match, content || '[Tin nhắn đính kèm]')).catch(async () => {
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
  await Promise.all([a, b].filter(Boolean).map((member) => member.send('Cuộc trò chuyện ẩn danh đã kết thúc. Cảm ơn bạn đã tham gia Spark Matching nhé!').catch(() => {})));
  await archiveSparkMatch(guild, match, 'anonymous_ended');
  return { ok: true };
}
