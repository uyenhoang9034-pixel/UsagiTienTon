import { MessageFlags } from 'discord.js';
import { HSK_ADMIN_ROLE_ID, HSK_EMOJIS } from '../../config/hskConfig.js';
import {
  buildHskAdminPanelPayloadV2,
  buildHskNoticePayloadV2,
  buildPersonalHubPayloadV2,
  getActiveHskArenaRound,
  getHskGuildConfig,
  getHskNow,
  getHskUserProgress,
  isHskAdmin,
  saveHskGuildConfig,
  saveHskUserProgress,
  setPersonalSession,
  withHskGuildLock,
  withHskUserLock,
} from '../../services/hskService.js';
import { logger } from '../../utils/logger.js';

function isPublicOriginMessage(interaction) {
  if (!interaction?.message) return false;
  const rawFlags = Number(interaction.message.flags?.bitfield ?? interaction.message.flags ?? 0);
  return (rawFlags & MessageFlags.Ephemeral) === 0;
}

export default [
  {
    name: 'hsk_select_band',
    async execute(interaction, client, args = []) {
      const botClient = client || interaction.client;
      try {
        const ownerIdArg = args[0];
        const actorId = String(interaction.user.id);
        const scopeGuildId = String(interaction.guildId || 'dm');
        const isOwner = !ownerIdArg || String(ownerIdArg) === actorId;
        const selectedVal = Number.parseInt(interaction.values?.[0] ?? '1', 10);
        const nowMs = getHskNow(botClient);

        const updatedProgress = await withHskUserLock(scopeGuildId, actorId, async () => {
          const p = await getHskUserProgress(botClient, scopeGuildId, actorId);
          p.selectedBand = Number.isInteger(selectedVal) && selectedVal >= 1 && selectedVal <= 7 ? selectedVal : 1;
          return saveHskUserProgress(botClient, scopeGuildId, actorId, p);
        });

        setPersonalSession(scopeGuildId, actorId, { quizQuestion: null, flashWordId: null }, nowMs);

        const payload = buildPersonalHubPayloadV2({
          ownerId: actorId,
          progress: updatedProgress,
          ephemeral: isOwner ? !isPublicOriginMessage(interaction) : true,
          nowMs,
        });

        if (isOwner && typeof interaction.update === 'function') {
          await interaction.update(payload).catch(async () => {
            await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral | (payload.flags || 0) });
          });
        } else {
          await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral | (payload.flags || 0) });
        }
      } catch (error) {
        logger.error('[HskMenus] Lỗi select hsk_select_band:', error);
      }
    },
  },

  {
    name: 'hsk_admin_select_band',
    async execute(interaction, client) {
      const botClient = client || interaction.client;
      try {
        if (!interaction.guildId) return;
        if (!isHskAdmin(interaction.member, interaction.user.id, interaction.guild, interaction.memberPermissions)) {
          return interaction.reply(
            buildHskNoticePayloadV2({
              title: 'KHÔNG CÓ QUYỀN QUẢN TRỊ',
              message: `${HSK_EMOJIS.ADMIN_DISABLE} Chỉ thành viên có role <@&${HSK_ADMIN_ROLE_ID}> hoặc Admin server mới đổi được cấp độ Đấu trường nha!`,
              ephemeral: true,
            }),
          );
        }

        const levelKey = String(interaction.values?.[0] || '1');
        const updatedConfig = await withHskGuildLock(interaction.guildId, async () => {
          const cfg = await getHskGuildConfig(botClient, interaction.guildId);
          cfg.arenaLevelKey = levelKey;
          return saveHskGuildConfig(botClient, interaction.guildId, cfg);
        });

        await interaction.update(
          buildHskAdminPanelPayloadV2(
            updatedConfig,
            getActiveHskArenaRound(interaction.guildId),
            getHskNow(botClient),
          ),
        );
      } catch (error) {
        logger.error('[HskMenus] Lỗi select hsk_admin_select_band:', error);
      }
    },
  },
];

