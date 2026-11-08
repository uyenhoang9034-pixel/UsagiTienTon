import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import {
  getPrisonRecord,
  performLabor,
  buildPrisonReleasedPayloadV2,
  buildPrisonLaborProgressPayloadV2,
  PRISON_CHANNEL_ID,
} from '../../services/prisonService.js';
const LABOR_COOLDOWN_MS = 5_000;
const laborCooldowns = new Map();

export default {
  data: new SlashCommandBuilder()
    .setName('laudon')
    .setDescription('Lau dọn Nhà Tù để hoàn thành án phạt.'),
  category: 'moderation',

  async execute(interaction, config, client) {
    if (interaction.channelId !== PRISON_CHANNEL_ID) {
      return interaction.reply({
        content: `Chỉ có thể dùng **/laudon** trong <#${PRISON_CHANNEL_ID}>.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    const current = await getPrisonRecord(client, interaction.guildId, interaction.user.id);
    if (!current?.active) {
      return interaction.reply({
        content: 'Bạn hiện không phải phạm nhân.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const cooldownKey = `${interaction.guildId}:${interaction.user.id}`;
    const now = Date.now();
    const lastUsedAt = laborCooldowns.get(cooldownKey) || 0;
    const remainingMs = LABOR_COOLDOWN_MS - (now - lastUsedAt);

    if (remainingMs > 0) {
      const remainingSeconds = Math.max(1, Math.ceil(remainingMs / 1000));
      return interaction.reply({
        content: `<a:catg11:1546058047393239151> Nghỉ tay một chút! Bạn phải chờ **${remainingSeconds} giây** nữa mới có thể **/laudon** tiếp.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // Lock immediately so double interactions cannot count twice.
    laborCooldowns.set(cooldownKey, now);
    setTimeout(() => {
      if (laborCooldowns.get(cooldownKey) === now) {
        laborCooldowns.delete(cooldownKey);
      }
    }, LABOR_COOLDOWN_MS + 1000);

    await InteractionHelper.safeDefer(interaction);
    let result;
    try {
      result = await performLabor(client, interaction.member);
    } catch (error) {
      // A failed labor action must not consume the 5-second cooldown.
      laborCooldowns.delete(cooldownKey);
      throw error;
    }
    const record = result.record;

    if (result.status === 'released') {
      const payload = buildPrisonReleasedPayloadV2({
        userId: interaction.user.id,
        reason: record.reason,
        restoredRoleCount: record.restoredRoleCount,
        totalLabor: record.totalLabor,
      });
      return InteractionHelper.safeEditReply(interaction, payload);
    }

    const payload = buildPrisonLaborProgressPayloadV2({
      userId: interaction.user.id,
      completedLabor: record.completedLabor,
      remainingLabor: record.remainingLabor,
      totalLabor: record.totalLabor,
      isLastOne: result.status === 'last_one',
    });
    return InteractionHelper.safeEditReply(interaction, payload);
  },
};
