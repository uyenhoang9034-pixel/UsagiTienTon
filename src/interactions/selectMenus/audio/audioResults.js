import {
  EmbedBuilder,
} from 'discord.js';

import audioManager from '../../../services/audio/audioManager.js';

import {
  ensurePlayer,
  startPlayback,
} from '../../../services/music/musicActions.js';

import {
  buildAudioPlayerDashboard,
  buildAudioSearchDashboard,
} from '../../../services/audio/audioDashboard.js';

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
      Number(track?.info?.length) ||
      0,

    thumbnail:
      track?.info?.artworkUrl ||
      track?.info?.thumbnail ||
      null,

    uri:
      track?.info?.uri ||
      null,
  };
}

function isPlayerIdle(player) {
  return Boolean(
    player &&
    !player.playing &&
    !player.paused &&
    !player.current,
  );
}

function getPlayerQueueLength(player) {
  return Number(
    player?.queue?.length || 0,
  );
}

export default {
  name: 'audioResults',

  async execute(
    interaction,
    client,
  ) {
    const session =
      audioManager.getOrCreateSession(
        interaction.guildId,
      );

    const selectedIndex =
      Number(
        interaction.values?.[0],
      );

    /*
     * =====================================================
     * VALIDATE SEARCH RESULT
     * =====================================================
     */

    if (
      !Number.isInteger(
        selectedIndex,
      ) ||
      selectedIndex < 0 ||
      selectedIndex >=
        (
          session.searchResults
            ?.length || 0
        )
    ) {
      return interaction.reply({
        content:
          '🌸 Kết quả tìm kiếm đã hết hạn. Hãy tìm lại nhé.',
        ephemeral: true,
      });
    }

    const result =
      session.searchResults[
        selectedIndex
      ];

    if (!result?.track) {
      return interaction.reply({
        content:
          '🌸 Audio này không còn khả dụng.',
        ephemeral: true,
      });
    }

    /*
     * =====================================================
     * VOICE CHANNEL
     * =====================================================
     */

    const voiceChannel =
      interaction.member?.voice
        ?.channel;

    if (!voiceChannel) {
      return interaction.reply({
        content:
          '🌸 Bạn cần vào voice channel trước khi nghe.',
        ephemeral: true,
      });
    }

    await interaction.deferUpdate();

    try {
      /*
       * ===================================================
       * GET RIFFY PLAYER
       * ===================================================
       */

     const {
  player,
} = await ensurePlayer(
  client,
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

      const track =
        result.track;

      /*
       * ===================================================
       * MARK AS USAGI AUDIO
       * ===================================================
       *
       * Music playerHandler sẽ bỏ qua track này.
       */

      track.info ??= {};

      track.info.__usagiAudio =
        true;

      track.info.requester =
        interaction.user;

      /*
       * ===================================================
       * MARK PLAYER AS AUDIO PLAYER
       * ===================================================
       *
       * Rất quan trọng:
       * Music playerHandler sẽ không được phép
       * xử lý Audio player này.
       */

      player.__usagiAudio =
        true;

      /*
       * ===================================================
       * SESSION DATA
       * ===================================================
       */

      session.queue ??= [];
      session.audioActive =
  true;

      session.voiceChannelId =
        voiceChannel.id;

      session.textChannelId =
        interaction.channelId;

      session.dashboardMessageId =
        interaction.message?.id ||
        session.dashboardMessageId;

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

      /*
       * ===================================================
       * ADD TO AUDIO SESSION QUEUE
       * ===================================================
       */

      const sessionTrack =
        createSessionTrack(
          track,
        );

      session.queue.push(
        sessionTrack,
      );

      /*
       * ===================================================
       * IMPORTANT:
       * ADD TRACK TO RIFFY QUEUE
       * ===================================================
       *
       * Đây là phần bị thiếu ở bản cũ.
       *
       * session.queue chỉ là queue của hệ thống Audio.
       * Riffy muốn phát phải có track trong:
       *
       *     player.queue
       *
       * Nếu không có dòng này:
       *
       *     player.queue.add(track)
       *
       * thì player.play() sẽ báo:
       *
       *     Queue is empty (length: 0)
       */

      if (!player.queue) {
        throw new Error(
          'Riffy player queue is unavailable.',
        );
      }

      player.queue.add(
        track,
      );

      /*
       * ===================================================
       * VOLUME
       * ===================================================
       */

      player.setVolume(
        session.volume,
      );

      /*
       * ===================================================
       * SAVE DASHBOARD DATA
       * ===================================================
       */

      session.lastSelectedTrack =
        sessionTrack;

      /*
       * ===================================================
       * DETERMINE WHETHER PLAYBACK SHOULD START
       * ===================================================
       */

      const wasIdle =
        isPlayerIdle(
          player,
        );

      /*
       * ===================================================
       * START PLAYBACK
       * ===================================================
       *
       * Chỉ gọi play khi player thực sự idle.
       *
       * Nếu Audio đang phát:
       * track mới sẽ nằm trong queue.
       *
       * Nếu Music đang phát:
       * Audio sẽ không tự gọi play đè lên Music.
       *
       * Trong trường hợp player đã có current Music,
       * dashboard vẫn giữ nguyên trạng thái cho đến
       * khi Music kết thúc / được stop.
       */

      if (wasIdle) {
        await startPlayback(
          player,
        );
      }

      /*
       * ===================================================
       * DETERMINE CURRENT TRACK
       * ===================================================
       */

      const currentTrack =
        player.current ||
        (
          wasIdle
            ? track
            : null
        );

      /*
       * Nếu player không có current sau khi
       * startPlayback(), kiểm tra lại queue.
       */

      if (
        wasIdle &&
        !currentTrack
      ) {
        throw new Error(
          `Audio was added to Riffy queue but playback did not start. Queue length: ${getPlayerQueueLength(player)}`,
        );
      }

      /*
       * ===================================================
       * UPDATE SESSION STATE
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

      /*
       * ===================================================
       * BUILD PLAYER DASHBOARD
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

      /*
       * ===================================================
       * TRACK QUEUED WHILE ANOTHER TRACK IS PLAYING
       * ===================================================
       *
       * Không được hiển thị như đang phát track mới.
       */

      const activeTrack =
        player.current;

      if (activeTrack) {
        return interaction.editReply(
          buildAudioPlayerDashboard(
            activeTrack,
            player,
            session,
          ),
        );
      }

      /*
       * Trường hợp bất thường:
       * track đã được add nhưng player không có current.
       */

      throw new Error(
        `Audio track was queued but Riffy has no active track. Queue length: ${getPlayerQueueLength(player)}`,
      );
    } catch (error) {
      /*
       * ===================================================
       * PLAYBACK ERROR
       * ===================================================
       *
       * KHÔNG xóa buttons.
       * KHÔNG để dashboard biến mất.
       */

      const errorMessage =
        error?.message ||
        error?.error ||
        'Unknown playback error';

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setTitle(
              '🌸 Usagi chưa thể phát audio',
            )
            .setDescription(
              [
                'YouTube đã trả về kết quả nhưng Lavalink chưa thể phát audio này.',

                '',

                `🔎 **${
                  result?.title ||
                  result?.track?.info?.title ||
                  'Audio'
                }**`,

                '',

                `⚠️ ${String(
                  errorMessage,
                ).slice(
                  0,
                  1500,
                )}`,

                '',

                'Bạn có thể tìm một kết quả khác bằng nút **Search** bên dưới.',
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
