import { PassThrough } from 'node:stream';
import { PermissionFlagsBits } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { synthesizeSpeech } from './ttsAudioEngine.js';
import { getVoiceById, getDefaultVoice } from './ttsVoices.js';

let voiceModule = null;
let ffmpegInitialized = false;

async function getVoiceModule() {
  if (!voiceModule) {
    try {
      voiceModule = await import('@discordjs/voice');
    } catch (error) {
      logger.error('Failed to import @discordjs/voice:', error);
      throw new Error(
        'Thư viện âm thanh @discordjs/voice chưa được cài đặt. Hãy cập nhật bot hoặc chạy npm install nha vợ của Kim Nong ơi!',
      );
    }
  }
  return voiceModule;
}

async function ensureFFmpegPath() {
  if (ffmpegInitialized) return;
  ffmpegInitialized = true;

  if (!process.env.FFMPEG_PATH) {
    try {
      const ffmpegStatic = await import('ffmpeg-static');
      const staticPath = ffmpegStatic.default || ffmpegStatic;
      if (staticPath) {
        process.env.FFMPEG_PATH = staticPath;
        logger.info(`FFmpeg path set from ffmpeg-static: ${staticPath}`);
      }
    } catch {
      // Use system ffmpeg
    }
  }
}

/**
 * Quản lý các phiên TTS theo từng Guild
 */
class TTSManager {
  constructor() {
    this.sessions = new Map();
    this.lavalinkListenersInitialized = false;
  }

  initLavalinkListeners(client) {
    if (this.lavalinkListenersInitialized || !client?.riffy) return;
    this.lavalinkListenersInitialized = true;

    client.riffy.on('trackEnd', (player, track) => {
      if (!player?.isTTS) return;
      const session = this.getSession(player.guildId);
      if (!session || session.engine !== 'lavalink') return;

      logger.info(`Lavalink TTS track finished in guild ${player.guildId}`);
      if (session.playbackWatchdog) {
        clearTimeout(session.playbackWatchdog);
        session.playbackWatchdog = null;
      }
      session.isPlaying = false;
      this.playNextInQueue(player.guildId).catch((err) => {
        logger.error('Error in Lavalink TTS trackEnd:', err);
      });
    });

    client.riffy.on('trackError', (player, track, payload) => {
      if (!player?.isTTS) return;
      const session = this.getSession(player.guildId);
      if (!session || session.engine !== 'lavalink') return;

      logger.error(`Lavalink TTS trackError in guild ${player.guildId}:`, payload?.error || 'Unknown error');
      if (session.playbackWatchdog) {
        clearTimeout(session.playbackWatchdog);
        session.playbackWatchdog = null;
      }
      session.isPlaying = false;
      setTimeout(() => {
        this.playNextInQueue(player.guildId).catch(() => {});
      }, 500);
    });
  }

  getSession(guildId) {
    if (!guildId) return null;
    return this.sessions.get(guildId) || null;
  }

  hasSession(guildId) {
    return this.sessions.has(guildId);
  }

