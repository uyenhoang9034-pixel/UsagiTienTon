import 'dotenv/config';

import {
  Client,
  Collection,
  GatewayIntentBits,
  Options,
  Partials,
  Routes,
} from 'discord.js';

import { REST } from '@discordjs/rest';
import express from 'express';

import config from './config/application.js';

import {
  initializeDatabase,
} from './utils/database.js';

import {
  logger,
  startupLog,
  shutdownLog,
} from './utils/logger.js';

import {
  loadCommands,
  registerCommands as registerSlashCommands,
} from './handlers/loaders/commandLoader.js';


const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class UsagiTienTonBot extends Client {
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
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
        RoleManager: 10, // Giới hạn tối đa 10 role mỗi guild
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
        VoiceStateManager: 15, // Giới hạn 15 voice state cần thiết
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
    });

    this.config = config;
    this.commands = new Collection();
    this.events = new Collection();
    this.buttons = new Collection();
    this.selectMenus = new Collection();
    this.modals = new Collection();
    this.cooldowns = new Collection();
    this.db = null;

    this.rest = new REST({ version: '10' }).setToken(config.bot.token);
  }

  async diagnoseDiscordIdentity() {
    if (!this.config.bot.token) {
      throw new Error('DISCORD_TOKEN/TOKEN is missing.');
    }

    startupLog('Checking Discord bot token and application identity...');

    try {
      const botUser = await this.rest.get(Routes.user('@me'));
      const configuredClientId = String(this.config.bot.clientId || '').trim();
      const actualBotId = String(botUser?.id || '').trim();
      const botName = botUser?.username || 'unknown';

      startupLog(`Discord REST authentication OK ✅ | Bot: ${botName} | Bot ID: ${actualBotId}`);

      if (!actualBotId) {
        throw new Error('Discord /users/@me returned no bot ID.');
      }

      if (!configuredClientId) {
        logger.warn(`CLIENT_ID is missing. Expected CLIENT_ID=${actualBotId}`);
      } else if (configuredClientId !== actualBotId) {
        throw new Error(
          `CLIENT_ID mismatch: Railway CLIENT_ID=${configuredClientId}, but DISCORD_TOKEN belongs to bot ID=${actualBotId}.`,
        );
      } else {
        startupLog('CLIENT_ID matches the authenticated bot token ✅');
      }
    } catch (error) {
      const status = Number(error?.status ?? error?.statusCode ?? error?.rawError?.status ?? 0);
      const code = error?.code ?? error?.rawError?.code ?? 'unknown';
      const message = String(error?.message ?? 'Unknown Discord REST error');

      logger.error(
        `Discord identity check failed | HTTP ${status || 'unknown'} | code ${code} | ${message}`,
      );
      throw error;
    }
  }

  async loginWithRetry() {
    const maxAttempts = 8;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        startupLog(`Connecting to Discord Gateway... attempt ${attempt}/${maxAttempts}`);
        await this.login(this.config.bot.token);
        startupLog('Discord Gateway login successful ✅');
        return;
      } catch (error) {
        const status = Number(error?.status ?? error?.statusCode ?? error?.rawError?.status ?? 0);
        const code = error?.code ?? error?.rawError?.code ?? 'unknown';
        const message = String(error?.message ?? 'Unknown Discord login error');
        const isServerError = status >= 500 && status <= 599;
        const looksLikeServerError = /internal server error|bad gateway|service unavailable|gateway timeout/i.test(message);
        const retryable = isServerError || looksLikeServerError;

        logger.error(
          `Discord Gateway attempt ${attempt} failed | HTTP ${status || 'unknown'} | code ${code} | ${message}`,
        );

        if (!retryable || attempt === maxAttempts) {
          throw error;
        }

        const delayMs = Math.min(5000 * attempt, 30000);
        logger.warn(`Temporary Discord Gateway failure. Retrying in ${Math.round(delayMs / 1000)}s...`);
        await sleep(delayMs);
      }
    }
  }

  async start() {
    try {
      startupLog('Starting Usagi Tiên Tôn...');

      // Khởi động Web Server ngay lập tức để Railway Healthcheck (/health) đạt 200 OK ngay từ giây đầu tiên
      this.startWebServer();

      const dbInstance = await initializeDatabase();
      this.db = dbInstance.db;

      await loadCommands(this);
      await this.loadHandlers();

      // Verify the token and CLIENT_ID independently of the Gateway.
      // This never prints the token itself.
      await this.diagnoseDiscordIdentity();

      await this.loginWithRetry();

      await this.registerCommands();

      startupLog(
        `ONLINE ✅ | ${this.commands.size} commands | ${this.buttons.size} buttons | ${this.selectMenus.size} menus`,
      );

      const engines = [];
      if (process.env.GROQ_API_KEY) engines.push('Groq ⚡');
      if (process.env.GEMINI_API_KEY) engines.push('Google Gemini 🌟');
      if (process.env.OPENROUTER_API_KEY) engines.push('OpenRouter 🌐');
      if (process.env.OPENAI_API_KEY) engines.push('OpenAI 🧠');
      engines.push('Pollinations Backup 🛡️');

      startupLog(`AI Engines Active: ${engines.join(' -> ')} ✅`);
    } catch (error) {
      logger.error('Failed to start Usagi Tiên Tôn:', error);
      process.exit(1);
    }
  }

  startWebServer() {
    const app = express();
    const port = Number(
      this.config.api?.port ||
      process.env.PORT ||
      3000,
    );
    const host = process.env.WEB_HOST || '0.0.0.0';

    app.get('/', (_req, res) =>
      res.status(200).json({
        bot: 'UsagiTienTon',
        status: 'online',
        uptime: process.uptime(),
      }),
    );

    app.get('/health', (_req, res) =>
      res.status(200).json({
        status: 'healthy',
        discordReady: this.isReady(),
        uptime: process.uptime(),
      }),
    );

    this.webServer = app.listen(port, host, () => {
      startupLog(`Web server listening on ${host}:${port}`);
    });

    this.webServer.on('error', (error) => {
      logger.error('Web server error:', error);
    });
  }

  async loadHandlers() {
    const events = (
      await import('./handlers/loaders/events.js')
    ).default;

    const interactions = (
      await import('./handlers/loaders/interactions.js')
    ).default;

    await events(this);
    await interactions(this);
  }

  async registerCommands() {
    try {
      await registerSlashCommands(this, {
        clientId: this.config.bot.clientId,
      });
    } catch (error) {
      logger.error('Slash command registration error:', error);
    }
  }

  async shutdown(reason = 'UNKNOWN') {
    shutdownLog(`Usagi Tiên Tôn shutting down (${reason})...`);

    try {
      if (this.webServer) {
        await new Promise((resolve) => this.webServer.close(resolve));
      }

      if (this.isReady()) {
        this.destroy();
      }
    } finally {
      process.exit(0);
    }
  }
}

