import {
  getDatabaseValue,
  setDatabaseValue,
} from '../utils/database.js';

const MAINTENANCE_KEY_PREFIX =
  'games:cultivation:maintenance:';

export const CULTIVATION_MAINTENANCE_MESSAGE =
  '⚔️ **TIÊN MÔN TẠM BẾ QUAN**\nTiên Tôn Usagi hiện đang bế quan chỉnh pháp, tu bổ Tiên Lộ. Đạo hữu xin tạm ngưng vận công, vui lòng chờ thông báo và thử lại sau.';

export const CULTIVATION_RESUMED_MESSAGE =
  '🌸 **TIÊN MÔN TÁI KHAI · VẠN PHÁP PHỤC HỒI**\nTiên Tôn Usagi đã xuất quan, Tiên Lộ nay đã ổn định trở lại. Chư vị đạo hữu có thể dùng `/tutien` trong **chủ đề Tiên Lộ của riêng mình** để tái khai giao diện và tiếp tục hành trình tu luyện.';

function getMaintenanceKey(guildId) {
  return `${MAINTENANCE_KEY_PREFIX}${guildId}`;
}

export async function getCultivationMaintenance(
  client,
  guildId,
) {
  if (!client?.db || !guildId) {
    return {
      enabled: false,
      updatedAt: null,
      updatedBy: null,
    };
  }

  const data = await getDatabaseValue(
    client,
    getMaintenanceKey(guildId),
    null,
  );

  if (!data || typeof data !== 'object') {
    return {
      enabled: false,
      updatedAt: null,
      updatedBy: null,
    };
  }

  return {
    enabled: data.enabled === true,
    updatedAt: data.updatedAt || null,
    updatedBy: data.updatedBy || null,
  };
}

export async function isCultivationMaintenance(
  client,
  guildId,
) {
  const state = await getCultivationMaintenance(
    client,
    guildId,
  );

  return state.enabled === true;
}

export async function setCultivationMaintenance(
  client,
  guildId,
  enabled,
  updatedBy = null,
) {
  const state = {
    enabled: enabled === true,
    updatedAt: Date.now(),
    updatedBy,
  };

  await setDatabaseValue(
    client,
    getMaintenanceKey(guildId),
    state,
  );

  return state;
}
