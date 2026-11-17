import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} from 'discord.js';
import { db } from '../utils/database/wrapper.js';
import { logger } from '../utils/logger.js';
import {
  SPARK_MATCHING_CONFIG,
  SPARK_STORAGE_KEYS,
} from '../config/sparkMatchingConfig.js';
import {
  getSparkConfig,
  getSparkMatches,
  isSparkAdmin,
} from './sparkMatchingService.js';
import {
  buildSparkBoardPostPayload,
  buildSparkBoardCommentsNoticePayload,
  buildSparkBoardApprovedDm,
  buildSparkBoardRejectedDm,
  buildSparkBoardCommentNotificationDm,
  buildSparkBoardConnectionPromptDm,
} from './sparkBoardUI.js';
import { buildSparkThreadWelcomePayload } from './sparkMatchingUI.js';

async function read(key, fallback) {
  const value = await db.get(key, fallback);
  return value ?? fallback;
}

async function write(key, value) {
  await db.set(key, value);
  return value;
}

function padCode(num, length = 3) {
  return String(num).padStart(length, '0');
}

export async function getSparkBoardSubmissions(guildId) {
  return read(SPARK_STORAGE_KEYS.boardSubmissions(guildId), []);
}

export async function saveSparkBoardSubmissions(guildId, submissions) {
  await write(SPARK_STORAGE_KEYS.boardSubmissions(guildId), submissions);
}

export async function getSparkBoardPosts(guildId) {
  return read(SPARK_STORAGE_KEYS.boardPosts(guildId), []);
}

export async function saveSparkBoardPosts(guildId, posts) {
  await write(SPARK_STORAGE_KEYS.boardPosts(guildId), posts);
}

export async function getSparkBoardConnections(guildId) {
  return read(SPARK_STORAGE_KEYS.boardConnections(guildId), []);
}

export async function saveSparkBoardConnections(guildId, connections) {
  await write(SPARK_STORAGE_KEYS.boardConnections(guildId), connections);
}

export async function nextSparkBoardCode(guildId) {
  const key = SPARK_STORAGE_KEYS.boardCounter(guildId);
  const current = Number(await read(key, 0)) || 0;
  const next = current + 1;
  await write(key, next);
  return padCode(next, 3);
}

export async function saveSparkBoardDraft(guildId, userId, data) {
  const key = SPARK_STORAGE_KEYS.boardDraft(guildId, userId);
  const current = (await read(key, null)) || {};
  const updated = { ...current, ...data, updatedAt: Date.now() };
  await write(key, updated);
  return updated;
}

export async function getSparkBoardDraft(guildId, userId) {
  return read(SPARK_STORAGE_KEYS.boardDraft(guildId, userId), null);
}

export async function clearSparkBoardDraft(guildId, userId) {
  await write(SPARK_STORAGE_KEYS.boardDraft(guildId, userId), null);
}

