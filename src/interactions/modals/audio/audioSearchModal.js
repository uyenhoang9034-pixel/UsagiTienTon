import {
  EmbedBuilder,
} from 'discord.js';

import audioManager from '../../../services/audio/audioManager.js';

import {
  searchYouTubeAudio,
} from '../../../services/audio/audioYouTube.js';

import {
  buildAudioSearchResults,
  buildAudioNoResults,
} from '../../../services/audio/audioSearchResults.js';

export default {
  name: 'audioSearchModal',

  async execute(interaction) {
    const query = interaction.fields
      .getTextInputValue('query')
      .trim();

    if (!query) {
      return interaction.reply({
        content: '🌸 Bạn chưa nhập nội dung cần tìm.',
        ephemeral: true,
      });
    }

    if (query.length > 200) {
      return interaction.reply({
        content: '🌸 Nội dung tìm kiếm quá dài.',
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    try {
      const results = await searchYouTubeAudio(
  interaction.client,
  query,
  interaction.user,
);

      const session = audioManager.getOrCreateSession(
        interaction.guildId,
      );

      session.lastSearchQuery = query;
      session.searchResults = results;

      if (!results.length) {
        return interaction.editReply(
          buildAudioNoResults(query),
        );
      }

      return interaction.editReply(
        buildAudioSearchResults(
          query,
          results,
        ),
      );
    } catch (error) {
      const errorEmbed = new EmbedBuilder()
        .setTitle('🌸 Không thể tìm kiếm')
        .setDescription(
          [
            'Usagi gặp vấn đề khi tìm audio trên YouTube.',
            '',
            `> ${error?.message || 'Unknown error'}`,
            '',
            'Bạn hãy thử lại sau một chút nhé ♡',
          ].join('\n'),
        )
        .setColor(0xed4245);

      return interaction.editReply({
        embeds: [errorEmbed],
        components: [],
      });
    }
  },
};
