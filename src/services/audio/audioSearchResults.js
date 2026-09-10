import {
  ActionRowBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';

import {
  formatAudioDuration,
} from './audioYouTube.js';

import {
  AUDIO_DEFAULTS,
} from '../../config/audio/audioDefaults.js';

/**
 * Build YouTube search result dashboard.
 */
export function buildAudioSearchResults(query, results) {
  const embed = new EmbedBuilder()
    .setTitle('🌸 Usagi tìm thấy rồi!')
    .setDescription(
      [
        'Kết quả tìm kiếm trên **YouTube**:',
        '',
        `> 🔎 **${query}**`,
        '',
        'Chọn một audio bên dưới để Usagi phát cho bạn ♡',
      ].join('\n'),
    )
    .setColor(
      AUDIO_DEFAULTS.searchDashboard.color,
    );

  embed.addFields(
    results.slice(0, 10).map((result, index) => ({
      name: `${index + 1}. ${result.title}`.slice(0, 256),

      value: [
        `👤 ${result.author}`,
        `⏱️ ${formatAudioDuration(result.duration)}`,
      ].join(' • '),

      inline: false,
    })),
  );

  const menu = new StringSelectMenuBuilder()
    .setCustomId('audioResults')
    .setPlaceholder('🎧 Chọn audio muốn nghe...')
    .setMinValues(1)
    .setMaxValues(1)
    .addOptions(
      results.slice(0, 10).map((result, index) => ({
        label: `${index + 1}. ${result.title}`.slice(0, 100),

        description:
          `${result.author} • ${formatAudioDuration(result.duration)}`
            .slice(0, 100),

        value: String(index),

        emoji: '🎧',
      })),
    );

  const row = new ActionRowBuilder().addComponents(menu);

  return {
    embeds: [embed],
    components: [row],
  };
}

/**
 * Build the "no result" dashboard.
 */
export function buildAudioNoResults(query) {
  return {
    embeds: [
      new EmbedBuilder()
        .setTitle('🌸 Usagi không tìm thấy gì...')
        .setDescription(
          [
            'Không tìm thấy audio phù hợp trên **YouTube**.',
            '',
            '🔎 Từ khóa:',
            `> **${query}**`,
            '',
            'Thử tìm bằng từ khóa khác nhé ♡',
          ].join('\n'),
        )
        .setColor(
          AUDIO_DEFAULTS.searchDashboard.color,
        ),
    ],
    components: [],
  };
}
