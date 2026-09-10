// Compatibility shim after removing the old Usagi Audio system.
//
// Music still imports audioManager in a few safety checks. This file keeps those
// imports valid without re-enabling the removed Audio feature.

const sessions = new Map();

export function getSession(guildId) {
  const key = String(guildId || 'global');
  return sessions.get(key) || { audioActive: false };
}

export function setSession(guildId, session = {}) {
  const key = String(guildId || 'global');
  const nextSession = {
    audioActive: false,
    ...session,
  };

  sessions.set(key, nextSession);
  return nextSession;
}

export function clearSession(guildId) {
  const key = String(guildId || 'global');
  sessions.delete(key);
}

export function isAudioActive(guildId) {
  return getSession(guildId).audioActive === true;
}

const audioManager = {
  getSession,
  setSession,
  clearSession,
  isAudioActive,
};

export default audioManager;