export async function submitSparkBoardProfile(guild, member, fullData) {
  const guildId = guild.id;
  const posts = await getSparkBoardPosts(guildId);
  const existingActivePost = posts.find(
    (p) => String(p.userId) === String(member.id) && p.status === 'active'
  );
  if (existingActivePost) {
    return { ok: false, code: 'ALREADY_HAS_ACTIVE_POST', post: existingActivePost };
  }

  const submissions = await getSparkBoardSubmissions(guildId);
  const pending = submissions.find(
    (s) => String(s.userId) === String(member.id) && s.status === 'pending'
  );
  if (pending) {
    return { ok: false, code: 'ALREADY_PENDING_REVIEW', submission: pending };
  }

  const code = await nextSparkBoardCode(guildId);
  const submissionId = `SB-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

  const submission = {
    id: submissionId,
    code,
    userId: String(member.id),
    username: member.user?.tag || member.displayName || 'Member',
    alias: fullData.alias,
    age: fullData.age,
    gender: fullData.gender,
    seeking: fullData.seeking,
    about: fullData.about,
    relationship: fullData.relationship,
    ideal: fullData.ideal,
    message: fullData.message || '',
    status: 'pending',
    createdAt: Date.now(),
  };

  const config = await getSparkConfig(guildId);
  const reviewChannelId = config.boardReviewChannelId || SPARK_MATCHING_CONFIG.boardReviewChannelId;
  const reviewChannel = await guild.channels.fetch(reviewChannelId).catch(() => null);

  if (!reviewChannel?.isTextBased?.()) {
    logger.error('[SparkBoard] Review channel not found or invalid:', reviewChannelId);
    return { ok: false, code: 'REVIEW_CHANNEL_NOT_FOUND' };
  }

  const { buildSparkBoardReviewPayload } = await import('./sparkBoardUI.js');
  const reviewMsg = await reviewChannel.send(buildSparkBoardReviewPayload(submission, member));
  submission.reviewMessageId = reviewMsg.id;

  submissions.push(submission);
  await saveSparkBoardSubmissions(guildId, submissions);
  await clearSparkBoardDraft(guildId, member.id);

  return { ok: true, submission };
}

export async function approveSparkBoardSubmission(guild, submissionId, adminUser) {
  const guildId = guild.id;
  const submissions = await getSparkBoardSubmissions(guildId);
  const submission = submissions.find((s) => s.id === String(submissionId));
  if (!submission || submission.status !== 'pending') {
    return { ok: false, code: 'SUBMISSION_NOT_PENDING' };
  }

  // 1. Cấp role thành viên Spark
  const config = await getSparkConfig(guildId);
  const memberRoleId = config.memberRoleId || SPARK_MATCHING_CONFIG.memberRoleId;
  const member = await guild.members.fetch(submission.userId).catch(() => null);
  if (member && memberRoleId) {
    await member.roles.add(memberRoleId).catch((err) => {
      logger.warn('[SparkBoard] Không thể cấp role Spark cho member:', err?.message || err);
    });
  }

  // 2. Đăng bài vào Forum
  const forumChannelId = config.boardForumChannelId || SPARK_MATCHING_CONFIG.boardForumChannelId;
  const forumChannel = await guild.channels.fetch(forumChannelId).catch(() => null);
  if (!forumChannel || forumChannel.type !== ChannelType.GuildForum) {
    logger.error('[SparkBoard] Kênh diễn đàn Forum không hợp lệ:', forumChannelId);
    return { ok: false, code: 'FORUM_CHANNEL_INVALID' };
  }

  const postId = submission.id;
  const post = {
    id: postId,
    code: submission.code,
    userId: submission.userId,
    username: submission.username,
    alias: submission.alias,
    age: submission.age,
    gender: submission.gender,
    seeking: submission.seeking,
    about: submission.about,
    relationship: submission.relationship,
    ideal: submission.ideal,
    message: submission.message,
    status: 'active',
    commentCounter: 0,
    approvedBy: adminUser.id,
    approvedAt: Date.now(),
    createdAt: Date.now(),
  };

  const thread = await forumChannel.threads.create({
    name: `Sparkmate #${post.code} · ${post.alias}`.slice(0, 100),
    autoArchiveDuration: 10080,
    message: buildSparkBoardPostPayload(post),
    reason: `Duyệt hồ sơ Spark Board bởi ${adminUser.tag}`,
  });

  post.threadId = thread.id;

  // Gửi tin nhắn khu vực thảo luận & quản lý hồ sơ vào thread
  const noticeMsg = await thread.send(buildSparkBoardCommentsNoticePayload(post)).catch(() => null);
  if (noticeMsg) {
    post.noticeMessageId = noticeMsg.id;
  }

  // Lưu post
  const posts = await getSparkBoardPosts(guildId);
  posts.push(post);
  await saveSparkBoardPosts(guildId, posts);

  // Cập nhật submission
  submission.status = 'approved';
  submission.approvedBy = adminUser.id;
  submission.approvedAt = Date.now();
  submission.postId = postId;
  submission.threadId = thread.id;
  await saveSparkBoardSubmissions(guildId, submissions);

  // Gửi DM cho thành viên
  if (member) {
    const threadUrl = `https://discord.com/channels/${guild.id}/${thread.id}`;
    await member.send(buildSparkBoardApprovedDm(post, thread.id, threadUrl)).catch(() => {});
  }

  return { ok: true, post, thread };
}

export async function rejectSparkBoardSubmission(guild, submissionId, adminUser, reason) {
  const guildId = guild.id;
  const submissions = await getSparkBoardSubmissions(guildId);
  const submission = submissions.find((s) => s.id === String(submissionId));
  if (!submission || submission.status !== 'pending') {
    return { ok: false, code: 'SUBMISSION_NOT_PENDING' };
  }

  submission.status = 'rejected';
  submission.rejectedReason = reason;
  submission.rejectedBy = adminUser.id;
  submission.rejectedAt = Date.now();
  await saveSparkBoardSubmissions(guildId, submissions);

  const member = await guild.members.fetch(submission.userId).catch(() => null);
  if (member) {
    await member.send(buildSparkBoardRejectedDm(submission, reason)).catch(() => {});
  }

  return { ok: true, submission };
}

