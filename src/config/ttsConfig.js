import { GatewayIntentBits, Options, Partials } from 'discord.js';

export const TTS_MANAGER_ROLE_ID = '1545305594712432640';

export const TTS_DEFAULT_GUILD_CONFIG = Object.freeze({
  enabled: true,
  updatedBy: null,
  updatedAt: null,
  reason: null,
});

const TRUTHY_VALUES = new Set(['true', '1', 'yes', 'on']);
const FALSY_VALUES = new Set(['false', '0', 'no', 'off']);

export function parseBooleanFlag(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  if (TRUTHY_VALUES.has(normalized)) {
    return true;
  }
  if (FALSY_VALUES.has(normalized)) {
    return false;
  }

  return fallback;
}

/**
 * Kiểm tra xem tính năng TTS có được bật ở cấp khởi động (biến môi trường) hay không.
 * Mặc định là `false` (TẮT triệt để) để tiết kiệm RAM khi không ai dùng.
 * Đặt `ENABLE_TTS=true` rồi khởi động lại bot để bật lại toàn bộ tính năng TTS.
 */
export function isTTSEnabledByEnv(env = process.env) {
  if (env?.ENABLE_TTS !== undefined && env.ENABLE_TTS !== '') {
    return parseBooleanFlag(env.ENABLE_TTS, false);
  }

  if (env?.TTS_ENABLED !== undefined && env.TTS_ENABLED !== '') {
    return parseBooleanFlag(env.TTS_ENABLED, false);
  }

  return false;
}

/**
 * Xây dựng cấu hình Discord Client (intents, cache limits, sweepers).
 * Khi TTS tắt (`ENABLE_TTS=false`), tự động gỡ bỏ `GatewayIntentBits.GuildVoiceStates`
 * và khóa `VoiceStateManager: 0` để không tốn RAM cho voice state cache.
 */
export function buildBotClientOptions(env = process.env) {
  const ttsEnabled = isTTSEnabledByEnv(env);

  return {
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      ...(ttsEnabled ? [GatewayIntentBits.GuildVoiceStates] : []),
      GatewayIntentBits.MessageContent,
    ],
    partials: [
      Partials.Message,
      Partials.Channel,
      Partials.User,
    ],
    // 🚀 Tối ưu RAM cho Discord.js: Khóa chặt cache không cần thiết và tự động dọn rác bộ nhớ cực kỳ triệt để
    makeCache: Options.cacheWithLimits({
      ...Options.DefaultMakeCacheSettings,
      GuildMemberManager: 10, // Khóa cứng member cache (chỉ lưu tối đa 10 member mỗi guild)
      UserManager: 10, // Giới hạn tối đa 10 user trong RAM
      MessageManager: 1, // Chỉ lưu tối đa 1 tin nhắn gần nhất mỗi channel
      GuildEmojiManager: 0, // Không cache emoji
      GuildStickerManager: 0, // Không cache sticker
      ReactionManager: 0, // Không cache reaction
      ReactionUserManager: 0, // Không cache reaction user
      StageInstanceManager: 0,
      AutoModerationRuleManager: 0,
      GuildScheduledEventManager: 0,
      GuildBanManager: 0, // Không cache danh sách ban
      GuildInviteManager: 0, // Không cache invite
      ThreadManager: 0, // Không cache thread
      ThreadMemberManager: 0, // Không cache thread member
      ApplicationCommandManager: 0,
      BaseGuildEmojiManager: 0,
      VoiceStateManager: ttsEnabled ? 15 : 0, // Khi tắt TTS thì không cache bất kỳ voice state nào
    }),
    sweepers: {
      ...Options.DefaultSweeperSettings,
      messages: {
        interval: 60, // Mỗi 1 phút quét dọn tin nhắn cũ
        lifetime: 60, // Giải phóng tin nhắn cũ hơn 1 phút khỏi RAM
      },
      users: {
        interval: 60, // Mỗi 1 phút dọn user cache không còn tương tác
        filter: () => (user) => user.id !== user.client.user?.id,
      },
    },
  };
}

