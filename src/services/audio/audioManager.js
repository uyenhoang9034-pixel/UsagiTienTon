/**
 * Usagi Audio Manager
 *
 * Central controller for the new Audio system.
 *
 * This module is intentionally isolated from
 * the existing music system.
 */

import {
  AUDIO_DEFAULTS,
} from '../../config/audio/audioDefaults.js';

class AudioManager {
  constructor() {
    this.sessions = new Map();
  }

  getSession(guildId) {
    return this.sessions.get(guildId) ?? null;
  }

  createSession(guildId) {
    const existing = this.getSession(guildId);

    if (existing) {
      return existing;
    }

    const session = {
      guildId,

      enabled: AUDIO_DEFAULTS.enabled,

      audioChannelId:
        AUDIO_DEFAULTS.audioChannelId,

      voiceChannelId: null,

      textChannelId: null,

      dashboardMessageId: null,

      playerMessageId: null,

      currentTrack: null,

      searchResults: [],

      lastSearchQuery: null,

      queue: [],

      history: [],

      loopMode:
        AUDIO_DEFAULTS.queue.loopMode,

      volume: 100,

      isPlaying: false,

      isPaused: false,

      createdAt: Date.now(),
    };

    this.sessions.set(guildId, session);

    return session;
  }

  getOrCreateSession(guildId) {
    return (
      this.getSession(guildId) ??
      this.createSession(guildId)
    );
  }

  deleteSession(guildId) {
    this.sessions.delete(guildId);
  }

  isAllowedChannel(guildId, channelId) {
    const session =
      this.getOrCreateSession(guildId);

    if (!session.audioChannelId) {
      return true;
    }

    return (
      session.audioChannelId === channelId
    );
  }

  setAudioChannel(guildId, channelId) {
    const session =
      this.getOrCreateSession(guildId);

    session.audioChannelId = channelId;

    return session;
  }

  getSearchDashboard() {
    return {
      ...AUDIO_DEFAULTS.searchDashboard,
    };
  }

  getPlayerDashboard() {
    return {
      ...AUDIO_DEFAULTS.playerDashboard,
    };
  }

  getSessionSnapshot(guildId) {
    const session =
      this.getSession(guildId);

    if (!session) {
      return null;
    }

    return {
      ...session,

      queue: [
        ...(session.queue || []),
      ],

      history: [
        ...(session.history || []),
      ],

      searchResults: [
        ...(session.searchResults || []),
      ],
    };
  }

  getAllSessions() {
    return [
      ...this.sessions.values(),
    ];
  }
}

const audioManager =
  new AudioManager();

export default audioManager;