export async function addSparkBoardAnonymousComment(guild, postId, senderMember, customAlias, content) {
  const posts = await getSparkBoardPosts(guild.id);
  const post = posts.find((p) => p.id === String(postId) && p.status === 'active');
  if (!post) {
    return { ok: false, code: 'POST_NOT_FOUND' };
  }

  const thread = await guild.channels.fetch(post.threadId).catch(() => null);
  if (!thread?.isTextBased?.()) {
    return { ok: false, code: 'THREAD_NOT_FOUND' };
  }

  post.commentCounter = (Number(post.commentCounter) || 0) + 1;
  const nextNumber = post.commentCounter;
  await saveSparkBoardPosts(guild.id, posts);

  const aliasTrimmed = String(customAlias || '').trim();
  const displayName = aliasTrimmed || `Sparkmate Ẩn Danh #${padCode(nextNumber, 3)}`;

  // Gửi bình luận vào thread
  const commentText = `${SPARK_MATCHING_CONFIG.emojis.trangtrig30} **${displayName}**: ${content}`;
  await thread.send({
    content: commentText,
    allowedMentions: { parse: [] },
  });

  // Báo DM cho chủ bài đăng (nếu người bình luận không phải là chủ bài)
  if (String(senderMember.id) !== String(post.userId)) {
    const owner = await guild.members.fetch(post.userId).catch(() => null);
    if (owner) {
      const threadUrl = `https://discord.com/channels/${guild.id}/${thread.id}`;
      await owner.send(buildSparkBoardCommentNotificationDm(post, thread.id, threadUrl)).catch(() => {});
    }
  }

  return { ok: true, displayName };
}

export async function requestSparkBoardConnection(guild, postId, requesterMember) {
  const posts = await getSparkBoardPosts(guild.id);
  const post = posts.find((p) => p.id === String(postId) && p.status === 'active');
  if (!post) {
    return { ok: false, code: 'POST_NOT_FOUND' };
  }

  if (String(requesterMember.id) === String(post.userId)) {
    return { ok: false, code: 'CANNOT_CONNECT_SELF' };
  }

  const connections = await getSparkBoardConnections(guild.id);
  const existing = connections.find(
    (c) =>
      c.postId === post.id &&
      c.requesterId === String(requesterMember.id) &&
      c.status === 'pending'
  );
  if (existing) {
    return { ok: false, code: 'ALREADY_REQUESTED' };
  }

  const connectionId = `SBC-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
  const connection = {
    id: connectionId,
    postId: post.id,
    guildId: guild.id,
    ownerId: post.userId,
    requesterId: String(requesterMember.id),
    status: 'pending',
    createdAt: Date.now(),
  };

  connections.push(connection);
  await saveSparkBoardConnections(guild.id, connections);

  const owner = await guild.members.fetch(post.userId).catch(() => null);
  if (!owner) {
    return { ok: false, code: 'OWNER_NOT_FOUND' };
  }

  await owner.send(buildSparkBoardConnectionPromptDm(post, connection.id));

  return { ok: true, connection };
}

export async function respondSparkBoardConnection(guild, connectionId, userId, accepted) {
  const connections = await getSparkBoardConnections(guild.id);
  const connection = connections.find((c) => c.id === String(connectionId));
  if (!connection || connection.status !== 'pending') {
    return { ok: false, code: 'CONNECTION_EXPIRED' };
  }

  if (String(connection.ownerId) !== String(userId)) {
    return { ok: false, code: 'NOT_AUTHORIZED' };
  }

  const posts = await getSparkBoardPosts(guild.id);
  const post = posts.find((p) => p.id === connection.postId) || { code: '001' };

  if (!accepted) {
    connection.status = 'declined';
    connection.respondedAt = Date.now();
    await saveSparkBoardConnections(guild.id, connections);

    const requester = await guild.members.fetch(connection.requesterId).catch(() => null);
    if (requester) {
      await requester.send(
        `Rất tiếc, chủ nhân hồ sơ #${post.code} hiện chưa sẵn sàng mở không gian kết nối riêng tư. Cảm ơn bạn và chúc bạn sớm tìm thấy tần số đồng điệu khác nhé!`
      ).catch(() => {});
    }

    return { ok: true, accepted: false };
  }

  // Chấp nhận: Tạo Private Thread 72h
  const config = await getSparkConfig(guild.id);
  const parentChannelId = config.threadParentChannelId || SPARK_MATCHING_CONFIG.threadParentChannelId;
  const parent = await guild.channels.fetch(parentChannelId).catch(() => null);
  if (!parent?.threads?.create) {
    return { ok: false, code: 'PARENT_CHANNEL_INVALID' };
  }

  const thread = await parent.threads.create({
    name: `Spark · ${connection.id}`.slice(0, 100),
    autoArchiveDuration: 10080,
    type: ChannelType.PrivateThread,
    reason: 'Hai thành viên đồng ý kết nối từ Spark Board.',
  });

  await Promise.all([
    thread.members.add(connection.ownerId).catch(() => {}),
    thread.members.add(connection.requesterId).catch(() => {}),
  ]);

  // Tạo match record tương thích với toàn bộ hệ thống Spark Matching (72h duration)
  const durationMs = config.boardThreadDurationMs || SPARK_MATCHING_CONFIG.boardThreadDurationMs;
  const match = {
    matchId: connection.id,
    guildId: guild.id,
    userAId: connection.ownerId,
    userBId: connection.requesterId,
    threadId: thread.id,
    status: 'thread',
    source: 'spark_board',
    postId: connection.postId,
    createdAt: Date.now(),
    threadExpiresAt: Date.now() + durationMs,
    feedbackBy: [],
    feedbackMessageIds: [],
  };

  const matches = await getSparkMatches(guild.id);
  matches.push(match);
  await write(SPARK_STORAGE_KEYS.matches(guild.id), matches);

  connection.status = 'accepted';
  connection.threadId = thread.id;
  connection.respondedAt = Date.now();
  await saveSparkBoardConnections(guild.id, connections);

  // Gửi tin nhắn chào mừng kèm nút "Thông Tin Thread"
  const infoUrl = config.threadInfoUrl || SPARK_MATCHING_CONFIG.threadInfoUrl;
  await thread.send(buildSparkThreadWelcomePayload(match, infoUrl)).catch(() => {});

  // Gửi DM cho cả 2 người kèm link đến thread
  const threadUrl = `https://discord.com/channels/${guild.id}/${thread.id}`;
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setLabel('Đến Thread').setStyle(ButtonStyle.Link).setURL(threadUrl),
  );

  const [ownerMember, requesterMember] = await Promise.all([
    guild.members.fetch(connection.ownerId).catch(() => null),
    guild.members.fetch(connection.requesterId).catch(() => null),
  ]);

  const noticeContent = 'Cả hai đã đồng ý kết nối! Cupid đã tạo thread riêng tư (72 giờ) cho hai bạn trò chuyện và tìm hiểu nhau nhé.';
  await Promise.all([
    ownerMember?.send({ content: noticeContent, components: [row] }).catch(() => {}),
    requesterMember?.send({ content: noticeContent, components: [row] }).catch(() => {}),
  ]);

  return { ok: true, accepted: true, thread };
}

