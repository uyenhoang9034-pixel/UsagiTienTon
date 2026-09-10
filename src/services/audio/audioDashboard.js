import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';

import { AUDIO_DEFAULTS } from '../../config/audio/audioDefaults.js';

/**
 * =========================================================
 * USAGI AUDIO
 * PHASE 4 — DASHBOARD
 * =========================================================
 *
 * File này CHỈ phụ trách giao diện.
 *
 * Không xử lý:
 * - YouTube search
 * - Riffy
 * - Queue
 * - Playback
 * - Voice connection
 *
 * Không thay đổi customId của các interaction hiện tại.
 */

/**
 * =========================================================
 * SEARCH DASHBOARD
 * =========================================================
 */

export function buildAudioSearchEmbed() {
  const config =
    AUDIO_DEFAULTS.searchDashboard;

  const embed =
    new EmbedBuilder()
      .setTitle(
        config.title ||
          '🌸 𝒰𝓈𝒶𝑔𝒾 𝒜𝓊𝒹𝒾𝑜',
      )
      .setDescription(
        config.description ||
          'Tìm một câu chuyện, podcast hoặc audio mà bạn muốn nghe cùng Usagi nhé ♡',
      )
      .setColor(
        config.color ||
          0xffb6d9,
      );

  /**
   * GIF Usagi
   */
  if (config.image) {
    embed.setImage(
      config.image,
    );
  }

  /**
   * Footer
   */
  if (
    config.showFooter &&
    config.footer
  ) {
    embed.setFooter({
      text: config.footer,
    });
  }

  return embed;
}

/**
 * =========================================================
 * SEARCH BUTTON
 * =========================================================
 */

export function buildAudioSearchButtons() {
  const config =
    AUDIO_DEFAULTS.searchDashboard;

  return new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(
          'audioSearch',
        )
        .setLabel(
          config.searchButtonLabel ||
            'Search Audio',
        )
        .setEmoji(
          config.searchButtonEmoji ||
            '🔍',
        )
        .setStyle(
          ButtonStyle.Primary,
        ),
    );
}

/**
 * =========================================================
 * SEARCH DASHBOARD
 * =========================================================
 */

export function buildAudioSearchDashboard() {
  return {
    embeds: [
      buildAudioSearchEmbed(),
    ],

    components: [
      buildAudioSearchButtons(),
    ],
  };
}

/**
 * =========================================================
 * PLAYER DASHBOARD
 * =========================================================
 */

