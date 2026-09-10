import {
  SlashCommandBuilder,
  EmbedBuilder,
} from 'discord.js';

import audioManager from '../../services/audio/audioManager.js';

import {
  buildAudioSearchDashboard,
  buildAudioPlayerDashboard,
} from '../../services/audio/audioDashboard.js';

import {
  searchYouTubeAudio,
  isYouTubeUrl,
} from '../../services/audio/audioYouTube.js';

import {
  ensurePlayer,
  startPlayback,
} from '../../services/music/musicActions.js';

/**
 * =========================================================
 * CREATE SESSION TRACK
 * =========================================================
 */

function createSessionTrack(track) {
  return {
    track,

    title:
      track?.info?.title ||
      'Unknown Audio',

    author:
      track?.info?.author ||
      'Unknown',

    duration:
      Number(
        track?.info?.length,
      ) || 0,

    thumbnail:
      track?.info?.artworkUrl ||
      track?.info?.thumbnail ||
      null,

    uri:
      track?.info?.uri ||
      null,
  };
}

/**
 * =========================================================
 * CHECK PLAYER IDLE
 * =========================================================
 */

function isPlayerIdle(player) {
  return Boolean(
    player &&
    !player.playing &&
    !player.paused &&
    !player.current,
  );
}

/**
 * =========================================================
 * AUDIO COMMAND
 * =========================================================
 */

