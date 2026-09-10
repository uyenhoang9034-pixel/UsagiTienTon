/**
 * Command category metadata for Usagi Tiên Tôn.
 *
 * Repo này chỉ giữ Music + Tiên Lộ, nên các category cũ
 * như Economy / Ticket / Moderation / Giveaway... đã được bỏ.
 */

export const CATEGORY_ICONS = {
  Games: '⚔️',
  Music: '🎵',
};

/**
 * Lệnh luôn cho phép trong command access manager.
 * Hiện bot mới không giữ command quản trị core kiểu /commands hay /configwizard,
 * nên để trống để tránh tham chiếu nhầm command đã xóa.
 */
export const PROTECTED_COMMANDS = new Set([]);

export function normalizeCategoryKey(category) {
  return String(category || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

export function formatCategoryName(rawCategory) {
  return String(rawCategory || '')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getCategoryIcon(category) {
  return CATEGORY_ICONS[category]
    || CATEGORY_ICONS[formatCategoryName(category)]
    || '📁';
}