export function buildAudioPlayerDashboard(
  track,
  player,
  session,
) {
  const config =
    AUDIO_DEFAULTS.playerDashboard;

  const title =
    track?.info?.title ||
    'Unknown Audio';

  const author =
    track?.info?.author ||
    'Unknown';

  const duration =
    Number(
      track?.info?.length,
    ) || 0;

  const position =
    Number(
      player?.position,
    ) || 0;

  const isPaused =
    Boolean(
      player?.paused,
    );

  const loopMode =
    session?.loopMode ||
    'none';

  const volume =
    Number(
      session?.volume ?? 100,
    );

  /**
   * =======================================================
   * DESCRIPTION
   * =======================================================
   */

  const descriptionParts = [];

  /**
   * Track title
   */
  descriptionParts.push(
    `⋆.ೃ࿔🌸*:･ **${title}**`,
  );

  /**
   * Author
   */
  if (
    config.showAuthor
  ) {
    descriptionParts.push(
      '',
      `<:chiikawa1:1541375141261484072> ${author}`,
    );
  }

  /**
   * Progress
   */
  if (
    config.showProgress
  ) {
    descriptionParts.push(
      '',
      buildProgressBar(
        position,
        duration,
      ),
      '',
      `\`${formatTime(position)} / ${formatTime(duration)}\``,
    );
  }

  /**
   * Volume
   */
  if (
    config.showVolume
  ) {
    descriptionParts.push(
      '',
      `🔊 Volume: **${volume}%**`,
    );
  }

  /**
   * Loop
   */
  if (
    config.showLoop
  ) {
    descriptionParts.push(
      `🔁 Loop: **${formatLoopMode(
        loopMode,
      )}**`,
    );
  }

  /**
   * Status
   */
  if (
    config.showStatus
  ) {
    descriptionParts.push(
      '',
      isPaused
        ? '⋆.˚✮🎧✮˚.⋆ **Đang tạm dừng**'
        : '⋆.˚✮🎧✮˚.⋆ **Đang phát**',
    );
  }

  /**
   * =======================================================
   * EMBED
   * =======================================================
   */

  const embed =
    new EmbedBuilder()
      .setTitle(
        config.title ||
          '⋆.ೃ࿔🌸*:･ 𝒩𝑜𝓌 𝐿𝒾𝓈𝓉𝑒𝓃𝒾𝓃𝑔',
      )
      .setDescription(
        descriptionParts.join(
          '\n',
        ),
      )
      .setColor(
        config.color ||
          0xffb6d9,
      );

  /**
   * =======================================================
   * IMAGE
   * =======================================================
   *
   * Artwork của audio vẫn được giữ lại.
   * GIF Usagi dùng làm thumbnail để dashboard không
   * bị chiếm toàn bộ embed.
   */

  const thumbnail =
    track?.info?.artworkUrl ||
    track?.info?.thumbnail ||
    null;

  if (thumbnail) {
    embed.setImage(
      thumbnail,
    );
  }

  /**
   * Usagi GIF
   */
  if (config.image) {
    embed.setThumbnail(
      config.image,
    );
  }

  /**
   * Footer
   */
  if (
    config.showFooter &&
    config.footer
  ) {
    embed.setFooter({
      text: config.footer,
    });
  }

  /**
   * =======================================================
   * RETURN
   * =======================================================
   */

  return {
    embeds: [
      embed,
    ],

    components:
      buildAudioPlayerButtons(
        isPaused,
        loopMode,
      ),
  };
}

/**
 * =========================================================
 * PLAYER BUTTONS
 * =========================================================
 *
 * QUAN TRỌNG:
 *
 * Không đổi customId.
 * Các interaction hiện tại của Phase 3 vẫn dùng:
 *
 * audioPause
 * audioResume
 * audioSkip
 * audioLoop
 * audioStop
 * audioVolumeDown
 * audioVolumeUp
 * audioQueue
 * audioSearch
 */

/**
 * @param {boolean} isPaused
 * @param {string} loopMode
 */

