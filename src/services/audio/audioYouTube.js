/**
 * =========================================================
 * USAGI AUDIO — YOUTUBE
 * =========================================================
 *
 * Hỗ trợ:
 *
 * /audio
 * → mở Search Audio
 *
 * /audio input:<từ khóa>
 * → tìm YouTube
 *
 * /audio input:<YouTube URL>
 * → phát trực tiếp đúng video YouTube
 *
 * Không tự động lấy playlist.
 * Mỗi link YouTube chỉ lấy 1 video.
 *
 * Chỉ sử dụng Lavalink + Riffy hiện tại của bot.
 */

import {
  TitanBotError,
  ErrorTypes,
} from '../../utils/errorHandler.js';

const MAX_RESULTS = 10;
const MAX_QUERY_LENGTH = 200;

const YOUTUBE_URL_PATTERN =
  /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com|youtu\.be)(?:\/|$)/i;

/**
 * =========================================================
 * GET REAL DISCORD CLIENT
 * =========================================================
 */

function getClient(source) {
  if (source?.riffy) {
    return source;
  }

  if (source?.client?.riffy) {
    return source.client;
  }

  if (source?.client) {
    return source.client;
  }

  return source;
}

/**
 * =========================================================
 * GET RIFFY
 * =========================================================
 */

function getRiffy(source) {
  const client =
    getClient(source);

  if (!client?.riffy) {
    throw new TitanBotError(
      'Audio Lavalink unavailable',
      ErrorTypes.CONFIGURATION,
      '🌸 Hệ thống Audio hiện không kết nối được với Lavalink.',
    );
  }

  return {
    client,
    riffy: client.riffy,
  };
}

/**
 * =========================================================
 * YOUTUBE URL
 * =========================================================
 */

export function isYouTubeUrl(query) {
  return YOUTUBE_URL_PATTERN.test(
    String(query || '').trim(),
  );
}

/**
 * =========================================================
 * GET YOUTUBE VIDEO ID
 * =========================================================
 *
 * Hỗ trợ:
 *
 * youtube.com/watch?v=XXXX
 * youtu.be/XXXX
 * youtube.com/shorts/XXXX
 */

