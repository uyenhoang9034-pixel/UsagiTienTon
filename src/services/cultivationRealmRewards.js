import {
  CULTIVATION_REALMS,
} from '../config/cultivationGame.js';

export const CULTIVATION_REALM_REWARD_MULTIPLIERS = [
  1,
  3,
  8,
  25,
  80,
  250,
  800,
  2500,
  8000,
  25000,
  80000,
  250000,
  800000,
  2500000,
  8000000,
  25000000,
  80000000,
  250000000,
  800000000,
  2500000000,
  8000000000,
];

// Tu Vi nhận từ Tu Luyện giữ đường cong gần bản gốc
// trước Chân Tiên. Từ Chân Tiên trở đi, service V2
// dùng mốc Tu Vi gốc cố định rồi cộng các bonus phụ.
const CULTIVATION_TUVI_REALM_MULTIPLIERS = [
  1,
  3,
  8,
  23,
  70,
  210,
  650,
  2000,
  6000,
  18000,
  55000,
  170000,
  600000,
  1800000,
  5500000,
  17000000,
  52000000,
  160000000,
  500000000,
  1500000000,
  4500000000,
];

const CHAN_TIEN_REALM_INDEX = Math.max(
  0,
  CULTIVATION_REALMS.indexOf('Chân Tiên'),
);

// Từ Chân Tiên trở đi Tu Vi dương được chuẩn hóa quanh base 200.000.
// Linh Thạch cũng cần nằm cùng mặt bằng thay vì rơi về x1.
// Hai hệ số dưới đây giữ độ ngẫu nhiên của reward gốc nhưng đưa trung bình
// về khoảng 200.000 trước các bonus Công Pháp / Pháp Khí / Linh Thú / Trận Pháp.
const IMMORTAL_CULTIVATE_STONE_MULTIPLIER = 11500;
const IMMORTAL_ADVENTURE_STONE_MULTIPLIER = 3300;

function getRealmIndex(profile) {
  const raw = Math.floor(Number(profile?.realmIndex) || 0);
  return Math.max(
    0,
    Math.min(
      raw,
      CULTIVATION_REALM_REWARD_MULTIPLIERS.length - 1,
    ),
  );
}

export function getRealmBaseRewardMultiplier(profile) {
  return CULTIVATION_REALM_REWARD_MULTIPLIERS[
    getRealmIndex(profile)
  ] || 1;
}

export function getCultivationRealmRewardMultipliers(profile) {
  const realmIndex = getRealmIndex(profile);
  const base = getRealmBaseRewardMultiplier(profile);
  const immortalRealm = realmIndex >= CHAN_TIEN_REALM_INDEX;
  const cultivation = immortalRealm
    ? 1
    : CULTIVATION_TUVI_REALM_MULTIPLIERS[realmIndex] || 1;

  return {
    base,
    cultivation,

    // Trước Chân Tiên: Linh Thạch đi cùng đúng đường cong Tu Vi.
    // Từ Chân Tiên: Tu Vi dùng base cố định 200k, nên Linh Thạch dùng
    // hệ số cân bằng riêng để reward trung bình cũng quanh cùng mặt bằng.
    spiritStones: immortalRealm
      ? IMMORTAL_CULTIVATE_STONE_MULTIPLIER
      : cultivation,
  };
}

export function getAdventureRealmRewardMultipliers(profile) {
  const realmIndex = getRealmIndex(profile);
  const base = getRealmBaseRewardMultiplier(profile);
  const immortalRealm = realmIndex >= CHAN_TIEN_REALM_INDEX;
  const cultivation = immortalRealm
    ? 1
    : Math.max(1, Math.round(base * 0.60));

  return {
    base,
    cultivation,

    // Thám Hiểm cũng dùng cùng tốc độ tăng theo Tu Vi trước Chân Tiên.
    // Từ Chân Tiên trở đi reward gốc của Thám Hiểm lớn hơn Tu Luyện,
    // nên dùng hệ số 3300 để trung bình vẫn quanh base 200k.
    spiritStones: immortalRealm
      ? IMMORTAL_ADVENTURE_STONE_MULTIPLIER
      : cultivation,
  };
}

export function scalePositiveRealmReward(amount, multiplier) {
  const safeAmount = Number(amount) || 0;

  if (safeAmount <= 0) {
    return safeAmount;
  }

  return Math.max(
    safeAmount,
    Math.round(
      safeAmount * Math.max(1, Number(multiplier) || 1),
    ),
  );
}