const bot = new UsagiTienTonBot();

process.on('SIGTERM', () => bot.shutdown('SIGTERM'));
process.on('SIGINT', () => bot.shutdown('SIGINT'));

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection:', error);
});

// Nếu runtime có cờ --expose-gc, tự động dọn rác bộ nhớ (GC) định kỳ và bảo vệ chống OOM trên Railway
if (typeof global.gc === 'function') {
  startupLog('Garbage Collection (global.gc) is active ✅');

  // Chạy GC chủ động định kỳ mỗi 30 giây để thu hồi bộ nhớ ngay lập tức
  setInterval(() => {
    try {
      global.gc();
    } catch {}
  }, 30 * 1000).unref();

  // Memory Guard: Quét mỗi 15s, nếu heapUsed > 70MB hoặc RSS > 130MB thì lập tức cưỡng chế GC
  setInterval(() => {
    try {
      const mem = process.memoryUsage();
      const heapUsedMB = mem.heapUsed / 1024 / 1024;
      const rssMB = mem.rss / 1024 / 1024;
      if (heapUsedMB > 70 || rssMB > 130) {
        global.gc();
        logger.warn(
          `[Memory Guard] Cưỡng chế GC do chạm ngưỡng RAM! HeapUsed: ${heapUsedMB.toFixed(1)}MB, RSS: ${rssMB.toFixed(1)}MB`,
        );
      }
    } catch {}
  }, 15 * 1000).unref();
}

bot.start();
