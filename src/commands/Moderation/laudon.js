import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { getPrisonRecord, performLabor, progressBar, PRISON_CHANNEL_ID } from '../../services/prisonService.js';

const PRISON_IMAGE_URL = 'https://files.catbox.moe/sv428x.png';
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
      const embed = new EmbedBuilder()
        .setColor(0xfceec9)
        .setTitle('<a:trangtrig2:1546040703375904801> 𝓤𝓼𝓪𝓰𝓲 · 𝓜𝓪̃𝓷 𝓗𝓪̣𝓷 𝓣𝓾̀ <a:trangtrig3:1546040818261954610>')
        .setDescription([
          '<a:trangtrig1:1546040442548654140> **TỰ DO!**',
          '',
          `<@${interaction.user.id}> đã hoàn thành toàn bộ hình phạt!`,
          `<a:trangtrig31:1546905996893626440> Lao động: **${record.totalLabor} / ${record.totalLabor} lần** ✅`,
          `<a:danceg1:1541433201904455832> Án phạt: **${record.reason}**`,
          '<a:danceg1:1541433201904455832> Trạng thái: **ĐÃ MÃN HẠN**',
          '',
          '━━━━━━━━━━━━━━━━━━━━',
          '<a:trangtrig6:1546043036390260756> Cửa Nhà Tù đã được mở.',
          '<a:trangtrig6:1546043036390260756> Các role trước khi thụ án đang được khôi phục.',
          '',
          '<a:catg11:1546058047393239151> Quản Ngục Usagi: *Lần sau ngoan nhé, không là vào lau tiếp đấy!*',
        ].join('\n'))
        .setImage(PRISON_IMAGE_URL);
      return InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
    }

    const bar = progressBar(record.completedLabor, record.totalLabor);
    const description = result.status === 'last_one'
      ? [
          `Cửa tù sắp mở rồi <@${interaction.user.id}> ơi...`,
          '',
          `<a:trangtrig31:1546905996893626440> Hoàn thành **${record.completedLabor} lần lao động**.`,
          '<a:capybarag1:1546058369566122015> Còn lại: **1 lần**',
          '',
          bar,
          '',
          '<a:catg11:1546058047393239151> Quản ngục Usagi: *Một lần cuối!*',
        ]
      : [
          `<@${interaction.user.id}> đang cặm cụi lau dọn nhà tù...`,
          '',
          '<a:trangtrig31:1546905996893626440> Hoàn thành **1 lần lao động**.',
          `<a:capybarag1:1546058369566122015> Còn lại: **${record.remainingLabor} lần**`,
          '',
          bar,
          '',
          '<a:catg11:1546058047393239151> Quản ngục Usagi: *Lau tiếp đi, sàn vẫn còn bẩn lắm!*',
        ];

    const embed = new EmbedBuilder().setColor(0xfceec9).setDescription(description.join('\n'));
    return InteractionHelper.safeEditReply(interaction, { embeds: [embed] });
  },
};