  /**
   * Bắt đầu một phiên nói thay mới trong Guild
   */
  async startSession({
    guild,
    voiceChannel,
    textChannel,
    ownerId,
    voiceId = 'vi-VN-HoaiMyNeural',
    mode = 'owner_only',
    speed = '1.0x',
  }) {
    // Dừng session cũ nếu đang tồn tại
    if (this.sessions.has(guild.id)) {
      await this.stopSession(guild.id, 'Chuyển sang phiên nói thay mới');
    }

    // Kiểm tra quyền của bot trong voice channel
    const botMember = guild.members.me;
    if (botMember && voiceChannel) {
      const permissions = voiceChannel.permissionsFor(botMember);
      if (!permissions?.has(PermissionFlagsBits.Connect)) {
        throw new Error('Em Usagi không có quyền **Connect (Kết nối)** vào phòng voice này rồi nè!');
      }
      if (!permissions?.has(PermissionFlagsBits.Speak)) {
        throw new Error('Em Usagi không có quyền **Speak (Nói)** trong phòng voice này đâu ạ!');
      }
    }

    const client = guild.client;
    this.initLavalinkListeners(client);

    const isLavalinkActive = Boolean(
      client?.riffy?.nodeMap?.size > 0 &&
      [...client.riffy.nodeMap.values()].some((n) => n.connected)
    );

    // ƯU TIÊN 1: Nếu Lavalink đã kết nối, dùng Lavalink (hoàn hảo trên Railway, không bao giờ timeout UDP!)
    if (isLavalinkActive) {
      logger.info(`Starting TTS session with Lavalink (Riffy) in guild ${guild.id}...`);

      let riffyPlayer = client.riffy.players.get(guild.id);
      if (riffyPlayer && riffyPlayer.voiceChannel !== voiceChannel.id) {
        try {
          riffyPlayer.destroy();
        } catch {}
        riffyPlayer = null;
      }

      if (!riffyPlayer) {
        riffyPlayer = client.riffy.createConnection({
          guildId: guild.id,
          voiceChannel: voiceChannel.id,
          textChannel: textChannel.id,
          deaf: true,
        });
      }
      riffyPlayer.isTTS = true;

      const session = {
        guildId: guild.id,
        voiceChannelId: voiceChannel.id,
        textChannelId: textChannel.id,
        ownerId,
        voiceId: voiceId || getDefaultVoice().id,
        speed: speed || '1.0x',
        mode: mode || 'owner_only',
        engine: 'lavalink',
        riffyPlayer,
        connection: null,
        player: null,
        queue: [],
        isPlaying: false,
        playbackWatchdog: null,
        idleTimer: null,
        aloneTimer: null,
        createdAt: Date.now(),
      };

      this.sessions.set(guild.id, session);
      this.resetIdleTimer(guild.id);
      return session;
    }

    // ƯU TIÊN 2: Dự phòng dùng @discordjs/voice (cho môi trường local/VPS không bật Lavalink)
    await ensureFFmpegPath();
    const voice = await getVoiceModule();

    // Dọn dẹp connection cũ trong @discordjs/voice nếu còn tồn tại
    try {
      const existingConn = voice.getVoiceConnection(guild.id);
      if (existingConn) {
        existingConn.destroy();
      }
    } catch {}

    // Kết nối Voice Channel
    logger.info(`Joining voice channel ${voiceChannel.id} in guild ${guild.id}...`);
    const connection = voice.joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: guild.id,
      adapterCreator: guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false,
    });

    const stateHistory = [connection.state?.status || 'Signalling'];
    connection.on('stateChange', (oldState, newState) => {
      const transition = `${oldState.status} ➔ ${newState.status}`;
      stateHistory.push(transition);
      logger.info(`TTS VoiceConnection in guild ${guild.id}: ${transition}`);
    });

    connection.on(voice.VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          voice.entersState(connection, voice.VoiceConnectionStatus.Signalling, 5_000),
          voice.entersState(connection, voice.VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        try {
          connection.destroy();
        } catch {}
      }
    });

    // Chờ kết nối hoàn tất (Ready handshake với Discord UDP server kèm DAVE E2EE)
    try {
      await voice.entersState(connection, voice.VoiceConnectionStatus.Ready, 30_000);
      logger.info(`Voice connection Ready in guild ${guild.id}`);
    } catch (connectError) {
      logger.error(`Voice connection failed to reach Ready in guild ${guild.id}:`, connectError);
      const report =
        typeof voice.generateDependencyReport === 'function'
          ? voice.generateDependencyReport()
          : 'Không có báo cáo thư viện';
      const lastStatus = connection?.state?.status || 'unknown';
      try {
        connection.destroy();
      } catch {}
      throw new Error(
        `Em không thể hoàn tất kết nối voice với Discord (timeout handshake).\n• Trạng thái cuối: \`${lastStatus}\`\n• Lịch sử: \`${stateHistory.join(', ')}\`\n• Bản build: \`v2.1.1-tts-dave\`\n\`\`\`\n${report}\n\`\`\``,
      );
    }

    // Tạo Audio Player với NoSubscriberBehavior.Play để không bao giờ bị pause oan
    const player = voice.createAudioPlayer({
      behaviors: {
        noSubscriber: voice.NoSubscriberBehavior?.Play || 'play',
      },
    });

    connection.subscribe(player);

    const session = {
      guildId: guild.id,
      voiceChannelId: voiceChannel.id,
      textChannelId: textChannel.id,
      ownerId,
      voiceId: voiceId || getDefaultVoice().id,
      speed: speed || '1.0x',
      mode: mode || 'owner_only',
      connection,
      player,
      queue: [],
      isPlaying: false,
      playbackWatchdog: null,
      idleTimer: null,
      aloneTimer: null,
      createdAt: Date.now(),
    };

    // Theo dõi trạng thái audio player
    player.on(voice.AudioPlayerStatus.Idle, () => {
      logger.info(`AudioPlayer status Idle in guild ${guild.id}`);
      if (session.playbackWatchdog) {
        clearTimeout(session.playbackWatchdog);
        session.playbackWatchdog = null;
      }
      session.isPlaying = false;
      this.playNextInQueue(guild.id).catch((err) => {
        logger.error(`Error processing next TTS track in guild ${guild.id}:`, err);
      });
    });

    player.on(voice.AudioPlayerStatus.Playing, () => {
      logger.info(`AudioPlayer status Playing in guild ${guild.id}`);
    });

    player.on('error', (error) => {
      logger.error(`AudioPlayer error in guild ${guild.id}:`, error?.message || error);
      if (session.playbackWatchdog) {
        clearTimeout(session.playbackWatchdog);
        session.playbackWatchdog = null;
      }
      session.isPlaying = false;
      this.playNextInQueue(guild.id).catch(() => {});
    });

    // Lắng nghe ngắt kết nối
    connection.on(voice.VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          voice.entersState(connection, voice.VoiceConnectionStatus.Signalling, 5_000),
          voice.entersState(connection, voice.VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        await this.stopSession(guild.id, 'Mất kết nối với phòng voice');
      }
    });

    this.sessions.set(guild.id, session);
    this.resetIdleTimer(guild.id);

    return session;
  }

  /**
   * Dừng và xóa phiên TTS của guild
   */
  async stopSession(guildId, reason = '') {
    const session = this.sessions.get(guildId);
    if (!session) return false;

    if (session.idleTimer) clearTimeout(session.idleTimer);
    if (session.aloneTimer) clearTimeout(session.aloneTimer);
    if (session.playbackWatchdog) clearTimeout(session.playbackWatchdog);

    try {
      if (session.engine === 'lavalink') {
        if (session.riffyPlayer) {
          session.riffyPlayer.destroy();
          session.riffyPlayer = null;
        }
      } else {
        if (session.player) {
          session.player.stop(true);
        }
        if (session.connection) {
          session.connection.destroy();
        }
      }
    } catch (e) {
      logger.warn(`Error destroying TTS connection in guild ${guildId}:`, e?.message);
    }

    this.sessions.delete(guildId);
    logger.info(`TTS session ended in guild ${guildId}. Reason: ${reason || 'User requested'}`);
    return true;
  }

  /**
   * Đổi giọng nói cho session
   */
  setVoice(guildId, voiceId) {
    const session = this.sessions.get(guildId);
    if (!session) return null;
    const voice = getVoiceById(voiceId);
    session.voiceId = voice.id;
    return voice;
  }

  /**
   * Đổi tốc độ cho session
   */
  setSpeed(guildId, speed) {
    const session = this.sessions.get(guildId);
    if (!session) return null;
    session.speed = speed;
    return speed;
  }

  /**
   * Đổi chế độ (chỉ người tạo lệnh hay cả kênh)
   */
  setMode(guildId, mode) {
    const session = this.sessions.get(guildId);
    if (!session) return null;
    session.mode = mode;
    return mode;
  }

  /**
   * Thêm câu nói vào hàng đợi và kích hoạt phát
   */
  async enqueue(guildId, item) {
    const session = this.sessions.get(guildId);
    if (!session) return false;

    this.resetIdleTimer(guildId);

    session.queue.push(item);
    logger.info(`Enqueued TTS phrase for guild ${guildId}: "${item.text.slice(0, 50)}...". Queue len: ${session.queue.length}`);

    if (!session.isPlaying) {
      await this.playNextInQueue(guildId);
    }

    return true;
  }

  /**
   * Xử lý phát câu tiếp theo trong hàng đợi (FIFO)
   */
  async playNextInQueue(guildId) {
    const session = this.sessions.get(guildId);
    if (!session) return;

    if (session.queue.length === 0) {
      session.isPlaying = false;
      this.resetIdleTimer(guildId);
      return;
    }

    session.isPlaying = true;
    const item = session.queue.shift();

    // ============================================
    // 1. ENGINE LAVALINK (Cloud Egress Native)
    // ============================================
    if (session.engine === 'lavalink') {
      try {
        const voiceIdToUse = item.voiceId || session.voiceId;
        const voiceObj = getVoiceById(voiceIdToUse);
        const lang = voiceObj?.lang ? voiceObj.lang.split('-')[0] : 'vi';

        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(item.text)}&tl=${encodeURIComponent(lang)}&client=tw-ob`;

        logger.info(`Lavalink TTS speaking in guild ${guildId}: "${item.text.slice(0, 50)}"`);
        const riffyPlayer = session.riffyPlayer;
        const client = riffyPlayer?.client || riffyPlayer?.riffy?.client;

        if (!riffyPlayer || !client?.riffy) {
          throw new Error('Lavalink player không sẵn sàng');
        }

        const result = await client.riffy.resolve({
          query: ttsUrl,
          requester: client.user,
        });

        const tracks = Array.isArray(result?.tracks) ? result.tracks : [];
        if (!tracks.length) {
          throw new Error('Lavalink không thể nạp âm thanh TTS');
        }

        const track = tracks[0];
        track.info = track.info || {};
        track.info.isTTS = true;

        if (session.playbackWatchdog) clearTimeout(session.playbackWatchdog);
        session.playbackWatchdog = setTimeout(() => {
          if (session.isPlaying) {
            logger.warn(`Lavalink TTS watchdog triggered in guild ${guildId}`);
            session.isPlaying = false;
            this.playNextInQueue(guildId).catch(() => {});
          }
        }, 15_000);

        riffyPlayer.play(track);
      } catch (err) {
        logger.error(`Error in Lavalink TTS playNextInQueue for guild ${guildId}:`, err);
        if (session.playbackWatchdog) {
          clearTimeout(session.playbackWatchdog);
          session.playbackWatchdog = null;
        }
        session.isPlaying = false;
        setTimeout(() => {
          this.playNextInQueue(guildId).catch(() => {});
        }, 500);
      }
      return;
    }

    // ============================================
    // 2. ENGINE @discordjs/voice (Direct UDP)
    // ============================================
    try {
      const voice = await getVoiceModule();
      const voiceIdToUse = item.voiceId || session.voiceId;
      const speedToUse = item.speed || session.speed;

      logger.info(`Synthesizing speech for guild ${guildId} with voice ${voiceIdToUse}: "${item.text.slice(0, 60)}"`);

      const { buffer, engine } = await synthesizeSpeech(item.text, {
        voiceId: voiceIdToUse,
        speed: speedToUse,
      });

      if (!buffer || buffer.length === 0) {
        throw new Error('Dữ liệu âm thanh rỗng');
      }

      logger.info(`Speech synthesized (${engine}, ${buffer.length} bytes). Creating audio resource...`);

      // Dùng PassThrough stream an toàn tuyệt đối với child process pipes
      const passThroughStream = new PassThrough();
      passThroughStream.end(buffer);

      const resource = voice.createAudioResource(passThroughStream, {
        inputType: voice.StreamType.Arbitrary,
        inlineVolume: true,
      });

      if (resource.volume) {
        resource.volume.setVolume(1.0);
      }

      if (resource.playStream) {
        resource.playStream.on('error', (streamErr) => {
          logger.error(`Resource playStream error in guild ${guildId}:`, streamErr);
        });
      }

      // Đặt watchdog timer: nếu 25s chưa xong thì cưỡng chế qua câu tiếp theo
      if (session.playbackWatchdog) {
        clearTimeout(session.playbackWatchdog);
      }
      session.playbackWatchdog = setTimeout(() => {
        if (session.isPlaying) {
          logger.warn(`TTS playback watchdog triggered in guild ${guildId}. Moving to next.`);
          try {
            session.player.stop(true);
          } catch {}
          session.isPlaying = false;
          this.playNextInQueue(guildId).catch(() => {});
        }
      }, 25_000);

      session.player.play(resource);
    } catch (error) {
      logger.error(`Error playing TTS track for guild ${guildId}:`, error?.message || error);
      if (session.playbackWatchdog) {
        clearTimeout(session.playbackWatchdog);
        session.playbackWatchdog = null;
      }
      session.isPlaying = false;
      setTimeout(() => {
        this.playNextInQueue(guildId).catch(() => {});
      }, 500);
    }
  }

  /**
   * Nói ngay 1 câu cụ thể (dành cho lệnh /tts noi)
   */
  async speakNow(guildId, text, { voiceId, speed, authorName, userId } = {}) {
    const session = this.sessions.get(guildId);
    if (!session) {
      throw new Error('Chưa có phiên TTS nào đang hoạt động trong máy chủ này!');
    }

    await this.enqueue(guildId, {
      text,
      voiceId: voiceId || session.voiceId,
      speed: speed || session.speed,
      authorName: authorName || 'Người dùng',
      userId,
    });
  }

  /**
   * Thiết lập hẹn giờ tự ngắt khi không ai nói trong 10 phút
   */
  resetIdleTimer(guildId) {
    const session = this.sessions.get(guildId);
    if (!session) return;

    if (session.idleTimer) {
      clearTimeout(session.idleTimer);
    }

    session.idleTimer = setTimeout(async () => {
      logger.info(`TTS idle timeout (10m) in guild ${guildId}. Leaving voice.`);
      await this.stopSession(guildId, 'Không có tin nhắn nào trong 10 phút');
    }, 10 * 60 * 1000);
  }

  /**
   * Lọc và làm sạch văn bản chat để chuẩn bị nói thay
   */
  cleanTextForSpeech(rawContent, guild) {
    if (typeof rawContent !== 'string') return '';
    let text = rawContent.trim();

    // Bỏ qua nếu tin nhắn bắt đầu bằng prefix lệnh bot thông dụng
    if (/^[!/?.;,\-$%&*~+]/.test(text)) {
      return '';
    }

    // Thay thế mention user bằng tên hiển thị
    text = text.replace(/<@!?(\d+)>/g, (match, userId) => {
      const member = guild?.members?.cache?.get(userId);
      return member ? `@${member.displayName}` : '@bạn';
    });

    // Thay thế mention role
    text = text.replace(/<@&(\d+)>/g, (match, roleId) => {
      const role = guild?.roles?.cache?.get(roleId);
      return role ? `@${role.name}` : '@vai trò';
    });

    // Thay thế mention channel
    text = text.replace(/<#(\d+)>/g, (match, channelId) => {
      const channel = guild?.channels?.cache?.get(channelId);
      return channel ? `#${channel.name}` : '#kênh';
    });

    // Thay thế custom discord emoji bằng tên emoji
    text = text.replace(/<a?:(\w+):\d+>/g, '$1');

    // Thay thế đường dẫn link
    text = text.replace(/https?:\/\/\S+/gi, 'đường link');

    // Giảm bớt dấu câu lặp lại vô lý
    text = text.replace(/([!?.,])\1+/g, '$1');

    // Bỏ markdown cơ bản
    text = text.replace(/[*_~`]/g, '');

    // Cắt ngắn nếu quá dài để tránh spam
    if (text.length > 350) {
      text = text.slice(0, 350) + '...';
    }

    return text.trim();
  }

  /**
   * Xử lý tin nhắn trong sự kiện MessageCreate
   */
  async handleTextMessage(message) {
    if (!message.guild || message.author.bot) {
      return false;
    }

    const session = this.sessions.get(message.guild.id);
    if (!session) {
      return false;
    }

    // Chỉ đọc trong kênh chat đã đăng ký
    if (message.channel.id !== session.textChannelId) {
      return false;
    }

    // Kiểm tra chế độ chỉ đọc tin nhắn của chủ phòng
    if (session.mode === 'owner_only' && message.author.id !== session.ownerId) {
      return false;
    }

    const cleanedText = this.cleanTextForSpeech(message.content, message.guild);
    if (!cleanedText) {
      return false;
    }

    await this.enqueue(message.guild.id, {
      text: cleanedText,
      authorName: message.member?.displayName || message.author.username,
      userId: message.author.id,
      voiceId: session.voiceId,
      speed: session.speed,
    });

    // Thả cảm xúc thông báo em Usagi đã nhận và đang nói thay
    try {
      await message.react('🐰');
    } catch {
      // Bỏ qua nếu thiếu quyền react
    }

    return true;
  }

  /**
   * Xử lý sự kiện voiceStateUpdate để tự rời khi một mình hoặc bị ngắt kết nối
   */
  async handleVoiceState(client, oldState, newState) {
    const guildId = oldState?.guild?.id || newState?.guild?.id;
    if (!guildId) return;

    const session = this.sessions.get(guildId);
    if (!session) return;

    const botId = client.user.id;

    // 1. Kiểm tra nếu chính bot bị kick hoặc rời khỏi voice
    if (oldState.member?.id === botId && !newState.channelId) {
      await this.stopSession(guildId, 'Bot bị ngắt kết nối khỏi phòng voice');
      return;
    }

    // 2. Kiểm tra nếu bot bị chuyển sang phòng voice khác
    if (oldState.member?.id === botId && newState.channelId && newState.channelId !== session.voiceChannelId) {
      session.voiceChannelId = newState.channelId;
    }

    // 3. Kiểm tra số lượng thành viên thực trong phòng voice
    const currentChannel = client.channels.cache.get(session.voiceChannelId);
    if (currentChannel?.isVoiceBased?.()) {
      const nonBotMembers = currentChannel.members.filter((m) => !m.user.bot);

      if (nonBotMembers.size === 0) {
        if (!session.aloneTimer) {
          logger.info(`Bot is alone in voice channel ${session.voiceChannelId}. Scheduling leave in 45s.`);
          session.aloneTimer = setTimeout(async () => {
            await this.stopSession(guildId, 'Không còn ai trong phòng voice');
          }, 45 * 1000);
        }
      } else {
        if (session.aloneTimer) {
          clearTimeout(session.aloneTimer);
          session.aloneTimer = null;
        }
      }
    }
  }

  async getDependencyReport(client) {
    const isLavalinkActive = Boolean(
      client?.riffy?.nodeMap?.size > 0 &&
      [...client.riffy.nodeMap.values()].some((n) => n.connected)
    );
    const nodes = client?.riffy?.nodeMap ? [...client.riffy.nodeMap.values()].map((n) => `${n.name} (${n.connected ? 'Online ✅' : 'Offline ❌'})`).join(', ') : 'Chưa cấu hình';

    let voiceReport = '';
    try {
      const voice = await getVoiceModule();
      if (typeof voice.generateDependencyReport === 'function') {
        voiceReport = voice.generateDependencyReport();
      }
    } catch (err) {
      voiceReport = `Không có @discordjs/voice: ${err?.message || err}`;
    }

    return `• Động cơ voice: ${isLavalinkActive ? 'Lavalink v4 (Cloud Engine - Không bị chặn UDP 🚀)' : '@discordjs/voice (Dự phòng)'}\n• Lavalink Nodes: ${nodes}\n\n${voiceReport}`;
  }
}

export const ttsManager = new TTSManager();

export async function handleTTSMessage(message, client) {
  return ttsManager.handleTextMessage(message);
}

export async function handleTTSVoiceState(client, oldState, newState) {
  return ttsManager.handleVoiceState(client, oldState, newState);
}
