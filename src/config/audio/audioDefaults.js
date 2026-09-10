/**
 * =========================================================
 * USAGI AUDIO
 * PHASE 4 — DASHBOARD CONFIGURATION
 * =========================================================
 *
 * Tất cả phần giao diện Audio được tập trung tại đây.
 *
 * Muốn đổi:
 * - GIF
 * - màu
 * - tiêu đề
 * - mô tả
 * - placeholder
 * - tên nút
 *
 * chỉ cần sửa file này.
 */

export const AUDIO_DEFAULTS = {
  enabled: true,

  /**
   * =======================================================
   * AUDIO CHANNEL
   * =======================================================
   */

  audioChannelId:
    '1545469460931154052',

  /**
   * =======================================================
   * USAGI VISUAL
   * =======================================================
   *
   * GIF bạn đã chọn.
   */

  usagiGif:
    'https://i.pinimg.com/originals/95/c2/b3/95c2b36734919facb1e2682f387880d1.gif',

  /**
   * =======================================================
   * SEARCH DASHBOARD
   * =======================================================
   */

  searchDashboard: {
    enabled: true,

    title:
      '🌸 𝒰𝓈𝒶𝑔𝒾 𝒜𝓊𝒹𝒾𝑜',

    description:
      [
        '╭─────────────── ♡ ───────────────╮',
        '',
        '  ✦ Tìm một câu chuyện',
        '  ✦ Podcast hoặc audio',
        '  ✦ Và cùng Usagi lắng nghe nhé',
        '',
        '╰─────────────── ♡ ───────────────╯',
      ].join('\n'),

    /**
     * GIF hiển thị phía dưới dashboard.
     */
    image:
      'https://i.pinimg.com/originals/95/c2/b3/95c2b36734919facb1e2682f387880d1.gif',

    color:
      0xffb6d9,

    placeholder:
      '🔎 Bạn muốn nghe gì hôm nay?',

    searchButtonLabel:
      'Search Audio',

    searchButtonEmoji:
      '🔍',

    footer:
      '♡ Usagi Audio • YouTube Search',

    showFooter:
      true,
  },

  /**
   * =======================================================
   * PLAYER DASHBOARD
   * =======================================================
   */

  playerDashboard: {
    enabled: true,

    title:
      '🎧 𝒩𝑜𝓌 𝐿𝒾𝓈𝓉𝑒𝓃𝒾𝓃𝑔',

    description:
      'Usagi đang cùng bạn lắng nghe ♡',

    /**
     * GIF Usagi.
     */
    image:
      'https://i.pinimg.com/originals/95/c2/b3/95c2b36734919facb1e2682f387880d1.gif',

    color:
      0xffb6d9,

    footer:
      '♡ Usagi Audio Player',

    showFooter:
      true,

    /**
     * Hiển thị thanh tiến trình.
     */
    showProgress:
      true,

    /**
     * Hiển thị volume.
     */
    showVolume:
      true,

    /**
     * Hiển thị queue.
     */
    showQueue:
      true,

    /**
     * Hiển thị thông tin tác giả.
     */
    showAuthor:
      true,

    /**
     * Hiển thị trạng thái Playing / Paused.
     */
    showStatus:
      true,

    /**
     * Hiển thị chế độ Loop.
     */
    showLoop:
      true,
  },

  /**
   * =======================================================
   * PLAYER BUTTONS
   * =======================================================
   *
   * Chỉ dùng để quản lý giao diện nút.
   * Custom ID không đổi để không phá interaction hiện tại.
   */

  playerButtons: {
    previous: {
      label: 'Previous',
      emoji: '⏮️',
    },

    pause: {
      label: 'Pause',
      emoji: '⏸️',
    },

    resume: {
      label: 'Resume',
      emoji: '▶️',
    },

    skip: {
      label: 'Skip',
      emoji: '⏭️',
    },

    loop: {
      label: 'Loop',
      emoji: '🔁',
    },

    loopActive: {
      label: 'Loop',
      emoji: '🔂',
    },

    stop: {
      label: 'Stop',
      emoji: '⏹️',
    },

    volumeDown: {
      label: 'Volume -',
      emoji: '🔉',
    },

    volumeUp: {
      label: 'Volume +',
      emoji: '🔊',
    },

    queue: {
      label: 'Queue',
      emoji: '📜',
    },

    search: {
      label: 'Search',
      emoji: '🔍',
    },
  },

  /**
   * =======================================================
   * SEARCH
   * =======================================================
   */

  search: {
    maxResults:
      10,

    regionCode:
      'VN',

    relevanceLanguage:
      'vi',

    safeSearch:
      'moderate',
  },

  /**
   * =======================================================
   * QUEUE
   * =======================================================
   */

  queue: {
    maxTracks:
      20,

    loopMode:
      'none',
  },

  /**
   * =======================================================
   * PERMISSIONS
   * =======================================================
   */

  permissions: {
    controlMode:
      'voice',
  },

  /**
   * =======================================================
   * AUTO DISCONNECT
   * =======================================================
   */

  autoDisconnect: {
    enabled:
      true,

    delayMs:
      60_000,
  },
};

export default AUDIO_DEFAULTS;
