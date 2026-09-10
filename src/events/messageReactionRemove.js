import { Events, PermissionFlagsBits } from 'discord.js';
import { getGameRoleByEmoji } from '../config/gameRoles.js';
import { logger } from '../utils/logger.js';

export default {
  name: Events.MessageReactionRemove,
  once: false,
  async execute(reaction, user) {
    try {
      if (!user || user.bot) return;
      if (reaction.partial) {
        try { await reaction.fetch(); } catch { return; }
      }
      let message = reaction.message;
      try { if (message.partial) message = await message.fetch(); } catch { return; }
      const guild = message.guild;
      if (!guild) return;
      const config = getGameRoleByEmoji(reaction.emoji);
      if (!config) return;
      const botId = guild.members.me?.id;
      if (!botId || message.author?.id !== botId) return;
      const panelTitle = message.embeds?.[0]?.title ?? '';
      if (!panelTitle.includes('𝓖𝓸́𝓬 𝓵𝓪̂́𝔂 𝓻𝓸𝓵𝓮')) return;
      const member = await guild.members.fetch(user.id).catch(() => null);
      if (!member) return;
      const role = await guild.roles.fetch(config.roleId).catch(() => null);
      if (!role) return;
      const botMember = guild.members.me ?? await guild.members.fetchMe().catch(() => null);
      if (!botMember) return;
      if (!botMember.permissions.has(PermissionFlagsBits.ManageRoles)) return;
      if (role.position >= botMember.roles.highest.position) return;
      if (!member.roles.cache.has(role.id)) return;
      await member.roles.remove(role.id, `Game Role reaction removed: ${config.label}`);
      logger.info(`[GAME ROLE] Đã gỡ ${role.name} khỏi ${member.user.tag}.`);
    } catch (error) {
      logger.error('[GAME ROLE] Lỗi gỡ role từ reaction:', error);
    }
  },
};
