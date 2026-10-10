/**
 * Danh sách giọng đọc đa ngôn ngữ và công nghệ TTS (Edge Neural, Google, TikTok)
 * Dành riêng cho em bot Usagi múp rụp.
 */

export const TTS_VOICES = [
  // --- VIỆT NAM ---
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
    id: 'vi-VN-AnimeWaifu',
    name: 'Anime Waifu VN (Dễ thương)',
    lang: 'vi',
    engine: 'edge',
    voiceName: 'vi-VN-HoaiMyNeural',
    gender: 'Nữ',
    flag: '🎀',
    category: 'Tiếng Việt',
    pitch: '+24Hz',
    rate: '+8%',
    description: 'Giọng waifu tiếng Việt ngọt ngào, trong trẻo và đáng yêu',
  },
  {
    id: 'vi_female_01',
    name: 'TikTok Nữ (Việt Nam - Nhí nhảnh)',
    lang: 'vi',
    engine: 'tiktok',
    voiceName: 'vi_female_01',
    gender: 'Nữ',
    flag: '🇻🇳',
    category: 'Tiếng Việt',
    pitch: '+18Hz',
    rate: '+15%',
    description: 'Giọng nữ TikTok hot trend, lí lắc, cao và nhanh hơn Hoài My',
  },
  {
    id: 'vi_male_01',
    name: 'TikTok Nam (Việt Nam - Nhanh gọn)',
    lang: 'vi',
    engine: 'tiktok',
    voiceName: 'vi_male_01',
    gender: 'Nam',
    flag: '🇻🇳',
    category: 'Tiếng Việt',
    pitch: '-5Hz',
    rate: '+10%',
    description: 'Giọng nam TikTok dứt khoát, bắt tai, hài hước',
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

  // --- ENGLISH ---
  {
    id: 'en-US-JennyNeural',
    name: 'Jenny (US Female - Natural)',
    lang: 'en',
    engine: 'edge',
    voiceName: 'en-US-JennyNeural',
    gender: 'Nữ',
    flag: '🇺🇸',
    category: 'Tiếng Anh',
    description: 'Natural, friendly American English female voice',
  },
  {
    id: 'en-US-GuyNeural',
    name: 'Guy (US Male - Professional)',
    lang: 'en',
    engine: 'edge',
    voiceName: 'en-US-GuyNeural',
    gender: 'Nam',
    flag: '🇺🇸',
    category: 'Tiếng Anh',
    description: 'Polished, clear American English male voice',
  },
  {
    id: 'google-en',
    name: 'Google English (US)',
    lang: 'en',
    engine: 'google',
    voiceName: 'en',
    gender: 'Nữ',
    flag: '🇺🇸',
    category: 'Tiếng Anh',
    description: 'Classic Google English voice',
  },
  {
    id: 'en_male_funny',
    name: 'TikTok Meme Wacky (US)',
    lang: 'en',
    engine: 'tiktok',
    voiceName: 'en_male_funny',
    gender: 'Nam',
    flag: '🇺🇸',
    category: 'Tiếng Anh',
    description: 'Fun, exaggerated meme voice from TikTok',
  },

  // --- JAPANESE ---
  {
    id: 'ja-JP-NanamiNeural',
    name: 'Nanami (Anime Girl - Kawaii)',
    lang: 'ja',
    engine: 'edge',
    voiceName: 'ja-JP-NanamiNeural',
    gender: 'Nữ',
    flag: '🇯🇵',
    category: 'Tiếng Nhật',
    pitch: '+0Hz',
    rate: '+0%',
    description: 'Giọng anime waifu ngọt ngào, chuẩn giọng Nhật',
  },
  {
    id: 'ja-JP-AoiNeural',
    name: 'Aoi (Onee-san Quyến Rũ - ASMR)',
    lang: 'ja',
    engine: 'edge',
    voiceName: 'ja-JP-AoiNeural',
    gender: 'Nữ',
    flag: '🔞',
    category: 'Tiếng Nhật',
    pitch: '+4Hz',
    rate: '-10%',
    description: 'Giọng Onee-san thì thầm quyến rũ, ma mị, ướt át bên tai',
  },
  {
    id: 'ja-JP-MayuNeural',
    name: 'Mayu (Nũng Nịu Hentai - Dâm Dâm)',
    lang: 'ja',
    engine: 'edge',
    voiceName: 'ja-JP-MayuNeural',
    gender: 'Nữ',
    flag: '💋',
    category: 'Tiếng Nhật',
    pitch: '+16Hz',
    rate: '-6%',
    description: 'Giọng waifu rên rỉ, nũng nịu, thở dốc ngọt ngào kiểu anime 18+',
  },
  {
    id: 'ja-JP-KeitaNeural',
    name: 'Keita (Nam Nhật Bản)',
    lang: 'ja',
    engine: 'edge',
    voiceName: 'ja-JP-KeitaNeural',
    gender: 'Nam',
    flag: '🇯🇵',
    category: 'Tiếng Nhật',
    pitch: '+0Hz',
    rate: '+0%',
    description: 'Giọng nam thanh niên Nhật Bản lịch lãm',
  },
  {
    id: 'google-ja',
    name: 'Google Japanese',
    lang: 'ja',
    engine: 'google',
    voiceName: 'ja',
    gender: 'Nữ',
    flag: '🇯🇵',
    category: 'Tiếng Nhật',
    description: 'Giọng tiếng Nhật của Google',
  },

  // --- KOREAN ---
  {
    id: 'ko-KR-SunHiNeural',
    name: 'SunHi (Nữ Hàn Quốc)',
    lang: 'ko',
    engine: 'edge',
    voiceName: 'ko-KR-SunHiNeural',
    gender: 'Nữ',
    flag: '🇰🇷',
    category: 'Tiếng Hàn',
    description: 'Giọng nữ chuẩn Seoul trong trẻo, dễ thương',
  },
  {
    id: 'google-ko',
    name: 'Google Korean',
    lang: 'ko',
    engine: 'google',
    voiceName: 'ko',
    gender: 'Nữ',
    flag: '🇰🇷',
    category: 'Tiếng Hàn',
    description: 'Giọng tiếng Hàn quen thuộc',
  },

  // --- CHINESE ---
  {
    id: 'zh-CN-XiaoxiaoNeural',
    name: 'Xiaoxiao (Nữ Trung Quốc)',
    lang: 'zh-CN',
    engine: 'edge',
    voiceName: 'zh-CN-XiaoxiaoNeural',
    gender: 'Nữ',
    flag: '🇨🇳',
    category: 'Tiếng Trung',
    description: 'Giọng nữ phổ thông truyền cảm, nhẹ nhàng',
  },
  {
    id: 'google-zh-CN',
    name: 'Google Chinese',
    lang: 'zh-CN',
    engine: 'google',
    voiceName: 'zh-CN',
    gender: 'Nữ',
    flag: '🇨🇳',
    category: 'Tiếng Trung',
    description: 'Giọng tiếng Trung phổ thông',
  },

  // --- FRENCH & OTHERS ---
  {
    id: 'fr-FR-DeniseNeural',
    name: 'Denise (Nữ Pháp)',
    lang: 'fr',
    engine: 'edge',
    voiceName: 'fr-FR-DeniseNeural',
    gender: 'Nữ',
    flag: '🇫🇷',
    category: 'Ngôn ngữ khác',
    description: 'Giọng nữ tiếng Pháp lãng mạn, thanh lịch',
  },
  {
    id: 'google-es',
    name: 'Google Spanish',
    lang: 'es',
    engine: 'google',
    voiceName: 'es',
    gender: 'Nữ',
    flag: '🇪🇸',
    category: 'Ngôn ngữ khác',
    description: 'Giọng tiếng Tây Ban Nha',
  },
  {
    id: 'google-th',
    name: 'Google Thai',
    lang: 'th',
    engine: 'google',
    voiceName: 'th',
    gender: 'Nữ',
    flag: '🇹🇭',
    category: 'Ngôn ngữ khác',
    description: 'Giọng tiếng Thái Lan',
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
