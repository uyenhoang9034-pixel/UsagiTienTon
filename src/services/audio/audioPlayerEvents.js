import {
  EmbedBuilder,
} from 'discord.js';

import audioManager from './audioManager.js';

import {
  buildAudioPlayerDashboard,
  buildAudioSearchDashboard,
} from './audioDashboard.js';

import {
  logger,
} from '../../utils/logger.js';

function isAudioTrack(track) {
  return Boolean(
    track?.info?.__usagiAudio,
  );
}

function isAudioPlayer(player) {
  if (player?.__usagiAudio) {
    return true;
  }

  if (
    isAudioTrack(
      player?.current,
    )
  ) {
    return true;
  }

  return false;
}

function getSession(player) {
  if (!player?.guildId) {
    return null;
  }

  return audioManager.getSession(
    player.guildId,
  );
}

function createTrackData(track) {
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

async function getDashboardMessage(
  client,
  session,
) {
  if (
    !session?.dashboardMessageId ||
    !session?.textChannelId
  ) {
    return null;
  }

  try {
    const channel =
      client.channels.cache.get(
        session.textChannelId,
      );

    if (!channel) {
      return null;
    }

    return await channel.messages.fetch(
      session.dashboardMessageId,
    );
  } catch {
    return null;
  }
}

async function updateDashboard(
  client,
  player,
  session,
) {
  const message =
    await getDashboardMessage(
      client,
      session,
    );

  if (!message) {
    return;
  }

  if (!player?.current) {
    await message.edit(
      buildAudioSearchDashboard(),
    );

    return;
  }

  await message.edit(
    buildAudioPlayerDashboard(
      player.current,
      player,
      session,
    ),
  );
}

export function setupAudioPlayerEvents(
  client,
) {
  if (!client?.riffy) {
    logger.warn(
      '[Audio] Riffy is not initialized; Audio events were not attached.',
    );

    return;
  }

  /*
   * ========================================================
   * TRACK START
   * ========================================================
   */
  client.riffy.on(
    'trackStart',
    async (
      player,
      track,
    ) => {
      if (
        !isAudioTrack(track) &&
        !isAudioPlayer(player)
      ) {
        return;
      }

      const session =
        getSession(player);

      if (!session) {
        return;
      }

      player.__usagiAudio =
  true;

session.audioActive =
  true;

session.currentTrack =
        createTrackData(
          track,
        );

      session.isPlaying =
        true;

      session.isPaused =
        false;

      /*
       * Xác định track hiện tại
       * trong Audio queue.
       */
      const index =
        session.queue?.findIndex(
          (item) =>
            item?.uri ===
            track?.info?.uri,
        );

      if (
        index !== undefined &&
        index >= 0
      ) {
        /*
         * Không xóa queue.
         * Chỉ đảm bảo currentTrack
         * đúng với track đang phát.
         */
      }

      await updateDashboard(
        client,
        player,
        session,
      );
    },
  );

  /*
   * ========================================================
   * TRACK ERROR
   * ========================================================
   */
  client.riffy.on(
    'trackError',
    async (
      player,
      track,
      payload,
    ) => {
      if (
        !isAudioTrack(track) &&
        !isAudioPlayer(player)
      ) {
        return;
      }

      const session =
        getSession(player);

      if (!session) {
        return;
      }

      const errorMessage =
        payload?.error ||
        payload?.message ||
        payload?.cause?.message ||
        'Unknown Lavalink error';

      logger.error(
        `[Audio] Track error in ${player.guildId} for "${track?.info?.title}":`,
        payload,
      );

      const nextTrack =
        player.queue?.[0];

      /*
       * Nếu còn queue:
       * chuyển tiếp.
       */
      if (nextTrack) {
        try {
          player.stop();

          session.isPlaying =
            true;

          session.isPaused =
            false;

          return;
        } catch (error) {
          logger.error(
            '[Audio] Failed to skip errored track:',
            error,
          );
        }
      }

      /*
       * Không còn queue.
       *
       * GIỮ DASHBOARD,
       * không xóa nút.
       */
      const message =
        await getDashboardMessage(
          client,
          session,
        );

      if (!message) {
        return;
      }

      await message.edit({
        embeds: [
          new EmbedBuilder()
            .setTitle(
              '🌸 Audio không thể phát',
            )
            .setDescription(
              [
                `🎧 **${
                  track?.info?.title ||
                  'Unknown Audio'
                }**`,

                '',

                'Lavalink không thể lấy audio từ YouTube.',

                '',

                `⚠️ **${String(
                  errorMessage,
                ).slice(0, 1000)}**`,

                '',

                'Bạn có thể nhấn **Search** để thử kết quả khác.',
              ].join('\n'),
            )
            .setColor(0xed4245),
        ],

        components:
          buildAudioSearchDashboard()
            .components,
      });
    },
  );

  /*
   * ========================================================
   * QUEUE END
   * ========================================================
   */
  client.riffy.on(
    'queueEnd',
    async (player) => {
      if (
        !isAudioPlayer(player)
      ) {
        return;
      }

      const session =
        getSession(player);

      if (!session) {
        return;
      }

      session.currentTrack =
        null;
      session.audioActive =
  false;

      session.isPlaying =
        false;

      session.isPaused =
        false;
      player.__usagiAudio =
  false;

      /*
       * KHÔNG destroy player ở đây.
       *
       * Music handler sẽ bị chặn
       * bởi __usagiAudio.
       */

      const message =
        await getDashboardMessage(
          client,
          session,
        );

      if (!message) {
        return;
      }

      await message.edit(
        buildAudioSearchDashboard(),
      );
    },
  );

  /*
   * ========================================================
   * PLAYER DISCONNECT
   * ========================================================
   */
  client.riffy.on(
    'playerDisconnect',
    async (player) => {
      if (
        !isAudioPlayer(player)
      ) {
        return;
      }

      const session =
        getSession(player);

      if (!session) {
        return;
      }

      session.currentTrack =
        null;
      session.audioActive =
  false;

      session.isPlaying =
        false;

      session.isPaused =
        false;
      player.__usagiAudio =
  false;

      const message =
        await getDashboardMessage(
          client,
          session,
        );

      if (!message) {
        return;
      }

      await message.edit(
        buildAudioSearchDashboard(),
      );
    },
  );

  /*
   * ========================================================
   * PLAYER ERROR
   * ========================================================
   */
  client.riffy.on(
    'playerError',
    async (
      player,
      error,
    ) => {
      if (
        !isAudioPlayer(player)
      ) {
        return;
      }

      logger.error(
        `[Audio] Player error in ${player.guildId}:`,
        error,
      );
    },
  );

  logger.info(
    '[Audio] Riffy Audio player events attached.',
  );
}

export default setupAudioPlayerEvents;
