import { getDatabaseValue } from '../utils/database.js';

const CAVE_KEY_PREFIX = 'games:cultivation:cave:';
const MAX_CAVE_PET_BONUS = 0.10;

import { getHeavenlyModifier } from './cultivationHeavenlySecret.js';

function caveKey(guildId, userId) {
  return `${CAVE_KEY_PREFIX}${guildId}:${userId}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, Number(value) || 0));
}

/**
 * Đọc riêng bonus Linh Thú Viên mà không import cultivationCave.js.
 * File này cố ý không phụ thuộc cultivationService/cultivationPet để các hệ thống
 * gameplay có thể dùng mà không tạo vòng import với Động Phủ.
 *
 * Động Phủ mặc định bắt đầu Lv.1, nên dữ liệu Cave chưa tồn tại vẫn tương đương +1%.
 * Nếu DB tạm lỗi, fallback 0 để gameplay gốc tiếp tục hoạt động an toàn.
 */
export async function getSafeCavePetBonus(client, guildId, userId) {
  try {
    const raw = await getDatabaseValue(
      client,
      caveKey(guildId, userId),
      null,
    );

    const level = raw && typeof raw === 'object'
      ? clamp(Math.floor(Number(raw?.buildings?.pet) || 1), 1, 10)
      : 1;

    const base = clamp(level * 0.01, 0, MAX_CAVE_PET_BONUS);
    const caveEffect = getHeavenlyModifier(guildId, 'cave_effect');
    const petEffect = getHeavenlyModifier(guildId, 'pet_effect');
    const scaledCaveBonus = Math.max(0, base * (1 + caveEffect));
    // Trả về tổng hệ số khuếch đại để amplifySafePetEffect có thể áp:
    // petBase × (1 + caveBonus) × (1 + Heavenly pet effect).
    return Math.max(0, (1 + scaledCaveBonus) * (1 + petEffect) - 1);
  } catch {
    return 0;
  }
}

/**
 * Chỉ khuếch đại hiệu ứng dạng số/%.
 * Không dùng cho các flag tuyệt đối như guaranteed_breakthrough hoặc
 * adventure_always_positive.
 */
export function amplifySafePetEffect(effectValue, cavePetBonus, { cap = null } = {}) {
  const base = Math.max(0, Number(effectValue) || 0);
  if (base <= 0) return 0;

  const bonus = Math.max(0, Number(cavePetBonus) || 0);
  let amplified = base * (1 + bonus);

  // null/undefined nghĩa là không giới hạn. Tránh Number(null) === 0
  // vô tình triệt tiêu các reward multiplier không có cap.
  if (cap !== null && cap !== undefined && Number.isFinite(Number(cap))) {
    amplified = Math.min(Math.max(0, Number(cap)), amplified);
  }

  return amplified;
}