export async function updateSparkBoardPost(guild, postId, userId, updatedFields) {
  const posts = await getSparkBoardPosts(guild.id);
  const post = posts.find((p) => p.id === String(postId));
  if (!post) {
    return { ok: false, code: 'POST_NOT_FOUND' };
  }

  const member = await guild.members.fetch(userId).catch(() => null);
  const isAdmin = member ? isSparkAdmin(member) : false;
  if (String(post.userId) !== String(userId) && !isAdmin) {
    return { ok: false, code: 'NOT_AUTHORIZED' };
  }

  if (updatedFields.alias) post.alias = updatedFields.alias;
  if (updatedFields.about) post.about = updatedFields.about;
  if (updatedFields.relationship) post.relationship = updatedFields.relationship;
  if (updatedFields.ideal) post.ideal = updatedFields.ideal;
  if (updatedFields.message !== undefined) post.message = updatedFields.message;
  post.updatedAt = Date.now();

  await saveSparkBoardPosts(guild.id, posts);

  // Cập nhật lại starter message trong Forum thread
  const thread = await guild.channels.fetch(post.threadId).catch(() => null);
  if (thread?.isTextBased?.()) {
    const starterMsg = await thread.fetchStarterMessage().catch(() => null);
    if (starterMsg) {
      await starterMsg.edit(buildSparkBoardPostPayload(post)).catch(() => {});
    }
  }

  return { ok: true, post };
}

export async function deleteSparkBoardPost(guild, postId, userId) {
  const posts = await getSparkBoardPosts(guild.id);
  const post = posts.find((p) => p.id === String(postId));
  if (!post) {
    return { ok: false, code: 'POST_NOT_FOUND' };
  }

  const member = await guild.members.fetch(userId).catch(() => null);
  const isAdmin = member ? isSparkAdmin(member) : false;
  if (String(post.userId) !== String(userId) && !isAdmin) {
    return { ok: false, code: 'NOT_AUTHORIZED' };
  }

  post.status = 'deleted';
  post.deletedAt = Date.now();
  post.deletedBy = String(userId);
  await saveSparkBoardPosts(guild.id, posts);

  const thread = await guild.channels.fetch(post.threadId).catch(() => null);
  if (thread?.isThread?.()) {
    await thread.delete('Chủ bài đăng đã yêu cầu gỡ bài khỏi Spark Board.').catch(() => {});
  }

  return { ok: true, post };
}
