import {
  ActionRowBuilder,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import {
  HSK_ADMIN_ROLE_ID,
  HSK_DEFAULTS,
  HSK_EMOJIS,
} from '../../config/hskConfig.js';
import {
  buildHskAdminPanelPayloadV2,
  buildHskIdlePausedPayloadV2,
  buildHskLeaderboardPayloadV2,
  buildHskNightLockPayloadV2,
  buildHskNoticePayloadV2,
  buildPersonalArenaOverviewPayloadV2,
  buildPersonalFlashcardPayloadV2,
  buildPersonalHubPayloadV2,
  buildPersonalNotebookPayloadV2,
  buildPersonalQuizPayloadV2,
  createPersonalQuizQuestion,
  disableHskArenaGuild,
  evictUnusedBandCaches,
  findWordById,
  getActiveHskArenaRound,
  getHskGuildConfig,
  getHskNow,
  getHskUserProgress,
  getPersonalSession,
  getPlayerHskLeaderboardPosition,
  handleHskArenaAnswer,
  handleHskArenaHint,
  isHskAdmin,
  isHskNightLock,
  loadBandWords,
  markWordMasteredInProgress,
  pickNextFlashcardForUser,
  recordWordMistake,
  saveHskGuildConfig,
  saveHskUserProgress,
  searchHskVocabulary,
  setPersonalSession,
  startHskArenaRound,
  withHskGuildLock,
  withHskUserLock,
} from '../../services/hskService.js';
import { logger } from '../../utils/logger.js';

const startingArenaGuilds = new Set();

function isPublicOriginMessage(interaction) {
  if (!interaction?.message) return false;
  const rawFlags = Number(interaction.message.flags?.bitfield ?? interaction.message.flags ?? 0);
  return (rawFlags & MessageFlags.Ephemeral) === 0;
}

function getPersonalContext(interaction, ownerIdArg) {
  const scopeGuildId = String(interaction.guildId || 'dm');
  const actorId = String(interaction.user.id);
  const isOwner = !ownerIdArg || String(ownerIdArg) === actorId;
  const ephemeralForOwner = !isPublicOriginMessage(interaction);
  return { scopeGuildId, actorId, isOwner, ephemeralForOwner };
}

async function respondPersonal(interaction, payload, { isOwner }) {
  if (isOwner && typeof interaction.update === 'function') {
    try {
      await interaction.update(payload);
      return;
    } catch (error) {
      logger.debug('[HskButtons] Fallback sang reply Ephemeral:', error?.message);
    }
  }
  await interaction.reply({
    ...payload,
    flags: MessageFlags.Ephemeral | (payload.flags || 0),
  });
}

function buildAdminDeniedPayload() {
  return buildHskNoticePayloadV2({
    title: 'KHÔNG CÓ QUYỀN QUẢN TRỊ',
    message: `${HSK_EMOJIS.ADMIN_DISABLE} Chỉ thành viên có role <@&${HSK_ADMIN_ROLE_ID}> hoặc Admin server mới dùng được thao tác này nha!`,
    ephemeral: true,
  });
}

function resolveSessionSearchResults(session) {
  if (!session?.searchQuery) return [];
  if (Array.isArray(session.searchResultIds)) {
    const resolved = session.searchResultIds.map((id) => findWordById(id)).filter(Boolean);
    evictUnusedBandCaches();
    return resolved;
  }
  const results = searchHskVocabulary(session.searchQuery, { maxResults: 3 });
  evictUnusedBandCaches();
  return results;
}

export default [
  // 1. Về Menu Ôn luyện cá nhân
  {
    name: 'hsk_home',
    async execute(interaction, client, args = []) {
      const botClient = client || interaction.client;
      try {
        const { scopeGuildId, actorId, isOwner, ephemeralForOwner } = getPersonalContext(interaction, args[0]);
        const nowMs = getHskNow(botClient);
        const progress = await getHskUserProgress(botClient, scopeGuildId, actorId);

        const payload = buildPersonalHubPayloadV2({
          ownerId: actorId,
          progress,
          ephemeral: isOwner ? ephemeralForOwner : true,
          nowMs,
        });
        await respondPersonal(interaction, payload, { isOwner });
      } catch (error) {
        logger.error('[HskButtons] Lỗi nút hsk_home:', error);
      }
    },
  },

  // 2. Mở Trắc nghiệm 4 nút
  {
    name: 'hsk_mode_quiz',
    async execute(interaction, client, args = []) {
      const botClient = client || interaction.client;
      try {
        const { scopeGuildId, actorId, isOwner, ephemeralForOwner } = getPersonalContext(interaction, args[0]);
        const nowMs = getHskNow(botClient);
        const progress = await getHskUserProgress(botClient, scopeGuildId, actorId);
        const dealt = createPersonalQuizQuestion(progress, { quizType: progress.quizType });

        setPersonalSession(scopeGuildId, actorId, {
          quizQuestion: dealt.question,
          focusWrongOnly: false,
        }, nowMs);
        evictUnusedBandCaches();

        const payload = buildPersonalQuizPayloadV2({
          ownerId: actorId,
          progress,
          word: dealt.word,
          question: dealt.question,
          ephemeral: isOwner ? ephemeralForOwner : true,
        });
        await respondPersonal(interaction, payload, { isOwner });
      } catch (error) {
        logger.error('[HskButtons] Lỗi nút hsk_mode_quiz:', error);
      }
    },
  },

  // 2b. Đổi dạng câu hỏi Trắc nghiệm (Nghĩa / Pinyin / Điền khuyết)
  {
    name: 'hsk_quiz_type',
    async execute(interaction, client, args = []) {
      const botClient = client || interaction.client;
      try {
        const [ownerIdArg, rawType] = args;
        const quizType = ['vi', 'pinyin', 'cloze'].includes(rawType) ? rawType : 'vi';
        const { scopeGuildId, actorId, isOwner, ephemeralForOwner } = getPersonalContext(interaction, ownerIdArg);
        const nowMs = getHskNow(botClient);

        const progress = await withHskUserLock(scopeGuildId, actorId, async () => {
          const p = await getHskUserProgress(botClient, scopeGuildId, actorId);
          p.quizType = quizType;
          return saveHskUserProgress(botClient, scopeGuildId, actorId, p);
        });

        const prevSession = getPersonalSession(scopeGuildId, actorId, nowMs);
        const dealt = createPersonalQuizQuestion(progress, {
          quizType,
          focusWrongOnly: Boolean(prevSession?.focusWrongOnly),
        });

        setPersonalSession(scopeGuildId, actorId, {
          quizQuestion: dealt.question,
          focusWrongOnly: dealt.focusWrongOnly,
        }, nowMs);
        evictUnusedBandCaches();

        const payload = buildPersonalQuizPayloadV2({
          ownerId: actorId,
          progress,
          word: dealt.word,
          question: dealt.question,
          focusWrongOnly: dealt.focusWrongOnly,
          ephemeral: isOwner ? ephemeralForOwner : true,
        });
        await respondPersonal(interaction, payload, { isOwner });
      } catch (error) {
        logger.error('[HskButtons] Lỗi nút hsk_quiz_type:', error);
      }
    },
  },

  // 2c. Bấm đáp án A/B/C/D trong Trắc nghiệm cá nhân
  {
    name: 'hsk_quiz_ans',
    async execute(interaction, client, args = []) {
      const botClient = client || interaction.client;
      try {
        const [ownerIdArg, qId, choiceIdxStr] = args;
        const choiceIdx = Number.parseInt(choiceIdxStr ?? '-1', 10);
        const { scopeGuildId, actorId, isOwner, ephemeralForOwner } = getPersonalContext(interaction, ownerIdArg);
        const nowMs = getHskNow(botClient);
        const session = getPersonalSession(scopeGuildId, actorId, nowMs);

        if (!isOwner || !session?.quizQuestion || session.quizQuestion.qId !== qId) {
          const progress = await getHskUserProgress(botClient, scopeGuildId, actorId);
          const dealt = createPersonalQuizQuestion(progress);
          setPersonalSession(scopeGuildId, actorId, { quizQuestion: dealt.question, focusWrongOnly: false }, nowMs);
          evictUnusedBandCaches();

          const payload = buildPersonalQuizPayloadV2({
            ownerId: actorId,
            progress,
            word: dealt.word,
            question: dealt.question,
            feedbackMessage: `${HSK_EMOJIS.HINT} Phiên câu hỏi cũ đã làm mới — mời bạn trả lời câu mới nha!`,
            ephemeral: isOwner ? ephemeralForOwner : true,
          });
          return respondPersonal(interaction, payload, { isOwner });
        }

        const q = session.quizQuestion;
        const word = findWordById(q.wordId);
        if (!word) return;

        if (Number.isInteger(q.answeredIndex)) {
          return interaction.deferUpdate?.()?.catch?.(() => {});
        }

        const isCorrect = choiceIdx === q.correctIndex;
        const updatedProgress = await withHskUserLock(scopeGuildId, actorId, async () => {
          const p = await getHskUserProgress(botClient, scopeGuildId, actorId);
          if (isCorrect) {
            p.personalStreak += 1;
            p.bestPersonalStreak = Math.max(p.bestPersonalStreak || 0, p.personalStreak);
            const nextP = markWordMasteredInProgress(p, word.id, { intervalDays: 4, nowMs });
            return saveHskUserProgress(botClient, scopeGuildId, actorId, nextP);
          }
          p.personalStreak = 0;
          const nextP = recordWordMistake(p, word, nowMs);
          return saveHskUserProgress(botClient, scopeGuildId, actorId, nextP);
        });

        const updatedQ = { ...q, answeredIndex: choiceIdx, hintShown: true };
        setPersonalSession(scopeGuildId, actorId, { quizQuestion: updatedQ }, nowMs);

        const letters = ['A', 'B', 'C', 'D'];
        const tradNote = word.traditional && word.traditional !== word.hanzi ? ` (Phồn thể: **${word.traditional}**)` : '';
        const hsk2Text = word.hsk2 ? `HSK 2.0: cấp ${word.hsk2}` : 'Từ mới chuẩn HSK 3.0';
        const resultHeading = isCorrect
          ? `${HSK_EMOJIS.CHECK} **Chính xác!** Chuỗi đúng: **${updatedProgress.personalStreak} câu**`
          : `${HSK_EMOJIS.ADMIN_DISABLE} **Chưa đúng rồi!** Đáp án đúng là **${letters[q.correctIndex]}. ${q.options[q.correctIndex]}** (đã lưu vào Sổ tay)`;

        const feedbackMessage = [
          resultHeading,
          `> **${word.hanzi}** (**${word.pinyin}**)${tradNote} — **${word.meaning}** (${hsk2Text})`,
          `> **Ví dụ:** ${word.exZh} — **${word.exPy}** (${word.exVi})`,
        ].join('\n');

        evictUnusedBandCaches();
        const payload = buildPersonalQuizPayloadV2({
          ownerId: actorId,
          progress: updatedProgress,
          word,
          question: updatedQ,
          focusWrongOnly: Boolean(session.focusWrongOnly),
          feedbackMessage,
          ephemeral: isOwner ? ephemeralForOwner : true,
        });

        await respondPersonal(interaction, payload, { isOwner });
      } catch (error) {
        logger.error('[HskButtons] Lỗi nút hsk_quiz_ans:', error);
      }
    },
  },

  // 2d. Mở gợi ý Pinyin trong Trắc nghiệm cá nhân
  {
    name: 'hsk_quiz_hint',
    async execute(interaction, client, args = []) {
      const botClient = client || interaction.client;
      try {
        const [ownerIdArg, qId] = args;
        const { scopeGuildId, actorId, isOwner, ephemeralForOwner } = getPersonalContext(interaction, ownerIdArg);
        const nowMs = getHskNow(botClient);
        const session = getPersonalSession(scopeGuildId, actorId, nowMs);

        if (!isOwner || !session?.quizQuestion || session.quizQuestion.qId !== qId) {
          const progress = await getHskUserProgress(botClient, scopeGuildId, actorId);
          const dealt = createPersonalQuizQuestion(progress);
          setPersonalSession(scopeGuildId, actorId, { quizQuestion: dealt.question }, nowMs);
          evictUnusedBandCaches();
          return respondPersonal(
            interaction,
            buildPersonalQuizPayloadV2({
              ownerId: actorId,
              progress,
              word: dealt.word,
              question: dealt.question,
              ephemeral: isOwner ? ephemeralForOwner : true,
            }),
            { isOwner },
          );
        }

        const q = { ...session.quizQuestion, hintShown: true };
        setPersonalSession(scopeGuildId, actorId, { quizQuestion: q }, nowMs);
        const word = findWordById(q.wordId);
        const progress = await getHskUserProgress(botClient, scopeGuildId, actorId);
        evictUnusedBandCaches();

        await respondPersonal(
          interaction,
          buildPersonalQuizPayloadV2({
            ownerId: actorId,
            progress,
            word,
            question: q,
            focusWrongOnly: Boolean(session.focusWrongOnly),
            ephemeral: isOwner ? ephemeralForOwner : true,
          }),
          { isOwner },
        );
      } catch (error) {
        logger.error('[HskButtons] Lỗi nút hsk_quiz_hint:', error);
      }
    },
  },

  // 2e. Câu tiếp theo trong Trắc nghiệm cá nhân
  {
    name: 'hsk_quiz_next',
    async execute(interaction, client, args = []) {
      const botClient = client || interaction.client;
      try {
        const { scopeGuildId, actorId, isOwner, ephemeralForOwner } = getPersonalContext(interaction, args[0]);
        const nowMs = getHskNow(botClient);
        const session = getPersonalSession(scopeGuildId, actorId, nowMs);
        const progress = await getHskUserProgress(botClient, scopeGuildId, actorId);

        const dealt = createPersonalQuizQuestion(progress, {
          quizType: session?.quizQuestion?.quizType || progress.quizType,
          excludeWordId: session?.quizQuestion?.wordId || null,
          focusWrongOnly: Boolean(session?.focusWrongOnly),
        });

        setPersonalSession(scopeGuildId, actorId, {
          quizQuestion: dealt.question,
          focusWrongOnly: dealt.focusWrongOnly,
        }, nowMs);
        evictUnusedBandCaches();

        await respondPersonal(
          interaction,
          buildPersonalQuizPayloadV2({
            ownerId: actorId,
            progress,
            word: dealt.word,
            question: dealt.question,
            focusWrongOnly: dealt.focusWrongOnly,
            ephemeral: isOwner ? ephemeralForOwner : true,
          }),
          { isOwner },
        );
      } catch (error) {
        logger.error('[HskButtons] Lỗi nút hsk_quiz_next:', error);
      }
    },
  },

  // 3. Mở Flashcard + SRS
  {
    name: 'hsk_mode_flash',
    async execute(interaction, client, args = []) {
      const botClient = client || interaction.client;
      try {
        const { scopeGuildId, actorId, isOwner, ephemeralForOwner } = getPersonalContext(interaction, args[0]);
        const nowMs = getHskNow(botClient);
        const progress = await getHskUserProgress(botClient, scopeGuildId, actorId);
        const picked = pickNextFlashcardForUser(progress, { nowMs });
        if (!picked) return;

        setPersonalSession(scopeGuildId, actorId, {
          flashWordId: picked.word.id,
          flashFlipped: false,
        }, nowMs);
        evictUnusedBandCaches();

        await respondPersonal(
          interaction,
          buildPersonalFlashcardPayloadV2({
            ownerId: actorId,
            progress,
            word: picked.word,
            indexInBand: picked.indexInBand,
            totalInBand: picked.bandWords.length,
            flipped: false,
            ephemeral: isOwner ? ephemeralForOwner : true,
          }),
          { isOwner },
        );
      } catch (error) {
        logger.error('[HskButtons] Lỗi nút hsk_mode_flash:', error);
      }
    },
  },

  // 3b. Lật thẻ Flashcard xem đáp án
  {
    name: 'hsk_flash_flip',
    async execute(interaction, client, args = []) {
      const botClient = client || interaction.client;
      try {
        const [ownerIdArg, wordIdArg] = args;
        const { scopeGuildId, actorId, isOwner, ephemeralForOwner } = getPersonalContext(interaction, ownerIdArg);
        const nowMs = getHskNow(botClient);
        const progress = await getHskUserProgress(botClient, scopeGuildId, actorId);
        const word = findWordById(wordIdArg);
        if (!word) return;

        const bandWords = loadBandWords(word.band);
        const indexInBand = Math.max(0, bandWords.findIndex((w) => w.id === word.id));
        setPersonalSession(scopeGuildId, actorId, { flashWordId: word.id, flashFlipped: true }, nowMs);
        evictUnusedBandCaches();

        await respondPersonal(
          interaction,
          buildPersonalFlashcardPayloadV2({
            ownerId: actorId,
            progress,
            word,
            indexInBand,
            totalInBand: bandWords.length,
            flipped: true,
            ephemeral: isOwner ? ephemeralForOwner : true,
          }),
          { isOwner },
        );
      } catch (error) {
        logger.error('[HskButtons] Lỗi nút hsk_flash_flip:', error);
      }
    },
  },

  // 3c. Chấm mức độ nhớ Flashcard SRS & mở thẻ kế tiếp
  {
    name: 'hsk_flash_rate',
    async execute(interaction, client, args = []) {
      const botClient = client || interaction.client;
      try {
        const [ownerIdArg, wordIdArg, rating] = args;
        const { scopeGuildId, actorId, isOwner, ephemeralForOwner } = getPersonalContext(interaction, ownerIdArg);
        const nowMs = getHskNow(botClient);
        const currentWord = findWordById(wordIdArg);
        if (!currentWord) return;

        const savedProgress = await withHskUserLock(scopeGuildId, actorId, async () => {
          let p = await getHskUserProgress(botClient, scopeGuildId, actorId);
          if (rating === 'again') {
            p = recordWordMistake(p, currentWord, nowMs);
          } else if (rating === 'hard') {
            const wrongWords = { ...(p.wrongWords || {}) };
            delete wrongWords[currentWord.id];
            const srs = { ...(p.srs || {}) };
            const prevReps = srs[currentWord.id]?.reps || 0;
            srs[currentWord.id] = {
              intervalDays: 1,
              dueAt: nowMs + 24 * 60 * 60 * 1000,
              reps: Math.max(1, prevReps),
            };
            p = { ...p, wrongWords, srs };
          } else {
            const prevReps = p.srs?.[currentWord.id]?.reps || 0;
            const intervals = HSK_DEFAULTS.SRS_INTERVAL_DAYS;
            const intervalDays = intervals[Math.min(intervals.length - 1, Math.max(1, prevReps + 1))];
            p = markWordMasteredInProgress(p, currentWord.id, { intervalDays, nowMs });
          }
          return saveHskUserProgress(botClient, scopeGuildId, actorId, p);
        });

        const nextPicked = pickNextFlashcardForUser(savedProgress, {
          excludeWordId: currentWord.id,
          nowMs,
        });
        if (!nextPicked) return;

        const ratingMsg =
          rating === 'again'
            ? `${HSK_EMOJIS.STREAK} Đã thêm **${currentWord.hanzi}** (**${currentWord.pinyin}**) vào Sổ tay ôn ngay.`
            : rating === 'hard'
              ? `${HSK_EMOJIS.TIME} Đã hẹn ôn lại **${currentWord.hanzi}** (**${currentWord.pinyin}**) sau **1 ngày**.`
              : `${HSK_EMOJIS.CHECK} Đã đánh dấu thuộc **${currentWord.hanzi}** (**${currentWord.pinyin}**)!`;

        setPersonalSession(scopeGuildId, actorId, {
          flashWordId: nextPicked.word.id,
          flashFlipped: false,
        }, nowMs);
        evictUnusedBandCaches();

        await respondPersonal(
          interaction,
          buildPersonalFlashcardPayloadV2({
            ownerId: actorId,
            progress: savedProgress,
            word: nextPicked.word,
            indexInBand: nextPicked.indexInBand,
            totalInBand: nextPicked.bandWords.length,
            flipped: false,
            statusNotice: ratingMsg,
            ephemeral: isOwner ? ephemeralForOwner : true,
          }),
          { isOwner },
        );
      } catch (error) {
        logger.error('[HskButtons] Lỗi nút hsk_flash_rate:', error);
      }
    },
  },

  // 4. Mở Sổ tay từ sai & Tra cứu nhanh
  {
    name: 'hsk_mode_notebook',
    async execute(interaction, client, args = []) {
      const botClient = client || interaction.client;
      try {
        const { scopeGuildId, actorId, isOwner, ephemeralForOwner } = getPersonalContext(interaction, args[0]);
        const nowMs = getHskNow(botClient);
        const progress = await getHskUserProgress(botClient, scopeGuildId, actorId);
        const session = getPersonalSession(scopeGuildId, actorId, nowMs);
        const searchResults = resolveSessionSearchResults(session);

        await respondPersonal(
          interaction,
          buildPersonalNotebookPayloadV2({
            ownerId: actorId,
            progress,
            page: 0,
            searchQuery: session?.searchQuery || '',
            searchResults,
            ephemeral: isOwner ? ephemeralForOwner : true,
            nowMs,
          }),
          { isOwner },
        );
      } catch (error) {
        logger.error('[HskButtons] Lỗi nút hsk_mode_notebook:', error);
      }
    },
  },

  // 4b. Đánh dấu "Đã thuộc" từng từ trong Sổ tay
  {
    name: 'hsk_nb_done',
    async execute(interaction, client, args = []) {
      const botClient = client || interaction.client;
      try {
        const [ownerIdArg, wordIdArg, pageStr] = args;
        const { scopeGuildId, actorId, isOwner, ephemeralForOwner } = getPersonalContext(interaction, ownerIdArg);
        const nowMs = getHskNow(botClient);
        const page = Math.max(0, Number.parseInt(pageStr ?? '0', 10) || 0);

        const updatedProgress = await withHskUserLock(scopeGuildId, actorId, async () => {
          const p = await getHskUserProgress(botClient, scopeGuildId, actorId);
          const next = markWordMasteredInProgress(p, wordIdArg, { intervalDays: 4, nowMs });
          return saveHskUserProgress(botClient, scopeGuildId, actorId, next);
        });

        const session = getPersonalSession(scopeGuildId, actorId, nowMs);
        const searchResults = resolveSessionSearchResults(session);

        await respondPersonal(
          interaction,
          buildPersonalNotebookPayloadV2({
            ownerId: actorId,
            progress: updatedProgress,
            page,
            searchQuery: session?.searchQuery || '',
            searchResults,
            ephemeral: isOwner ? ephemeralForOwner : true,
            nowMs,
          }),
          { isOwner },
        );
      } catch (error) {
        logger.error('[HskButtons] Lỗi nút hsk_nb_done:', error);
      }
    },
  },

  // 4c. Phân trang Sổ tay từ sai
  {
    name: 'hsk_nb_prev',
    async execute(interaction, client, args = []) {
      const botClient = client || interaction.client;
      try {
        const [ownerIdArg, pageStr] = args;
        const { scopeGuildId, actorId, isOwner, ephemeralForOwner } = getPersonalContext(interaction, ownerIdArg);
        const nowMs = getHskNow(botClient);
        const progress = await getHskUserProgress(botClient, scopeGuildId, actorId);
        const wrongCount = Object.keys(progress.wrongWords || {}).length;
        const totalPages = Math.max(1, Math.ceil(wrongCount / HSK_DEFAULTS.NOTEBOOK_PAGE_SIZE));
        const currentPage = Math.max(0, Number.parseInt(pageStr ?? '0', 10) || 0) % totalPages;
        const targetPage = (currentPage - 1 + totalPages) % totalPages;

        const session = getPersonalSession(scopeGuildId, actorId, nowMs);
        const searchResults = resolveSessionSearchResults(session);

        await respondPersonal(
          interaction,
          buildPersonalNotebookPayloadV2({
            ownerId: actorId,
            progress,
            page: targetPage,
            searchQuery: session?.searchQuery || '',
            searchResults,
            ephemeral: isOwner ? ephemeralForOwner : true,
            nowMs,
          }),
          { isOwner },
        );
      } catch (error) {
        logger.error('[HskButtons] Lỗi nút hsk_nb_prev:', error);
      }
    },
  },
  {
    name: 'hsk_nb_next',
    async execute(interaction, client, args = []) {
      const botClient = client || interaction.client;
      try {
        const [ownerIdArg, pageStr] = args;
        const { scopeGuildId, actorId, isOwner, ephemeralForOwner } = getPersonalContext(interaction, ownerIdArg);
        const nowMs = getHskNow(botClient);
        const progress = await getHskUserProgress(botClient, scopeGuildId, actorId);
        const wrongCount = Object.keys(progress.wrongWords || {}).length;
        const totalPages = Math.max(1, Math.ceil(wrongCount / HSK_DEFAULTS.NOTEBOOK_PAGE_SIZE));
        const currentPage = Math.max(0, Number.parseInt(pageStr ?? '0', 10) || 0) % totalPages;
        const targetPage = (currentPage + 1) % totalPages;

        const session = getPersonalSession(scopeGuildId, actorId, nowMs);
        const searchResults = resolveSessionSearchResults(session);

        await respondPersonal(
          interaction,
          buildPersonalNotebookPayloadV2({
            ownerId: actorId,
            progress,
            page: targetPage,
            searchQuery: session?.searchQuery || '',
            searchResults,
            ephemeral: isOwner ? ephemeralForOwner : true,
            nowMs,
          }),
          { isOwner },
        );
      } catch (error) {
        logger.error('[HskButtons] Lỗi nút hsk_nb_next:', error);
      }
    },
  },
  {
    name: 'hsk_nb_page',
    async execute(interaction) {
      await interaction.deferUpdate?.()?.catch?.(() => {});
    },
  },

  // 4d. Ôn lại ngay từ Sổ tay từ sai
  {
    name: 'hsk_nb_review',
    async execute(interaction, client, args = []) {
      const botClient = client || interaction.client;
      try {
        const { scopeGuildId, actorId, isOwner, ephemeralForOwner } = getPersonalContext(interaction, args[0]);
        const nowMs = getHskNow(botClient);
        const progress = await getHskUserProgress(botClient, scopeGuildId, actorId);
        const dealt = createPersonalQuizQuestion(progress, {
          quizType: progress.quizType,
          focusWrongOnly: true,
        });

        setPersonalSession(scopeGuildId, actorId, {
          quizQuestion: dealt.question,
          focusWrongOnly: dealt.focusWrongOnly,
        }, nowMs);
        evictUnusedBandCaches();

        await respondPersonal(
          interaction,
          buildPersonalQuizPayloadV2({
            ownerId: actorId,
            progress,
            word: dealt.word,
            question: dealt.question,
            focusWrongOnly: dealt.focusWrongOnly,
            ephemeral: isOwner ? ephemeralForOwner : true,
          }),
          { isOwner },
        );
      } catch (error) {
        logger.error('[HskButtons] Lỗi nút hsk_nb_review:', error);
      }
    },
  },

  // 4e. Mở Modal Tra cứu nhanh từ Sổ tay
  {
    name: 'hsk_nb_search',
    async execute(interaction) {
      try {
        const actorId = String(interaction.user.id);
        const modal = new ModalBuilder()
          .setCustomId(`hsk_modal_search:${actorId}`)
          .setTitle('Tra Cứu Từ Vựng HSK 3.0');

        const queryInput = new TextInputBuilder()
          .setCustomId('search_query')
          .setLabel('Nhập chữ Hán, Pinyin hoặc nghĩa tiếng Việt')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ví dụ: 循序渐进, xunxu, thư viện...')
          .setRequired(true)
          .setMinLength(1)
          .setMaxLength(60);

        modal.addComponents(new ActionRowBuilder().addComponents(queryInput));
        await interaction.showModal(modal);
      } catch (error) {
        logger.error('[HskButtons] Lỗi mở modal hsk_nb_search:', error);
      }
    },
  },

  // 4f. Xóa kết quả tìm kiếm trong Sổ tay
  {
    name: 'hsk_nb_clear_search',
    async execute(interaction, client, args = []) {
      const botClient = client || interaction.client;
      try {
        const { scopeGuildId, actorId, isOwner, ephemeralForOwner } = getPersonalContext(interaction, args[0]);
        const nowMs = getHskNow(botClient);
        setPersonalSession(scopeGuildId, actorId, { searchQuery: '', searchResultIds: [] }, nowMs);
        const progress = await getHskUserProgress(botClient, scopeGuildId, actorId);

        await respondPersonal(
          interaction,
          buildPersonalNotebookPayloadV2({
            ownerId: actorId,
            progress,
            page: 0,
            searchQuery: '',
            searchResults: [],
            ephemeral: isOwner ? ephemeralForOwner : true,
            nowMs,
          }),
          { isOwner },
        );
      } catch (error) {
        logger.error('[HskButtons] Lỗi nút hsk_nb_clear_search:', error);
      }
    },
  },

  // 5. Xem thông tin Đấu trường từ Menu cá nhân
  {
    name: 'hsk_mode_arena',
    async execute(interaction, client, args = []) {
      const botClient = client || interaction.client;
      try {
        const { actorId, isOwner, ephemeralForOwner } = getPersonalContext(interaction, args[0]);
        if (!interaction.guildId) {
          return respondPersonal(
            interaction,
            buildHskNoticePayloadV2({
              title: 'CHỈ CÓ TRONG SERVER',
              message: `${HSK_EMOJIS.ARENA} Đấu trường kênh chung chỉ hoạt động trong server nha!`,
              ephemeral: true,
              buttons: [
                {
                  type: 2,
                  style: 2,
                  label: 'Về menu',
                  custom_id: `hsk_home:${actorId}`,
                },
              ],
            }),
            { isOwner },
          );
        }

        const config = await getHskGuildConfig(botClient, interaction.guildId);
        const { rank, stats } = getPlayerHskLeaderboardPosition(config, actorId);
        const payload = buildPersonalArenaOverviewPayloadV2({
          ownerId: actorId,
          config,
          currentRound: getActiveHskArenaRound(interaction.guildId),
          requesterRank: rank,
          requesterStats: stats,
          ephemeral: isOwner ? ephemeralForOwner : true,
          nowMs: getHskNow(botClient),
        });

        await respondPersonal(interaction, payload, { isOwner });
      } catch (error) {
        logger.error('[HskButtons] Lỗi nút hsk_mode_arena:', error);
      }
    },
  },

  // =========================================================================
  // ĐẤU TRƯỜNG KÊNH CHUNG (100% BẤM NÚT, KHÔNG CẦN GÕ LỆNH)
  // =========================================================================

  {
    name: 'hsk_arena_ans',
    async execute(interaction, client, args = []) {
      const botClient = client || interaction.client;
      try {
        if (!interaction.guildId) return;
        const [roundId, choiceIdxStr] = args;
        const choiceIdx = Number.parseInt(choiceIdxStr ?? '-1', 10);
        await handleHskArenaAnswer(interaction, botClient, roundId, choiceIdx);
      } catch (error) {
        logger.error('[HskButtons] Lỗi nút hsk_arena_ans:', error);
      }
    },
  },

  {
    name: 'hsk_arena_hint',
    async execute(interaction, client, args = []) {
      const botClient = client || interaction.client;
      try {
        if (!interaction.guildId) return;
        await handleHskArenaHint(interaction, botClient, args[0] || null);
      } catch (error) {
        logger.error('[HskButtons] Lỗi nút hsk_arena_hint:', error);
      }
    },
  },

  {
    name: 'hsk_arena_personal',
    async execute(interaction, client) {
      const botClient = client || interaction.client;
      try {
        const scopeGuildId = String(interaction.guildId || 'dm');
        const userId = String(interaction.user.id);
        const nowMs = getHskNow(botClient);
        const progress = await getHskUserProgress(botClient, scopeGuildId, userId);

        return interaction.reply(
          buildPersonalHubPayloadV2({
            ownerId: userId,
            progress,
            ephemeral: true,
            nowMs,
          }),
        );
      } catch (error) {
        logger.error('[HskButtons] Lỗi nút hsk_arena_personal:', error);
      }
    },
  },

  {
    name: 'hsk_arena_bxh',
    async execute(interaction, client) {
      const botClient = client || interaction.client;
      try {
        if (!interaction.guildId) return;
        const config = await getHskGuildConfig(botClient, interaction.guildId);
        const { entries, rank, stats } = getPlayerHskLeaderboardPosition(config, interaction.user.id);
        return interaction.reply(
          buildHskLeaderboardPayloadV2({
            entries,
            page: 0,
            requesterStats: stats,
            requesterRank: rank,
            ephemeral: true,
          }),
        );
      } catch (error) {
        logger.error('[HskButtons] Lỗi nút hsk_arena_bxh:', error);
      }
    },
  },

  {
    name: 'hsk_arena_next',
    async execute(interaction, client, args = []) {
      const botClient = client || interaction.client;
      const guildId = String(interaction.guildId || '');
      try {
        if (!guildId) return;
        const clickedRoundId = args[0] || null;
        const active = getActiveHskArenaRound(guildId);
        const isAdmin = isHskAdmin(
          interaction.member,
          interaction.user.id,
          interaction.guild,
          interaction.memberPermissions,
        );

        if (active && !active.ended) {
          if (clickedRoundId && active.id !== clickedRoundId) {
            return interaction.reply(
              buildHskNoticePayloadV2({
                title: 'ĐÃ CÓ VÁN MỚI BÊN DƯỚI',
                message: `${HSK_EMOJIS.ARENA} **Ván #${active.roundNumber}** đã được mở bên dưới rồi nè!`,
                ephemeral: true,
              }),
            );
          }

          if (!isAdmin) {
            return interaction.reply(
              buildHskNoticePayloadV2({
                title: `VÁN #${active.roundNumber} ĐANG DIỄN RA`,
                message: `${HSK_EMOJIS.TIME} Hãy bấm đáp án **A/B/C/D** ở ngay bên trên để trả lời nhé (chỉ Admin mới qua ván sớm giữa chừng, hoặc đợi ván kết thúc để bấm **❯❯ Ván mới**).`,
                ephemeral: true,
              }),
            );
          }
        }

        const nightStatus = isHskNightLock(getHskNow(botClient));
        if (nightStatus.locked) {
          return interaction.reply(
            buildHskNightLockPayloadV2({
              currentTimeText: nightStatus.currentTimeText,
              startHour: nightStatus.startHour,
              endHour: nightStatus.endHour,
              includeResumeButton: false,
              ephemeral: true,
            }),
          );
        }

        if (startingArenaGuilds.has(guildId)) {
          return interaction.reply(
            buildHskNoticePayloadV2({
              title: 'ĐANG MỞ VÁN MỚI',
              message: `${HSK_EMOJIS.HINT} Ván mới đang được gửi ngay nè~`,
              ephemeral: true,
            }),
          );
        }

        startingArenaGuilds.add(guildId);
        try {
          const started = await startHskArenaRound(botClient, guildId, { isAutoContinuation: false });
          if (started?.reason === 'DISABLED') {
            return interaction.reply(
              buildHskNoticePayloadV2({
                title: 'ĐẤU TRƯỜNG ĐANG TẮT',
                message: `${HSK_EMOJIS.ADMIN_DISABLE} Admin hiện đã tạm tắt Đấu trường HSK 3.0 rồi nha!`,
                ephemeral: true,
              }),
            );
          }
          if (!started?.success) {
            return interaction.reply(
              buildHskNoticePayloadV2({
                title: 'CHƯA THỂ MỞ VÁN MỚI',
                message: `${HSK_EMOJIS.ADMIN_DISABLE} Bot không thể gửi thẻ vào kênh đấu trường đã cấu hình!`,
                ephemeral: true,
              }),
            );
          }
          await interaction.deferUpdate?.()?.catch?.(() => {});
        } finally {
          startingArenaGuilds.delete(guildId);
        }
      } catch (error) {
        logger.error('[HskButtons] Lỗi nút hsk_arena_next:', error);
      }
    },
  },

  {
    name: 'hsk_arena_resume',
    async execute(interaction, client) {
      const botClient = client || interaction.client;
      const guildId = String(interaction.guildId || '');
      try {
        if (!guildId) return;
        if (startingArenaGuilds.has(guildId)) {
          return interaction.reply(
            buildHskNoticePayloadV2({
              title: 'ĐANG MỞ VÁN MỚI',
              message: `${HSK_EMOJIS.HINT} Có người vừa bấm Chơi tiếp rồi, ván mới đang được gửi ngay nè~`,
              ephemeral: true,
            }),
          );
        }

        startingArenaGuilds.add(guildId);
        try {
          const nightStatus = isHskNightLock(getHskNow(botClient));
          if (nightStatus.locked) {
            return interaction.reply(
              buildHskNightLockPayloadV2({
                currentTimeText: nightStatus.currentTimeText,
                startHour: nightStatus.startHour,
                endHour: nightStatus.endHour,
                includeResumeButton: false,
                ephemeral: true,
              }),
            );
          }

          const config = await getHskGuildConfig(botClient, guildId);
          if (!config.enabled || !config.channelId) {
            await interaction
              .update(
                buildHskIdlePausedPayloadV2({
                  idleMinutes: Math.max(1, Math.round(HSK_DEFAULTS.IDLE_TIMEOUT_MS / 60000)),
                  resumeDisabled: true,
                }),
              )
              .catch(() => {});
            return interaction
              .followUp?.(
                buildHskNoticePayloadV2({
                  title: 'ĐẤU TRƯỜNG ĐANG TẮT',
                  message: `${HSK_EMOJIS.ADMIN_DISABLE} Admin hiện đã tắt kênh Đấu trường HSK 3.0 rồi nha!`,
                  ephemeral: true,
                }),
              )
              ?.catch?.(() => {});
          }

          const currentChannelId = String(interaction.channelId || interaction.channel?.id || '');
          if (currentChannelId && currentChannelId !== config.channelId) {
            return interaction.reply(
              buildHskNoticePayloadV2({
                title: 'KÊNH ĐẤU TRƯỜNG ĐÃ ĐỔI',
                message: `${HSK_EMOJIS.ARENA} Kênh Đấu trường HSK 3.0 hiện tại đã chuyển sang <#${config.channelId}> nha!`,
                ephemeral: true,
              }),
            );
          }

          await interaction.update(
            buildHskIdlePausedPayloadV2({
              idleMinutes: Math.max(1, Math.round(HSK_DEFAULTS.IDLE_TIMEOUT_MS / 60000)),
              resumeDisabled: true,
              resumedByUserId: interaction.user.id,
            }),
          );

          await startHskArenaRound(botClient, guildId, { isAutoContinuation: false });
        } finally {
          startingArenaGuilds.delete(guildId);
        }
      } catch (error) {
        logger.error('[HskButtons] Lỗi nút hsk_arena_resume:', error);
      }
    },
  },

  // BXH Phân trang
  {
    name: 'hsk_bxh_prev',
    async execute(interaction, client, args = []) {
      const botClient = client || interaction.client;
      try {
        if (!interaction.guildId) return;
        const config = await getHskGuildConfig(botClient, interaction.guildId);
        const { entries, rank, stats } = getPlayerHskLeaderboardPosition(config, interaction.user.id);
        const totalPages = Math.max(1, Math.ceil(entries.length / HSK_DEFAULTS.BXH_PAGE_SIZE));
        const currentPage = Number.parseInt(args[0] ?? '0', 10);
        const safeCurrent = Number.isInteger(currentPage) && currentPage >= 0 ? currentPage % totalPages : 0;
        const targetPage = (safeCurrent - 1 + totalPages) % totalPages;

        await interaction.update(
          buildHskLeaderboardPayloadV2({
            entries,
            page: targetPage,
            requesterStats: stats,
            requesterRank: rank,
            ephemeral: !isPublicOriginMessage(interaction),
          }),
        );
      } catch (error) {
        logger.error('[HskButtons] Lỗi phân trang hsk_bxh_prev:', error);
      }
    },
  },
  {
    name: 'hsk_bxh_next',
    async execute(interaction, client, args = []) {
      const botClient = client || interaction.client;
      try {
        if (!interaction.guildId) return;
        const config = await getHskGuildConfig(botClient, interaction.guildId);
        const { entries, rank, stats } = getPlayerHskLeaderboardPosition(config, interaction.user.id);
        const totalPages = Math.max(1, Math.ceil(entries.length / HSK_DEFAULTS.BXH_PAGE_SIZE));
        const currentPage = Number.parseInt(args[0] ?? '0', 10);
        const safeCurrent = Number.isInteger(currentPage) && currentPage >= 0 ? currentPage % totalPages : 0;
        const targetPage = (safeCurrent + 1) % totalPages;

        await interaction.update(
          buildHskLeaderboardPayloadV2({
            entries,
            page: targetPage,
            requesterStats: stats,
            requesterRank: rank,
            ephemeral: !isPublicOriginMessage(interaction),
          }),
        );
      } catch (error) {
        logger.error('[HskButtons] Lỗi phân trang hsk_bxh_next:', error);
      }
    },
  },
  {
    name: 'hsk_bxh_page',
    async execute(interaction) {
      await interaction.deferUpdate?.()?.catch?.(() => {});
    },
  },

  // =========================================================================
  // ADMIN PANEL BUTTONS (/hsk-admin)
  // =========================================================================

  {
    name: 'hsk_admin_start',
    async execute(interaction, client) {
      const botClient = client || interaction.client;
      try {
        if (!isHskAdmin(interaction.member, interaction.user.id, interaction.guild, interaction.memberPermissions)) {
          return interaction.reply(buildAdminDeniedPayload());
        }

        const result = await startHskArenaRound(botClient, interaction.guildId, { forceEnable: true });
        if (result.reason === 'NIGHT_LOCK') {
          return interaction.reply(
            buildHskNightLockPayloadV2({
              currentTimeText: result.nightStatus.currentTimeText,
              startHour: result.nightStatus.startHour,
              endHour: result.nightStatus.endHour,
              includeResumeButton: false,
              ephemeral: true,
            }),
          );
        }
        if (!result.success) {
          const reasonMsg =
            result.reason === 'NO_CHANNEL'
              ? `${HSK_EMOJIS.ARENA} Chưa chọn kênh đấu trường! Hãy chạy \`/hsk-admin setup\` tại kênh mong muốn trước nha.`
              : `${HSK_EMOJIS.ADMIN_DISABLE} Bot thiếu quyền hoặc không tìm thấy kênh <#${result.config?.channelId}>.`;
          return interaction.reply(
            buildHskNoticePayloadV2({
              title: 'KHÔNG THỂ BẮT ĐẦU VÁN MỚI',
              message: reasonMsg,
              ephemeral: true,
            }),
          );
        }

        await interaction.update(
          buildHskAdminPanelPayloadV2(result.config, result.round, getHskNow(botClient)),
        );
      } catch (error) {
        logger.error('[HskButtons] Lỗi nút hsk_admin_start:', error);
      }
    },
  },

  {
    name: 'hsk_admin_toggle',
    async execute(interaction, client) {
      const botClient = client || interaction.client;
      try {
        if (!isHskAdmin(interaction.member, interaction.user.id, interaction.guild, interaction.memberPermissions)) {
          return interaction.reply(buildAdminDeniedPayload());
        }

        const saved = await withHskGuildLock(interaction.guildId, async () => {
          const cfg = await getHskGuildConfig(botClient, interaction.guildId);
          cfg.autoStart = !cfg.autoStart;
          if (!cfg.autoStart) cfg.idlePaused = false;
          return saveHskGuildConfig(botClient, interaction.guildId, cfg);
        });

        let activeRound = getActiveHskArenaRound(interaction.guildId);
        let nightBlocked = null;
        if (saved.enabled && saved.autoStart && saved.channelId && !activeRound) {
          const started = await startHskArenaRound(botClient, interaction.guildId);
          if (started?.success) activeRound = started.round;
          else if (started?.reason === 'NIGHT_LOCK') nightBlocked = started.nightStatus;
        }

        await interaction.update(buildHskAdminPanelPayloadV2(saved, activeRound, getHskNow(botClient)));
        if (nightBlocked) {
          await interaction
            .followUp?.(
              buildHskNightLockPayloadV2({
                currentTimeText: nightBlocked.currentTimeText,
                startHour: nightBlocked.startHour,
                endHour: nightBlocked.endHour,
                includeResumeButton: false,
                ephemeral: true,
              }),
            )
            ?.catch?.(() => {});
        }
      } catch (error) {
        logger.error('[HskButtons] Lỗi nút hsk_admin_toggle:', error);
      }
    },
  },

  {
    name: 'hsk_admin_mode',
    async execute(interaction, client) {
      const botClient = client || interaction.client;
      try {
        if (!isHskAdmin(interaction.member, interaction.user.id, interaction.guild, interaction.memberPermissions)) {
          return interaction.reply(buildAdminDeniedPayload());
        }

        const saved = await withHskGuildLock(interaction.guildId, async () => {
          const cfg = await getHskGuildConfig(botClient, interaction.guildId);
          cfg.arenaMode = cfg.arenaMode === 'mixed' ? 'vi' : 'mixed';
          return saveHskGuildConfig(botClient, interaction.guildId, cfg);
        });

        await interaction.update(
          buildHskAdminPanelPayloadV2(saved, getActiveHskArenaRound(interaction.guildId), getHskNow(botClient)),
        );
      } catch (error) {
        logger.error('[HskButtons] Lỗi nút hsk_admin_mode:', error);
      }
    },
  },

  {
    name: 'hsk_admin_time',
    async execute(interaction, client) {
      const botClient = client || interaction.client;
      try {
        if (!isHskAdmin(interaction.member, interaction.user.id, interaction.guild, interaction.memberPermissions)) {
          return interaction.reply(buildAdminDeniedPayload());
        }

        const config = await getHskGuildConfig(botClient, interaction.guildId);
        const modal = new ModalBuilder()
          .setCustomId('hsk_modal_time')
          .setTitle('Chỉnh Thời Gian Đấu Trường HSK');

        const durationInput = new TextInputBuilder()
          .setCustomId('duration_seconds')
          .setLabel(`Số giây mỗi ván (${HSK_DEFAULTS.MIN_DURATION_SECONDS} - ${HSK_DEFAULTS.MAX_DURATION_SECONDS} giây)`)
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Ví dụ: 45')
          .setValue(String(config.durationSeconds || HSK_DEFAULTS.ROUND_DURATION_SECONDS))
          .setRequired(true)
          .setMinLength(2)
          .setMaxLength(3);

        modal.addComponents(new ActionRowBuilder().addComponents(durationInput));
        await interaction.showModal(modal);
      } catch (error) {
        logger.error('[HskButtons] Lỗi nút hsk_admin_time:', error);
      }
    },
  },

  {
    name: 'hsk_admin_disable',
    async execute(interaction, client) {
      const botClient = client || interaction.client;
      try {
        if (!isHskAdmin(interaction.member, interaction.user.id, interaction.guild, interaction.memberPermissions)) {
          return interaction.reply(buildAdminDeniedPayload());
        }

        const currentConfig = await getHskGuildConfig(botClient, interaction.guildId);
        if (currentConfig.enabled) {
          const disabledConfig = await disableHskArenaGuild(botClient, interaction.guildId);
          return interaction.update(
            buildHskAdminPanelPayloadV2(disabledConfig, null, getHskNow(botClient)),
          );
        }

        if (!currentConfig.channelId) {
          return interaction.reply(
            buildHskNoticePayloadV2({
              title: 'CHƯA CÓ KÊNH ĐỂ BẬT',
              message: `${HSK_EMOJIS.ARENA} Hãy chạy \`/hsk-admin setup\` để chọn kênh Đấu trường trước nha!`,
              ephemeral: true,
            }),
          );
        }

        const nowMs = getHskNow(botClient);
        const nightStatus = isHskNightLock(nowMs);
        const enabledConfig = await withHskGuildLock(interaction.guildId, async () => {
          const cfg = await getHskGuildConfig(botClient, interaction.guildId);
          cfg.enabled = true;
          cfg.idlePaused = nightStatus.locked;
          return saveHskGuildConfig(botClient, interaction.guildId, cfg);
        });

        let activeRound = getActiveHskArenaRound(interaction.guildId);
        if (enabledConfig.autoStart && !activeRound && !nightStatus.locked) {
          const started = await startHskArenaRound(botClient, interaction.guildId);
          if (started?.success) activeRound = started.round;
        }

        await interaction.update(buildHskAdminPanelPayloadV2(enabledConfig, activeRound, nowMs));
      } catch (error) {
        logger.error('[HskButtons] Lỗi nút hsk_admin_disable:', error);
      }
    },
  },
];

