import {
  EmbedBuilder,
} from 'discord.js';

import audioManager from '../../../services/audio/audioManager.js';

import {
  getPlayer,
} from '../../../services/music/musicActions.js';

import {
  canControlMusic,
} from '../../../services/music/permissions.js';

import {
  buildAudioPlayerDashboard,
  buildAudioSearchDashboard,
} from '../../../services/audio/audioDashboard.js';

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

function buildErrorEmbed(title, description) {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor(0xed4245);
}

async function handlePause(
  interaction,
  player,
  session,
) {
  if (!player.current) {
    return;
  }

  if (!player.paused) {
    player.pause(true);

    session.isPaused = true;
    session.isPlaying = false;
  }

  return interaction.editReply(
    buildAudioPlayerDashboard(
      player.current,
      player,
      session,
    ),
  );
}

async function handleResume(
  interaction,
  player,
  session,
) {
  if (!player.current) {
    return;
  }

  if (player.paused) {
    player.pause(false);

    session.isPaused = false;
    session.isPlaying = true;
  }

  return interaction.editReply(
    buildAudioPlayerDashboard(
      player.current,
      player,
      session,
    ),
  );
}

async function handleLoop(
  interaction,
  player,
  session,
) {
  const current =
    session.loopMode || 'none';

  let nextMode;

  if (current === 'none') {
    nextMode = 'track';
  } else if (current === 'track') {
    nextMode = 'queue';
  } else {
    nextMode = 'none';
  }

  session.loopMode = nextMode;

  player.setLoop(nextMode);

  return interaction.editReply(
    buildAudioPlayerDashboard(
      player.current,
      player,
      session,
    ),
  );
}

async function handleVolume(
  interaction,
  player,
  session,
  delta,
) {
  session.volume =
    Math.max(
      0,
      Math.min(
        100,
        Number(session.volume ?? 100) +
          delta,
      ),
    );

  player.setVolume(
    session.volume,
  );

  return interaction.editReply(
    buildAudioPlayerDashboard(
      player.current,
      player,
      session,
    ),
  );
}

async function handleSkip(
  interaction,
  player,
  session,
) {
  const current =
    player.current;

  const next =
    player.queue?.[0];

  if (!next) {
    return interaction.editReply(
      buildAudioPlayerDashboard(
        current,
        player,
        session,
      ),
    );
  }

  if (current) {
    session.history ??= [];

    session.history.push(
      createTrackData(current),
    );

    if (
      session.history.length >
      20
    ) {
      session.history.shift();
    }
  }

  /*
   * Skip phải bỏ track-loop.
   * Nếu không Riffy có thể phát lại track hiện tại.
   */
  if (
    player.loop === 'track'
  ) {
    player.setLoop('none');
  }

  session.loopMode =
    session.loopMode === 'track'
      ? 'none'
      : session.loopMode;

  /*
   * Riffy sẽ chuyển sang track
   * đầu tiên trong queue.
   */
  player.stop();

  session.isPlaying = true;
  session.isPaused = false;

  /*
   * Không tự xóa components.
   * trackStart event sẽ cập nhật
   * dashboard bằng track mới.
   */
  return interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setTitle(
          '⏭️ Usagi đang chuyển audio...',
        )
        .setDescription(
          [
            `Bỏ qua **${
              current?.info?.title ||
              'audio hiện tại'
            }**`,
            '',
            '🌸 Đang chuyển sang phần tiếp theo...',
          ].join('\n'),
        )
        .setColor(0xffb6d9),
    ],

    /*
     * Giữ nguyên toàn bộ nút.
     */
    components:
      buildAudioPlayerDashboard(
        current,
        player,
        session,
      ).components,
  });
}

async function handlePrevious(
  interaction,
  player,
  session,
) {
  const previous =
    session.history?.pop();

  if (!previous?.track) {
    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setTitle(
            '⏮️ Chưa có audio trước đó',
          )
          .setDescription(
            'Usagi chưa có audio trước đó để quay lại ♡',
          )
          .setColor(0xffb6d9),
      ],

      components:
        buildAudioPlayerDashboard(
          player.current,
          player,
          session,
        ).components,
    });
  }

  /*
   * Track hiện tại đưa lại queue.
   */
  if (player.current) {
    player.queue.unshift(
      player.current,
    );
  }

  /*
   * Previous đưa lên đầu.
   */
  player.queue.unshift(
    previous.track,
  );

  if (
    player.loop === 'track'
  ) {
    player.setLoop('none');
  }

  player.stop();

  session.isPlaying = true;
  session.isPaused = false;

  return interaction.editReply({
    embeds: [
      new EmbedBuilder()
        .setTitle(
          '⏮️ Đang quay lại audio trước...',
        )
        .setDescription(
          `🌸 **${previous.title}**`,
        )
        .setColor(0xffb6d9),
    ],

    components:
      buildAudioPlayerDashboard(
        player.current,
        player,
        session,
      ).components,
  });
}