export default {
  data: new SlashCommandBuilder()
    .setName('audio')
    .setDescription(
      'Mở hệ thống Usagi Audio hoặc phát trực tiếp từ YouTube.',
    )
    .addStringOption(
      (option) =>
        option
          .setName('input')
          .setDescription(
            'Tên audio hoặc link YouTube',
          )
          .setRequired(false),
    ),

  async execute(
    interaction,
    guildConfig,
    client,
  ) {
    /**
     * =====================================================
     * SERVER ONLY
     * =====================================================
     */

    if (!interaction.guild) {
      return interaction.reply({
        content:
          '🌸 Lệnh này chỉ có thể sử dụng trong server.',
        ephemeral: true,
      });
    }

    /**
     * =====================================================
     * REAL DISCORD CLIENT
     * =====================================================
     */

    const runtimeClient =
      interaction.client;

    if (!runtimeClient) {
      return interaction.reply({
        content:
          '🌸 Không thể kết nối với hệ thống bot.',
        ephemeral: true,
      });
    }

    const guildId =
      interaction.guild.id;

    const channelId =
      interaction.channelId;

    /**
     * =====================================================
     * AUDIO SESSION
     * =====================================================
     */

    const session =
      audioManager.getOrCreateSession(
        guildId,
      );

    /**
     * =====================================================
     * AUDIO TEXT CHANNEL
     * =====================================================
     */

    if (
      session.audioChannelId &&
      !audioManager.isAllowedChannel(
        guildId,
        channelId,
      )
    ) {
      return interaction.reply({
        content:
          '🌸 Hệ thống Audio chỉ có thể sử dụng trong kênh Audio được thiết lập.',
        ephemeral: true,
      });
    }

    /**
     * =====================================================
     * INPUT
     * =====================================================
     */

    const input =
      interaction.options
        .getString('input')
        ?.trim();

    /**
     * =====================================================
     * NORMAL /AUDIO
     * =====================================================
     *
     * /audio
     *
     * → mở Search Audio Dashboard.
     */

    if (!input) {
      session.textChannelId =
        channelId;

      return interaction.reply(
        buildAudioSearchDashboard(),
      );
    }

    /**
     * =====================================================
     * VOICE CHANNEL
     * =====================================================
     *
     * Kiểm tra voice trước khi resolve.
     */

    const voiceChannel =
      interaction.member?.voice
        ?.channel;

    if (!voiceChannel) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setTitle(
              '🌸 Chưa vào voice channel',
            )
            .setDescription(
              'Bạn cần vào voice channel trước khi phát audio nhé ♡',
            )
            .setColor(
              0xed4245,
            ),
        ],

        components:
          buildAudioSearchDashboard()
            .components,
      });
    }

    /**
     * =====================================================
     * DEFER
     * =====================================================
     */

    await interaction.deferReply();

    try {
      /**
       * ===================================================
       * IMPORTANT:
       * CREATE RIFFY PLAYER FIRST
       * ===================================================
       *
       * Đây là phần sửa lỗi chính.
       *
       * Trước đây:
       *
       *     resolve YouTube
       *         ↓
       *     createConnection
       *         ↓
       *     play
       *
       * Có thể khiến Riffy chưa nhận đủ
       * Voice State / Voice Server Update.
       *
       * Bây giờ:
       *
       *     createConnection
       *         ↓
       *     resolve YouTube
       *         ↓
       *     add queue
       *         ↓
       *     play
       *
       * Trong thời gian Lavalink resolve YouTube,
       * voice connection có thời gian được thiết lập.
       */

      const {
        player,
      } = await ensurePlayer(
        runtimeClient,
        interaction,
        {
          allowAudio: true,
        },
      );

      if (!player) {
        throw new Error(
          'Riffy player could not be created.',
        );
      }

      /**
       * Đánh dấu player thuộc Audio.
       *
       * Music playerHandler sẽ bỏ qua player này.
       */

      player.__usagiAudio =
        true;

      /**
       * ===================================================
       * DETECT YOUTUBE URL
       * ===================================================
       */

      const directYouTube =
        isYouTubeUrl(
          input,
        );

      /**
       * ===================================================
       * SEARCH / RESOLVE
       * ===================================================
       *
       * YouTube URL:
       *
       *     lấy đúng 1 video.
       *
       * Keyword:
       *
       *     lấy kết quả đầu tiên.
       */

      const results =
        await searchYouTubeAudio(
          runtimeClient,
          input,
          interaction.user,
        );

      /**
       * ===================================================
       * NO RESULTS
       * ===================================================
       */

      if (!results.length) {
        return interaction.editReply({
          embeds: [
            new EmbedBuilder()
              .setTitle(
                '🌸 Usagi không tìm thấy audio',
              )
              .setDescription(
                [
                  directYouTube
                    ? 'Usagi không thể lấy audio từ link YouTube này.'
                    : 'Usagi không tìm thấy video phù hợp trên **YouTube**.',
                  '',
                  '🔎 **Bạn đã nhập:**',
                  `> ${input}`,
                  '',
                  directYouTube
                    ? 'Hãy thử một link YouTube khác nhé ♡'
                    : 'Hãy thử một từ khóa khác nhé ♡',
                ].join('\n'),
              )
              .setColor(
                0xffb6d9,
              ),
          ],

          components:
            buildAudioSearchDashboard()
              .components,
        });
      }

      /**
       * ===================================================
       * ONLY ONE TRACK
       * ===================================================
       *
       * Mỗi /audio input:<link>
       *
       * → chỉ lấy results[0].
       *
       * Không playlist.
       * Không tự lấy thêm video.
       */

      const result =
        results[0];

      if (!result?.track) {
        throw new Error(
          'YouTube returned an invalid audio track.',
        );
      }

      const track =
        result.track;

      /**
       * ===================================================
       * MARK AUDIO TRACK
       * ===================================================
       */

      track.info ??= {};

      track.info.__usagiAudio =
        true;

      track.info.requester =
        interaction.user;

      /**
       * ===================================================
       * SESSION
       * ===================================================
       */

      session.queue ??= [];

      session.audioActive =
        true;

      session.voiceChannelId =
        voiceChannel.id;

      session.textChannelId =
        channelId;

      session.volume =
        Math.max(
          0,
          Math.min(
            100,
            Number(
              session.volume ?? 100,
            ),
          ),
        );

      /**
       * ===================================================
       * CREATE SESSION TRACK
       * ===================================================
       */

      const sessionTrack =
        createSessionTrack(
          track,
        );

      /**
       * ===================================================
       * CHECK PLAYER STATE
       * ===================================================
       */

      const wasIdle =
        isPlayerIdle(
          player,
        );

      /**
       * ===================================================
       * ADD TO AUDIO SESSION QUEUE
       * ===================================================
       */

      session.queue.push(
        sessionTrack,
      );

      session.lastSelectedTrack =
        sessionTrack;

      /**
       * ===================================================
       * ADD TO RIFFY QUEUE
       * ===================================================
       *
       * Chỉ add đúng 1 track.
       */

      if (!player.queue) {
        throw new Error(
          'Riffy player queue is unavailable.',
        );
      }

      player.queue.add(
        track,
      );

      /**
       * ===================================================
       * VOLUME
       * ===================================================
       */

      player.setVolume(
        session.volume,
      );

      /**
       * ===================================================
       * START PLAYBACK
       * ===================================================
       *
       * Chỉ play nếu player đang idle.
       *
       * Nếu đang phát:
       *
       *     → track mới nằm trong queue.
       *
       * Không cắt bài hiện tại.
       */

      if (wasIdle) {
        await startPlayback(
          player,
        );
      }

      /**
       * ===================================================
       * CURRENT TRACK
       * ===================================================
       */

      const currentTrack =
        player.current ||
        (
          wasIdle
            ? track
            : null
        );

      /**
       * ===================================================
       * UPDATE SESSION
       * ===================================================
       */

      if (currentTrack) {
        session.currentTrack =
          createSessionTrack(
            currentTrack,
          );
      }

      session.isPlaying =
        Boolean(
          player.playing,
        );

      session.isPaused =
        Boolean(
          player.paused,
        );

      /**
       * ===================================================
       * PLAYER DASHBOARD
       * ===================================================
       */

      if (currentTrack) {
        return interaction.editReply(
          buildAudioPlayerDashboard(
            currentTrack,
            player,
            session,
          ),
        );
      }

      /**
       * ===================================================
       * TRACK QUEUED
       * ===================================================
       *
       * Nếu đang có bài khác phát:
       *
       *     giữ dashboard của bài hiện tại.
       */

      if (player.current) {
        return interaction.editReply(
          buildAudioPlayerDashboard(
            player.current,
            player,
            session,
          ),
        );
      }

      /**
       * ===================================================
       * SAFETY CHECK
       * ===================================================
       */

      throw new Error(
        `Audio was queued but playback did not start. Queue length: ${
          player.queue?.length || 0
        }`,
      );
    } catch (error) {
      /**
       * ===================================================
       * ERROR LOG
       * ===================================================
       */

      console.error(
        '[USAGI AUDIO]',
        error,
      );

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle(
              '🌸 Usagi chưa thể phát audio',
            )
            .setDescription(
              [
                'YouTube đã nhận được yêu cầu nhưng Lavalink chưa thể phát audio này.',
                '',
                `🔎 **${input}**`,
                '',
                `⚠️ ${
                  error?.message ||
                  'Unknown playback error'
                }`,
                '',
                'Bạn có thể thử một link YouTube khác hoặc dùng Search Audio.',
              ].join('\n'),
            )
            .setColor(
              0xed4245,
            ),
        ],

        components:
          buildAudioSearchDashboard()
            .components,
      });
    }
  },
};