function getYouTubeVideoId(url) {
  const value =
    String(url || '').trim();

  try {
    const parsed =
      new URL(
        value.startsWith('http')
          ? value
          : `https://${value}`,
      );

    const hostname =
      parsed.hostname
        .toLowerCase()
        .replace(/^www\./, '');

    /**
     * youtu.be/VIDEO_ID
     */
    if (
      hostname === 'youtu.be'
    ) {
      return (
        parsed.pathname
          .replace(/^\/+/, '')
          .split('/')[0]
          .trim() ||
        null
      );
    }

    /**
     * youtube.com/watch?v=VIDEO_ID
     */
    if (
      hostname === 'youtube.com'
    ) {
      const videoId =
        parsed.searchParams.get('v');

      if (videoId) {
        return videoId.trim();
      }

      /**
       * youtube.com/shorts/VIDEO_ID
       */
      const parts =
        parsed.pathname
          .split('/')
          .filter(Boolean);

      const shortsIndex =
        parts.indexOf('shorts');

      if (
        shortsIndex !== -1 &&
        parts[shortsIndex + 1]
      ) {
        return parts[
          shortsIndex + 1
        ].trim();
      }

      /**
       * youtube.com/live/VIDEO_ID
       */
      const liveIndex =
        parts.indexOf('live');

      if (
        liveIndex !== -1 &&
        parts[liveIndex + 1]
      ) {
        return parts[
          liveIndex + 1
        ].trim();
      }
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * =========================================================
 * RESOLVE
 * =========================================================
 */

async function resolveYouTube(
  riffy,
  query,
  requester,
) {
  return riffy.resolve({
    query,
    requester,
  });
}

/**
 * =========================================================
 * SEARCH / RESOLVE YOUTUBE
 * =========================================================
 */

export async function searchYouTubeAudio(
  source,
  query,
  requester = null,
) {
  const {
    riffy,
  } = getRiffy(source);

  const cleanQuery =
    String(query || '').trim();

  if (!cleanQuery) {
    throw new TitanBotError(
      'Empty audio query',
      ErrorTypes.USER_INPUT,
      '🌸 Bạn chưa nhập nội dung cần tìm.',
    );
  }

  if (
    cleanQuery.length >
    MAX_QUERY_LENGTH
  ) {
    throw new TitanBotError(
      'Audio query too long',
      ErrorTypes.USER_INPUT,
      '🌸 Nội dung tìm kiếm quá dài.',
    );
  }

  const directUrl =
    isYouTubeUrl(
      cleanQuery,
    );

  /**
   * =======================================================
   * DIRECT YOUTUBE URL
   * =======================================================
   */

  if (directUrl) {
    let result = null;

    /**
     * -------------------------------------------------------
     * ATTEMPT 1
     * -------------------------------------------------------
     *
     * Resolve trực tiếp URL.
     */

    try {
      result =
        await resolveYouTube(
          riffy,
          cleanQuery,
          requester,
        );
    } catch (error) {
      console.warn(
        '[USAGI AUDIO] Direct YouTube resolve failed:',
        error?.message ||
          error,
      );
    }

    let tracks =
      Array.isArray(
        result?.tracks,
      )
        ? result.tracks.filter(Boolean)
        : [];

    const loadType =
      String(
        result?.loadType ||
          '',
      ).toUpperCase();

    console.log(
      '[USAGI AUDIO] Direct URL resolve:',
      {
        query: cleanQuery,
        loadType,
        trackCount:
          tracks.length,
      },
    );

    /**
     * -------------------------------------------------------
     * ATTEMPT 2 — VIDEO ID FALLBACK
     * -------------------------------------------------------
     *
     * Nếu Lavalink không resolve trực tiếp URL,
     * lấy video ID rồi search lại.
     */

    if (!tracks.length) {
      const videoId =
        getYouTubeVideoId(
          cleanQuery,
        );

      if (videoId) {
        console.log(
          '[USAGI AUDIO] Trying YouTube video ID fallback:',
          videoId,
        );

        try {
          const fallbackResult =
            await resolveYouTube(
              riffy,
              `ytsearch:${videoId}`,
              requester,
            );

          const fallbackTracks =
            Array.isArray(
              fallbackResult?.tracks,
            )
              ? fallbackResult.tracks.filter(
                  Boolean,
                )
              : [];

          console.log(
            '[USAGI AUDIO] Video ID fallback:',
            {
              loadType:
                fallbackResult?.loadType,
              trackCount:
                fallbackTracks.length,
            },
          );

          /**
           * Tìm đúng video theo ID.
           */

          const exactTrack =
            fallbackTracks.find(
              (track) => {
                const uri =
                  String(
                    track?.info?.uri ||
                      '',
                  );

                return (
                  uri.includes(
                    videoId,
                  ) ||
                  track?.info?.identifier ===
                    videoId
                );
              },
            );

          if (exactTrack) {
            tracks = [
              exactTrack,
            ];
          } else if (
            fallbackTracks.length
          ) {
            /**
             * Lavalink đôi khi không trả URI
             * giống URL gốc.
             *
             * Trong trường hợp này lấy kết quả
             * đầu tiên của video ID search.
             */

            tracks = [
              fallbackTracks[0],
            ];
          }
        } catch (error) {
          console.warn(
            '[USAGI AUDIO] Video ID fallback failed:',
            error?.message ||
              error,
          );
        }
      }
    }

    /**
     * -------------------------------------------------------
     * NO RESULT
     * -------------------------------------------------------
     */

    if (!tracks.length) {
      console.warn(
        '[USAGI AUDIO] YouTube URL could not be resolved:',
        cleanQuery,
      );

      return [];
    }

    /**
     * -------------------------------------------------------
     * DIRECT URL = ONE TRACK ONLY
     * -------------------------------------------------------
     */

    tracks = [
      tracks[0],
    ];

    return tracks.map(
      (
        track,
        index,
      ) => ({
        index,

        title:
          track?.info?.title ||
          'Unknown YouTube video',

        author:
          track?.info?.author ||
          'Unknown',

        uri:
          track?.info?.uri ||
          null,

        duration:
          Number(
            track?.info?.length,
          ) || 0,

        thumbnail:
          track?.info?.artworkUrl ||
          track?.info?.thumbnail ||
          null,

        isStream:
          Boolean(
            track?.info?.isStream,
          ),

        track,
      }),
    );
  }

  /**
   * =======================================================
   * NORMAL YOUTUBE SEARCH
   * =======================================================
   */

  let result;

  try {
    result =
      await resolveYouTube(
        riffy,
        `ytsearch:${cleanQuery}`,
        requester,
      );
  } catch (error) {
    console.error(
      '[USAGI AUDIO] YouTube search failed:',
      error,
    );

    throw new TitanBotError(
      'YouTube resolve failed',
      ErrorTypes.CONFIGURATION,
      '🌸 Lavalink không thể tìm audio YouTube lúc này.',
    );
  }

  const loadType =
    String(
      result?.loadType ||
        '',
    ).toUpperCase();

  const tracks =
    Array.isArray(
      result?.tracks,
    )
      ? result.tracks.filter(Boolean)
      : [];

  console.log(
    '[USAGI AUDIO] YouTube search:',
    {
      query: cleanQuery,
      loadType,
      trackCount:
        tracks.length,
    },
  );

  /**
   * =======================================================
   * NO MATCH
   * =======================================================
   */

  if (
    loadType === 'NO_MATCHES' ||
    loadType === 'NO_MATCH' ||
    loadType === 'EMPTY'
  ) {
    return [];
  }

  /**
   * =======================================================
   * NO TRACKS
   * =======================================================
   */

  if (!tracks.length) {
    return [];
  }

  /**
   * =======================================================
   * NORMAL SEARCH RESULT
   * =======================================================
   */

  return tracks
    .slice(
      0,
      MAX_RESULTS,
    )
    .map(
      (
        track,
        index,
      ) => ({
        index,

        title:
          track?.info?.title ||
          'Unknown YouTube video',

        author:
          track?.info?.author ||
          'Unknown',

        uri:
          track?.info?.uri ||
          null,

        duration:
          Number(
            track?.info?.length,
          ) || 0,

        thumbnail:
          track?.info?.artworkUrl ||
          track?.info?.thumbnail ||
          null,

        isStream:
          Boolean(
            track?.info?.isStream,
          ),

        track,
      }),
    );
}

/**
 * =========================================================
 * FORMAT DURATION
 * =========================================================
 */

export function formatAudioDuration(
  milliseconds,
) {
  if (
    !milliseconds ||
    milliseconds <= 0
  ) {
    return 'Live';
  }

  const totalSeconds =
    Math.floor(
      milliseconds / 1000,
    );

  const hours =
    Math.floor(
      totalSeconds / 3600,
    );

  const minutes =
    Math.floor(
      (totalSeconds % 3600) /
        60,
    );

  const seconds =
    totalSeconds % 60;

  if (
    hours > 0
  ) {
    return (
      `${hours}:` +
      `${String(
        minutes,
      ).padStart(
        2,
        '0',
      )}:` +
      `${String(
        seconds,
      ).padStart(
        2,
        '0',
      )}`
    );
  }

  return (
    `${minutes}:` +
    `${String(
      seconds,
    ).padStart(
      2,
      '0',
    )}`
  );
}

/**
 * =========================================================
 * DEFAULT EXPORT
 * =========================================================
 */

export default {
  searchYouTubeAudio,
  isYouTubeUrl,
  formatAudioDuration,
};