async function handleStop(
  interaction,
  player,
  session,
) {
  try {
    player.setLoop('none');
  } catch {
    // ignore
  }

  try {
    player.queue.clear();
  } catch {
    // ignore
  }

  try {
  player.stop();
} catch {
  // ignore
}

/*
 * Audio đã nhường quyền điều khiển player.
 *
 * Track hiện tại vẫn có __usagiAudio
 * nên Music sẽ không xử lý nhầm
 * event stop ngay lập tức.
 */
setTimeout(() => {
  player.__usagiAudio =
    false;
}, 500);

session.currentTrack =
  null;

session.audioActive =
  false;

session.queue = [];
  session.history = [];
  session.searchResults = [];
  session.isPlaying = false;
  session.isPaused = false;
  session.loopMode = 'none';

  return interaction.editReply(
    buildAudioSearchDashboard(),
  );
}

function buildQueueEmbed(
  player,
  session,
) {
  const lines = [];

  if (player?.current) {
    lines.push(
  `⋆.˚✮🎧✮˚.⋆ **Đang phát**`,
);

lines.push(
  `> ${
    player.current.info?.title ||
    'Unknown'
  }`,
);

    lines.push('');
  }

  const queue =
    Array.isArray(player?.queue)
      ? player.queue
      : [];

  if (!queue.length) {
    lines.push(
      '<a:chiikawag11:1541427921674051674> Không còn audio trong queue.',
    );
  } else {
    queue
      .slice(0, 15)
      .forEach(
        (track, index) => {
          lines.push(
            `${index + 1}. ${
              track?.info?.title ||
              'Unknown'
            }`,
          );
        },
      );
  }

  return new EmbedBuilder()
    .setTitle(
      '✨ 𝓤𝓼𝓪𝓰𝓲 𝓐𝓾𝓭𝓲𝓸 𝓠𝓾𝓮𝓾𝓮 ✨',
    )
    .setDescription(
      lines.join('\n'),
    )
    .setColor(0xffb6d9);
}

/*
 * =========================================================
 * IMPORTANT
 * =========================================================
 *
 * Loader của bot dùng interaction.name
 * để tìm handler.
 *
 * Vì vậy phải export ARRAY:
 *
 * audioPause
 * audioResume
 * audioSkip
 * audioPrevious
 * audioLoop
 * audioStop
 * audioVolumeDown
 * audioVolumeUp
 * audioQueue
 *
 * Không dùng:
 *
 * name: 'audioPlayerButtons'
 */

const buttonNames = [
  'audioPause',
  'audioResume',
  'audioSkip',
  'audioPrevious',
  'audioLoop',
  'audioStop',
  'audioVolumeDown',
  'audioVolumeUp',
  'audioQueue',
];

async function executeButton(
  interaction,
  client,
) {
  const customId =
    interaction.customId;

  const session =
    audioManager.getSession(
      interaction.guildId,
    );

  if (!session) {
    return interaction.reply({
      content:
        '🌸 Audio session đã hết hạn. Dùng `/audio` để bắt đầu lại nhé.',
      ephemeral: true,
    });
  }

  const player =
    getPlayer(
      client,
      interaction.guildId,
    );

  if (!player) {
    return interaction.reply({
      content:
        '🌸 Audio player hiện không tồn tại.',
      ephemeral: true,
    });
  }

  if (
    !interaction.member?.voice
      ?.channel
  ) {
    return interaction.reply({
      content:
        '🌸 Bạn cần ở trong voice channel để điều khiển Audio.',
      ephemeral: true,
    });
  }

  if (
    !canControlMusic(
      interaction.member,
      player,
    )
  ) {
    return interaction.reply({
      content:
        '🌸 Bạn cần ở cùng voice channel với Usagi.',
      ephemeral: true,
    });
  }

  await interaction.deferUpdate();

  try {
    switch (customId) {
      case 'audioPause':
        return handlePause(
          interaction,
          player,
          session,
        );

      case 'audioResume':
        return handleResume(
          interaction,
          player,
          session,
        );

      case 'audioSkip':
        return handleSkip(
          interaction,
          player,
          session,
        );

      case 'audioPrevious':
        return handlePrevious(
          interaction,
          player,
          session,
        );

      case 'audioLoop':
        return handleLoop(
          interaction,
          player,
          session,
        );

      case 'audioStop':
        return handleStop(
          interaction,
          player,
          session,
        );

      case 'audioVolumeDown':
        return handleVolume(
          interaction,
          player,
          session,
          -10,
        );

      case 'audioVolumeUp':
        return handleVolume(
          interaction,
          player,
          session,
          10,
        );

      case 'audioQueue':
        return interaction.editReply({
          embeds: [
            buildQueueEmbed(
              player,
              session,
            ),
          ],

          /*
           * Queue view vẫn có nút.
           */
          components:
            buildAudioPlayerDashboard(
              player.current,
              player,
              session,
            ).components,
        });

      default:
        return interaction.editReply({
          embeds: [
            buildErrorEmbed(
              '🌸 Audio Error',
              'Nút Audio này không được nhận diện.',
            ),
          ],

          components:
            player.current
              ? buildAudioPlayerDashboard(
                  player.current,
                  player,
                  session,
                ).components
              : [],
        });
    }
  } catch (error) {
    return interaction.editReply({
      embeds: [
        buildErrorEmbed(
          '🌸 Không thể điều khiển Audio',
          [
            error?.message ||
              'Unknown error',

            '',

            'Các nút Audio vẫn được giữ lại.',
          ].join('\n'),
        ),
      ],

      components:
        player.current
          ? buildAudioPlayerDashboard(
              player.current,
              player,
              session,
            ).components
          : [],
    });
  }
}

export default buttonNames.map(
  (name) => ({
    name,
    execute: executeButton,
  }),
);
