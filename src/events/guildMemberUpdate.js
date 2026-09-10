import { Events } from 'discord.js';
import { GAME_ROLE_IDS } from '../config/gameRoles.js';
import { sendGameRoleNotification } from '../services/gameRoleService.js';
import { logger } from '../utils/logger.js';

export default {
  name: Events.GuildMemberUpdate,
  once: false,
  async execute(oldMember, newMember) {
    try {
      if (!newMember?.guild || newMember.user?.bot) return;
      const addedGameRoleIds = GAME_ROLE_IDS.filter(
        (roleId) => !oldMember.roles.cache.has(roleId) && newMember.roles.cache.has(roleId),
      );
      for (const roleId of addedGameRoleIds) {
        await sendGameRoleNotification(newMember, roleId);
      }
    } catch (error) {
      logger.error('[GAME ROLE] guildMemberUpdate error:', error);
    }
  },
};
