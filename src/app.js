import 'dotenv/config';

import {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
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

import {
  initializeMusic,
  initRiffyAfterReady,
} from './services/music/riffySetup.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

class UsagiTienTonBot extends Client {
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages,
      ],
      partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction,
        Partials.User,
      ],
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
    initializeMusic(this);
  }

  async loginWithRetry() {
    const maxAttempts = 8;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        await this.login(this.config.bot.token);
        return;
      } catch (error) {
        const status = Number(error?.status ?? error?.statusCode ?? error?.rawError?.status ?? 0);
        const message = String(error?.message ?? 'Unknown Discord login error');
        const isServerError = status >= 500 && status <= 599;
        const looksLikeServerError = /internal server error|bad gateway|service unavailable|gateway timeout/i.test(message);
        const retryable = isServerError || looksLikeServerError;

        if (!retryable || attempt === maxAttempts) {
          throw error;
        }

        const delayMs = Math.min(5000 * attempt, 30000);
        logger.warn(
          `Discord Gateway temporarily unavailable (${message}). ` +
          `Retry ${attempt}/${maxAttempts} in ${Math.round(delayMs / 1000)}s...`,
        );
        await sleep(delayMs);
      }
    }
  }

  async start() {
    try {
      startupLog('Starting Usagi Tiên Tôn...');

      const dbInstance = await initializeDatabase();
      this.db = dbInstance.db;

      this.startWebServer();

      await loadCommands(this);
      await this.loadHandlers();

      // Discord can occasionally return HTTP 5xx while fetching /gateway/bot.
      // Retry only temporary server-side failures; invalid tokens/config errors still fail fast.
      await this.loginWithRetry();

      initRiffyAfterReady(this);
      await this.registerCommands();

      startupLog(
        `ONLINE ✅ | ${this.commands.size} commands | ${this.buttons.size} buttons | ${this.selectMenus.size} menus`,
      );
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
        musicReady: Boolean(this.riffy),
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

bot.start();
