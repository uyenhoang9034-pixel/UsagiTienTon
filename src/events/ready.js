import { Events } from 'discord.js';
import { logger } from '../utils/logger.js';
import { initRiffyAfterReady } from '../services/music/riffySetup.js';
import { getGameRolePanel, addAllGameRoleReactions } from '../services/gameRoleService.js';
export default {
  name: Events.ClientReady, once: true,
  async execute(client) {
    client.user.setPresence(client.config.bot.presence);
    initRiffyAfterReady(client);
    for (const guild of client.guilds.cache.values()) {
      try {
        const panel = await getGameRolePanel(client, guild.id);
        if (!panel) continue;
        const channel = await guild.channels.fetch(panel.channelId);
        const message = await channel?.messages?.fetch(panel.messageId);
        if (message?.author.id === client.user.id) await addAllGameRoleReactions(message);
      } catch (error) { logger.warn('Could not restore role panel reactions:', error); }
    }
    logger.info('UsagiTienTon ready: music, game roles, cultivation.');
  }
};
