/**
 * Danh sách giọng đọc đa ngôn ngữ và công nghệ TTS (Edge Neural, Google, TikTok)
 * Dành riêng cho em bot Usagi múp rụp.
 */

export const TTS_VOICES = [
  // --- VIỆT NAM (1 Nữ, 1 Nam, 1 Google) ---
  {
    id: 'vi-VN-HoaiMyNeural',
    name: 'Hoài My (Nữ VN - Mượt mà)',
    lang: 'vi',
    engine: 'edge',
    voiceName: 'vi-VN-HoaiMyNeural',
    gender: 'Nữ',
    flag: '🇻🇳',
    category: 'Tiếng Việt',
    pitch: '+0Hz',
    rate: '+0%',
    description: 'Giọng nữ Bắc truyền cảm, tự nhiên, cực kỳ hợp với em Usagi',
  },
  {
    id: 'vi-VN-NamMinhNeural',
    name: 'Nam Minh (Nam VN - Trầm ấm)',
    lang: 'vi',
    engine: 'edge',
    voiceName: 'vi-VN-NamMinhNeural',
    gender: 'Nam',
    flag: '🇻🇳',
    category: 'Tiếng Việt',
    pitch: '+0Hz',
    rate: '+0%',
    description: 'Giọng nam phát thanh viên, chững chạc và ấm áp',
  },
  {
    id: 'google-vi',
    name: 'Google Nữ (Việt Nam)',
    lang: 'vi',
    engine: 'google',
    voiceName: 'vi',
    gender: 'Nữ',
    flag: '🇻🇳',
    category: 'Tiếng Việt',
    description: 'Giọng chị Google huyền thoại, rõ ràng và thân quen',
  },
];

export const DEFAULT_VOICE_ID = 'vi-VN-HoaiMyNeural';

export function getDefaultVoice() {
  return TTS_VOICES.find((v) => v.id === DEFAULT_VOICE_ID) || TTS_VOICES[0];
}

export function getVoiceById(id) {
  if (!id) return getDefaultVoice();
  const normalized = String(id).trim().toLowerCase();
  return (
    TTS_VOICES.find((v) => v.id.toLowerCase() === normalized) ||
    TTS_VOICES.find((v) => v.voiceName.toLowerCase() === normalized) ||
    getDefaultVoice()
  );
}

export function getVoiceChoices() {
  // Trả về choices cho slash command (tối đa 25 theo Discord limit)
  return TTS_VOICES.slice(0, 25).map((v) => ({
    name: `${v.flag} ${v.name} (${v.gender})`.slice(0, 100),
    value: v.id,
  }));
}

export const SPEED_LEVELS = [
  { label: '0.75x (Chậm)', value: '0.75x', rate: '-25%' },
  { label: '1.0x (Bình thường)', value: '1.0x', rate: '+0%' },
  { label: '1.25x (Nhanh)', value: '1.25x', rate: '+25%' },
  { label: '1.5x (Rất nhanh)', value: '1.5x', rate: '+50%' },
];

export function getSpeedRate(speedValue) {
  const match = SPEED_LEVELS.find((s) => s.value === speedValue);
  return match ? match.rate : '+0%';
}
