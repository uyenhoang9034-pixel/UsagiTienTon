import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';

import { logger } from '../../utils/logger.js';
import {
  ttsManager,
} from '../../services/tts/ttsManager.js';
import {
  TTS_VOICES,
  getVoiceById,
  getDefaultVoice,
  getVoiceChoices,
  SPEED_LEVELS,
} from '../../services/tts/ttsVoices.js';

const USAGI_COLOR = 0xF3AFC8; // Hồng pastel xinh xắn của em thỏ Usagi

/**
 * Tạo Embed hiển thị trạng thái và bảng điều khiển TTS
 */
export function buildTTSStatusEmbed(session, guild) {
  const voice = getVoiceById(session.voiceId);
  const modeText =
    session.mode === 'owner_only'
      ? '🔒 Chỉ nói thay vợ của Kim Nong (người gọi lệnh)'
      : '🌐 Nói thay tất cả mọi người chat trong kênh';

  const embed = new EmbedBuilder()
    .setColor(USAGI_COLOR)
    .setTitle('🐰 Em bot Usagi múp rụp đang nói thay nè!')
    .setDescription(
      `Dạ vợ của Kim Nong ơi, em đang túc trực trong phòng voice đây ạ! Chị chỉ cần chat vào kênh văn bản đã chọn, em sẽ tự động vào đọc to câu đó cho mọi người cùng nghe nha 💕`,
    )
    .addFields(
      {
        name: '🔊 Phòng Voice',
        value: `<#${session.voiceChannelId}>`,
        inline: true,
      },
      {
        name: '💬 Kênh Lắng Nghe',
        value: `<#${session.textChannelId}>`,
        inline: true,
      },
      {
        name: '🗣️ Giọng Đọc Hiện Tại',
        value: `${voice.flag} **${voice.name}**\n*${voice.description}*`,
        inline: false,
      },
      {
        name: '⚡ Tốc Độ Nói',
        value: `\`${session.speed}\``,
        inline: true,
      },
      {
        name: '⚙️ Chế Độ Đọc',
        value: modeText,
        inline: true,
      },
      {
        name: '📝 Hàng Đợi',
        value: `${session.queue.length} câu đang chờ`,
        inline: true,
      },
    )
    .setFooter({
      text: 'Usagi Tiên Tôn • Tính năng nói thay (TTS) cho vợ của Kim Nong',
    })
    .setTimestamp();

  return embed;
}

/**
 * Tạo các nút bấm điều khiển nhanh cho TTS
 */
export function buildTTSControlButtons(guildId, session) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`tts_button:toggle_mode:${guildId}`)
      .setLabel(session.mode === 'owner_only' ? 'Đổi: Đọc Mọi Người' : 'Đổi: Chỉ Mình Tôi')
      .setEmoji(session.mode === 'owner_only' ? '🌐' : '🔒')
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(`tts_button:open_voices:${guildId}`)
      .setLabel('Chọn Giọng Nói')
      .setEmoji('🗣️')
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(`tts_button:stop:${guildId}`)
      .setLabel('Rời Phòng Voice')
      .setEmoji('⏹️')
      .setStyle(ButtonStyle.Danger),
  );

  return [row];
}

/**
 * Tạo menu chọn giọng đọc dạng Select Menu
 */
export function buildVoiceSelectMenu(guildId, currentVoiceId) {
  const options = TTS_VOICES.slice(0, 25).map((v) => ({
    label: `${v.flag} ${v.name}`.slice(0, 100),
    value: v.id,
    description: `${v.gender} • ${v.description}`.slice(0, 100),
    default: v.id === currentVoiceId,
  }));

  const menu = new StringSelectMenuBuilder()
    .setCustomId(`tts_select_voice:${guildId}`)
    .setPlaceholder('Chọn một giọng đọc cho em Usagi...')
    .addOptions(options);

  return new ActionRowBuilder().addComponents(menu);
}