export function buildAudioPlayerButtons(
  isPaused = false,
  loopMode = 'none',
) {
  const config =
    AUDIO_DEFAULTS.playerButtons;

  /**
   * =======================================================
   * ROW 1
   * =======================================================
   */

  const firstRow =
    new ActionRowBuilder()
      .addComponents(

        /**
         * PAUSE / RESUME
         */
        new ButtonBuilder()
          .setCustomId(
            isPaused
              ? 'audioResume'
              : 'audioPause',
          )
          .setLabel(
            isPaused
              ? (
                config.resume?.label ||
                'Resume'
              )
              : (
                config.pause?.label ||
                'Pause'
              ),
          )
          .setEmoji(
            isPaused
              ? (
                config.resume?.emoji ||
                '▶️'
              )
              : (
                config.pause?.emoji ||
                '⏸️'
              ),
          )
          .setStyle(
            ButtonStyle.Primary,
          ),

        /**
         * SKIP
         */
        new ButtonBuilder()
          .setCustomId(
            'audioSkip',
          )
          .setLabel(
            config.skip?.label ||
              'Skip',
          )
          .setEmoji(
            config.skip?.emoji ||
              '⏭️',
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),

        /**
         * LOOP
         */
        new ButtonBuilder()
          .setCustomId(
            'audioLoop',
          )
          .setLabel(
            config.loop?.label ||
              'Loop',
          )
          .setEmoji(
            loopMode === 'none'
              ? (
                config.loop?.emoji ||
                '🔁'
              )
              : (
                config.loopActive?.emoji ||
                '🔂'
              ),
          )
          .setStyle(
            loopMode === 'none'
              ? ButtonStyle.Secondary
              : ButtonStyle.Success,
          ),

        /**
         * STOP
         */
        new ButtonBuilder()
          .setCustomId(
            'audioStop',
          )
          .setLabel(
            config.stop?.label ||
              'Stop',
          )
          .setEmoji(
            config.stop?.emoji ||
              '⏹️',
          )
          .setStyle(
            ButtonStyle.Danger,
          ),
      );

  /**
   * =======================================================
   * ROW 2
   * =======================================================
   */

  const secondRow =
    new ActionRowBuilder()
      .addComponents(

        /**
         * VOLUME DOWN
         */
        new ButtonBuilder()
          .setCustomId(
            'audioVolumeDown',
          )
          .setLabel(
            config.volumeDown?.label ||
              'Volume -',
          )
          .setEmoji(
            config.volumeDown?.emoji ||
              '🔉',
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),

        /**
         * VOLUME UP
         */
        new ButtonBuilder()
          .setCustomId(
            'audioVolumeUp',
          )
          .setLabel(
            config.volumeUp?.label ||
              'Volume +',
          )
          .setEmoji(
            config.volumeUp?.emoji ||
              '🔊',
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),

        /**
         * QUEUE
         */
        new ButtonBuilder()
          .setCustomId(
            'audioQueue',
          )
          .setLabel(
            config.queue?.label ||
              'Queue',
          )
          .setEmoji(
            config.queue?.emoji ||
              '📜',
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),

        /**
         * SEARCH
         */
        new ButtonBuilder()
          .setCustomId(
            'audioSearch',
          )
          .setLabel(
            config.search?.label ||
              'Search',
          )
          .setEmoji(
            config.search?.emoji ||
              '🔍',
          )
          .setStyle(
            ButtonStyle.Primary,
          ),
      );

  return [
    firstRow,
    secondRow,
  ];
}

/**
 * =========================================================
 * PROGRESS BAR
 * =========================================================
 */

function buildProgressBar(
  position,
  duration,
) {
  return '∘₊✧──────✧₊∘';
}

/**
 * =========================================================
 * FORMAT TIME
 * =========================================================
 */

export function formatTime(ms) {
  if (
    !ms ||
    ms <= 0
  ) {
    return '00:00';
  }

  const totalSeconds =
    Math.floor(
      ms / 1000,
    );

  const hours =
    Math.floor(
      totalSeconds / 3600,
    );

  const minutes =
    Math.floor(
      (totalSeconds % 3600) / 60,
    );

  const seconds =
    totalSeconds % 60;

  if (
    hours > 0
  ) {
    return (
      `${hours}:` +
      `${String(minutes).padStart(2, '0')}:` +
      `${String(seconds).padStart(2, '0')}`
    );
  }

  return (
    `${String(minutes).padStart(2, '0')}:` +
    `${String(seconds).padStart(2, '0')}`
  );
}

/**
 * =========================================================
 * LOOP MODE
 * =========================================================
 */

function formatLoopMode(
  mode,
) {
  switch (mode) {
    case 'track':
      return 'Track';

    case 'queue':
      return 'Queue';

    default:
      return 'Off';
  }
}

/**
 * =========================================================
 * NO RESULTS
 * =========================================================
 */

export function buildAudioNoResults(
  query,
) {
  const config =
    AUDIO_DEFAULTS.searchDashboard;

  return {
    embeds: [
      new EmbedBuilder()
        .setTitle(
          '🌸 Usagi không tìm thấy gì...',
        )
        .setDescription(
          [
            'Không tìm thấy audio phù hợp trên **YouTube**.',
            '',
            '🔎 **Từ khóa:**',
            `> ${query}`,
            '',
            'Thử tìm bằng từ khóa khác nhé ♡',
          ].join('\n'),
        )
        .setColor(
          config.color ||
            0xffb6d9,
        )
        .setThumbnail(
          config.image ||
            null,
        )
        .setFooter(
          config.showFooter &&
          config.footer
            ? {
                text: config.footer,
              }
            : null,
        ),
    ],

    components: [
      buildAudioSearchButtons(),
    ],
  };
}