export default {
  data: new SlashCommandBuilder()
    .setName('tts')
    .setDescription('Lệnh nói thay cho em bot Usagi múp rụp 🐰')
    // Subcommand: vao
    .addSubcommand((sub) =>
      sub
        .setName('vao')
        .setDescription('Bảo em Usagi vào phòng voice và lắng nghe chat để nói thay chị nha 🐰')
        .addChannelOption((opt) =>
          opt
            .setName('kenh_chat')
            .setDescription('Kênh văn bản em sẽ lắng nghe (mặc định là kênh hiện tại)')
            .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
            .setRequired(false),
        )
        .addStringOption((opt) =>
          opt
            .setName('giong')
            .setDescription('Chọn giọng đọc khởi đầu cho em')
            .setRequired(false)
            .addChoices(...getVoiceChoices()),
        )
        .addStringOption((opt) =>
          opt
            .setName('chedo')
            .setDescription('Chọn đối tượng để em nói thay')
            .setRequired(false)
            .addChoices(
              { name: '🔒 Chỉ nói thay cho tôi (người gọi lệnh)', value: 'owner_only' },
              { name: '🌐 Nói thay cho tất cả mọi người trong kênh', value: 'all' },
            ),
        ),
    )
    // Subcommand: roi
    .addSubcommand((sub) =>
      sub
        .setName('roi')
        .setDescription('Bảo em Usagi rời khỏi phòng voice và nghỉ ngơi 💤'),
    )
    // Subcommand: giong
    .addSubcommand((sub) =>
      sub
        .setName('giong')
        .setDescription('Đổi giọng nói và ngôn ngữ cho em Usagi 🗣️')
        .addStringOption((opt) =>
          opt
            .setName('chon_giong')
            .setDescription('Chọn trực tiếp giọng đọc mong muốn')
            .setRequired(false)
            .addChoices(...getVoiceChoices()),
        ),
    )
    // Subcommand: tocdoc
    .addSubcommand((sub) =>
      sub
        .setName('tocdoc')
        .setDescription('Điều chỉnh tốc độ nói của em Usagi ⚡')
        .addStringOption((opt) =>
          opt
            .setName('muc_toc_do')
            .setDescription('Tốc độ đọc')
            .setRequired(true)
            .addChoices(
              ...SPEED_LEVELS.map((s) => ({
                name: s.label,
                value: s.value,
              })),
            ),
        ),
    )
    // Subcommand: chedo
    .addSubcommand((sub) =>
      sub
        .setName('chedo')
        .setDescription('Cài đặt đối tượng mà em Usagi sẽ nói thay 👥')
        .addStringOption((opt) =>
          opt
            .setName('che_do')
            .setDescription('Chế độ đọc tin nhắn')
            .setRequired(true)
            .addChoices(
              { name: '🔒 Chỉ mình tôi (người gọi lệnh)', value: 'owner_only' },
              { name: '🌐 Tất cả mọi người trong kênh', value: 'all' },
            ),
        ),
    )
    // Subcommand: trangthai
    .addSubcommand((sub) =>
      sub
        .setName('trangthai')
        .setDescription('Xem trạng thái phiên nói thay và bảng điều khiển nhanh 📊'),
    )
    // Subcommand: noi
    .addSubcommand((sub) =>
      sub
        .setName('noi')
        .setDescription('Bảo em Usagi nói ngay một câu bất kỳ trong phòng voice 📢')
        .addStringOption((opt) =>
          opt
            .setName('cau_noi')
            .setDescription('Nội dung câu nói chị muốn em đọc to')
            .setRequired(true)
            .setMaxLength(300),
        )
        .addStringOption((opt) =>
          opt
            .setName('giong')
            .setDescription('Giọng đọc riêng cho câu nói này (tùy chọn)')
            .setRequired(false)
            .addChoices(...getVoiceChoices()),
        ),
    ),

  category: 'Voice',

  async execute(interaction, client) {
    const subcommand = interaction.options.getSubcommand();
    const guild = interaction.guild;
    const member = interaction.member;

    if (!guild || !member) {
      return interaction.reply({
        content: 'Lệnh này chỉ dùng được trong máy chủ thôi nha vợ của Kim Nong ơi!',
        flags: MessageFlags.Ephemeral,
      });
    }

    try {
      // 1. SUBCOMMAND: vao (Bắt đầu nói thay)
      if (subcommand === 'vao') {
        const voiceChannel = member.voice?.channel;
        if (!voiceChannel) {
          return interaction.reply({
            content:
              '🐰 Vợ của Kim Nong ơi, chị chưa vào phòng voice nào hết á! Chị hãy vào một phòng voice trước rồi gọi em vào nha 💕',
            flags: MessageFlags.Ephemeral,
          });
        }

        const textChannel =
          interaction.options.getChannel('kenh_chat') || interaction.channel;
        const voiceId =
          interaction.options.getString('giong') || getDefaultVoice().id;
        const mode =
          interaction.options.getString('chedo') || 'owner_only';

        await interaction.deferReply();

        const session = await ttsManager.startSession({
          guild,
          voiceChannel,
          textChannel,
          ownerId: member.id,
          voiceId,
          mode,
          speed: '1.0x',
        });

        // Đọc câu chào mở đầu sau khi phòng voice đã kết nối hoàn tất
        setTimeout(() => {
          ttsManager
            .speakNow(
              guild.id,
              'Dạ vâng em bot Usagi múp rụp xin nghe lệnh vợ của Kim Nong ạ!',
              { voiceId: session.voiceId },
            )
            .catch((err) => {
              logger.warn('Failed to play welcome greeting:', err?.message);
            });
        }, 600);

        const embed = buildTTSStatusEmbed(session, guild);
        const components = buildTTSControlButtons(guild.id, session);

        return interaction.editReply({
          embeds: [embed],
          components,
        });
      }

      // 2. SUBCOMMAND: roi (Dừng và rời phòng)
      if (subcommand === 'roi') {
        if (!ttsManager.hasSession(guild.id)) {
          return interaction.reply({
            content: '🐰 Hiện tại em đâu có đang ở trong phòng voice nào đâu nè vợ của Kim Nong ơi!',
            flags: MessageFlags.Ephemeral,
          });
        }

        await ttsManager.stopSession(guild.id, 'Người dùng yêu cầu rời phòng');

        return interaction.reply({
          content:
            '💤 Dạ vâng, em bot Usagi múp rụp đã rời phòng voice rồi ạ! Khi nào vợ của Kim Nong cần em nói thay thì cứ gọi em nha 💕',
        });
      }

      // 3. SUBCOMMAND: giong (Đổi giọng nói)
      if (subcommand === 'giong') {
        const session = ttsManager.getSession(guild.id);
        const chosenVoiceId = interaction.options.getString('chon_giong');

        if (chosenVoiceId) {
          const newVoice = getVoiceById(chosenVoiceId);
          if (session) {
            ttsManager.setVoice(guild.id, newVoice.id);
          }

          return interaction.reply({
            content: `✨ Dạ vâng vợ của Kim Nong ơi, em đã đổi sang giọng: ${newVoice.flag} **${newVoice.name}** (${newVoice.description}) rồi nha! 🐰`,
          });
        }

        // Nếu không truyền tùy chọn, hiện menu chọn trực quan
        const currentVoiceId = session ? session.voiceId : getDefaultVoice().id;
        const selectMenuRow = buildVoiceSelectMenu(guild.id, currentVoiceId);

        const embed = new EmbedBuilder()
          .setColor(USAGI_COLOR)
          .setTitle('🗣️ Bảng Chọn Giọng Đọc Cho Em Usagi')
          .setDescription(
            `Vợ của Kim Nong hãy chọn một giọng đọc ở menu bên dưới nha! Em có đầy đủ giọng Việt chuẩn tự nhiên (Hoài My, Nam Minh, TikTok, Google) và các thứ tiếng Anh, Nhật anime waifu, Hàn, Trung, Pháp... siêu xịn luôn á! 💕`,
          )
          .setFooter({ text: 'Em bot Usagi múp rụp luôn sẵn sàng phục vụ!' });

        return interaction.reply({
          embeds: [embed],
          components: [selectMenuRow],
          flags: MessageFlags.Ephemeral,
        });
      }

      // 4. SUBCOMMAND: tocdoc (Đổi tốc độ đọc)
      if (subcommand === 'tocdoc') {
        const session = ttsManager.getSession(guild.id);
        const speed = interaction.options.getString('muc_toc_do');

        if (session) {
          ttsManager.setSpeed(guild.id, speed);
        }

        return interaction.reply({
          content: `⚡ Dạ vâng vợ của Kim Nong, em đã chỉnh tốc độ nói thành: \`${speed}\` rồi nha! 🐰`,
        });
      }

      // 5. SUBCOMMAND: chedo (Đổi chế độ đọc)
      if (subcommand === 'chedo') {
        const session = ttsManager.getSession(guild.id);
        const mode = interaction.options.getString('che_do');

        if (!session) {
          return interaction.reply({
            content: '🐰 Chưa có phiên nói thay nào đang hoạt động hết á. Chị hãy dùng `/tts vao` trước nha!',
            flags: MessageFlags.Ephemeral,
          });
        }

        ttsManager.setMode(guild.id, mode);
        const modeStr =
          mode === 'owner_only'
            ? '🔒 **Chỉ nói thay cho vợ của Kim Nong** (chỉ đọc tin nhắn của chị)'
            : '🌐 **Nói thay tất cả mọi người** trong kênh chat đã chọn';

        return interaction.reply({
          content: `⚙️ Dạ vâng vợ của Kim Nong, em đã đổi chế độ đọc thành: ${modeStr} ạ! 🐰`,
        });
      }

      // 6. SUBCOMMAND: trangthai (Xem trạng thái)
      if (subcommand === 'trangthai') {
        const session = ttsManager.getSession(guild.id);
        if (!session) {
          return interaction.reply({
            content:
              '🐰 Hiện tại em chưa vào phòng voice nào cả vợ của Kim Nong ơi! Chị dùng `/tts vao` để em vào nói thay chị nghen 💕',
            flags: MessageFlags.Ephemeral,
          });
        }

        const embed = buildTTSStatusEmbed(session, guild);
        const components = buildTTSControlButtons(guild.id, session);

        return interaction.reply({
          embeds: [embed],
          components,
        });
      }

      // 7. SUBCOMMAND: noi (Nói ngay 1 câu cụ thể)
      if (subcommand === 'noi') {
        const text = interaction.options.getString('cau_noi');
        const customVoice = interaction.options.getString('giong');

        let session = ttsManager.getSession(guild.id);

        // Nếu chưa kết nối phòng voice, tự động kết nối nếu người dùng đang ở trong voice
        if (!session) {
          const voiceChannel = member.voice?.channel;
          if (!voiceChannel) {
            return interaction.reply({
              content:
                '🐰 Vợ của Kim Nong ơi, chị phải vào 1 phòng voice thì em mới vào nói câu đó được chứ nè!',
              flags: MessageFlags.Ephemeral,
            });
          }

          await interaction.deferReply({ flags: MessageFlags.Ephemeral });

          session = await ttsManager.startSession({
            guild,
            voiceChannel,
            textChannel: interaction.channel,
            ownerId: member.id,
            voiceId: customVoice || getDefaultVoice().id,
          });
        } else {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        }

        await ttsManager.speakNow(guild.id, text, {
          voiceId: customVoice || session.voiceId,
          authorName: member.displayName,
          userId: member.id,
        });

        return interaction.editReply({
          content: `📢 Dạ em Usagi đang nói câu đó trong phòng voice rồi nha vợ của Kim Nong ơi: \n> "${text}" 💕`,
        });
      }
    } catch (error) {
      logger.error('TTS command execution error:', error);
      const errorMsg =
        error?.message || 'Có trục trặc nhỏ khi xử lý âm thanh rồi ạ!';

      if (interaction.deferred || interaction.replied) {
        return interaction.editReply({
          content: `❌ Ui vợ của Kim Nong ơi, có lỗi rồi nè: ${errorMsg}`,
        });
      }

      return interaction.reply({
        content: `❌ Ui vợ của Kim Nong ơi, có lỗi rồi nè: ${errorMsg}`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
