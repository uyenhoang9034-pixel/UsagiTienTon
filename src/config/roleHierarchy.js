/**
 * roleHierarchy.js
 * Quản lý cấu hình phân cấp vai trò (Role Hierarchy) và quyền hạn Slash Command của Usagi Bot.
 *
 * Phân cấp vai trò:
 * Bậc 1: 1541303749916754001 (Owner) - Cao nhất
 * Bậc 2: 1545305594712432640 (Admin cấp cao)
 * Bậc 3: 1545295139390619768 (SP Ticket)
 *
 * Quy tắc thừa kế:
 * - Bậc 1 (Owner): Dùng được lệnh Bậc 1, Bậc 2, Bậc 3, và lệnh thường.
 * - Bậc 2 (Admin cấp cao): Dùng được lệnh Bậc 2, Bậc 3, và lệnh thường. KHÔNG THỂ dùng/thấy Bậc 1.
 * - Bậc 3 (SP Ticket): Dùng được lệnh Bậc 3, và lệnh thường. KHÔNG THỂ dùng/thấy Bậc 1, Bậc 2.
 * - Bậc 0 (Everyone): Chỉ dùng được lệnh thường. KHÔNG THỂ dùng/thấy Bậc 1, Bậc 2, Bậc 3.
 */

import { PermissionFlagsBits } from 'discord.js';

export const ROLE_HIERARCHY = Object.freeze({
  OWNER: '1541303749916754001', // Bậc 1: Owner (cao nhất)
  ADMIN: '1545305594712432640', // Bậc 2: Admin cấp cao
  SP_TICKET: '1545295139390619768', // Bậc 3: SP Ticket
});

export const COMMAND_TIERS = Object.freeze({
  // BẬC 1: Chỉ Owner (1541303749916754001)
  'setup-prism': 1,
  'prism-admin': 1,
  'doantu-admin': 1,
  'hsk-admin': 1,
  'spark': 1,
  'spark-admin': 1,

  // BẬC 2: Admin cấp cao (1545305594712432640) + Owner
  'xoatinnhan': 2,
  'phattu': 2,
  'thatu': 2,
  'hsk': 2, // Đã chuyển thành lệnh Admin
  'tts-admin': 2,
  'ttstrangthai': 2,

  // BẬC 3: SP Ticket (1545295139390619768) + Admin cấp cao + Owner
  'clear': 3,
  'close': 3,
  'moticket': 3,
  'ib1': 3,
  'ib2': 3,
  'ib3': 3,
});

export const TIER_NAMES = Object.freeze({
  1: '<@&1541303749916754001> (Owner)',
  2: '<@&1545305594712432640> (Admin cấp cao)',
  3: '<@&1545295139390619768> (SP Ticket)',
});

/**
 * Kiểm tra xem member có một roleId cụ thể hay không (hỗ trợ cả cache, roles mảng và _roles mảng).
 */
function memberHasRole(member, roleId) {
  if (!member || !roleId) return false;
  if (member.roles?.cache?.has?.(roleId)) return true;
  if (Array.isArray(member._roles) && member._roles.includes(roleId)) return true;
  if (Array.isArray(member.roles) && member.roles.includes(roleId)) return true;
  return false;
}

/**
 * Lấy bậc quyền cao nhất của member trong server:
 * @returns {number} 1 (Owner), 2 (Admin cấp cao), 3 (SP Ticket), 0 (Everyone)
 */
export function getMemberRoleTier(member, guild = null) {
  if (!member) return 0;

  const targetGuild = guild || member.guild;
  const userId = String(member.user?.id || member.id || '');

  // 1. Chủ máy chủ (Server Owner) luôn là Bậc 1
  if (targetGuild?.ownerId && String(targetGuild.ownerId) === userId) {
    return 1;
  }

  // 2. ID nằm trong danh sách OWNER_IDS
  const configuredOwnerIds = (process.env.OWNER_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  if (configuredOwnerIds.includes(userId)) {
    return 1;
  }

  // 3. Kiểm tra lần lượt từ bậc cao nhất xuống bậc thấp nhất
  if (memberHasRole(member, ROLE_HIERARCHY.OWNER)) {
    return 1;
  }
  if (memberHasRole(member, ROLE_HIERARCHY.ADMIN)) {
    return 2;
  }
  if (memberHasRole(member, ROLE_HIERARCHY.SP_TICKET)) {
    return 3;
  }

  // 4. Nếu có quyền Administrator nhưng chưa gán role cụ thể -> gán Bậc 1 để không bị khóa quyền
  if (member.permissions?.has?.(PermissionFlagsBits.Administrator)) {
    return 1;
  }

  return 0; // Thành viên thông thường (@everyone)
}

/**
 * Kiểm tra xem interaction có đủ quyền gọi lệnh hay không theo bảng phân quyền:
 * @param {import('discord.js').CommandInteraction} interaction
 * @param {string} commandName Tên lệnh (ví dụ: 'clear', 'doantu-admin')
 * @returns {{ allowed: boolean, requiredTier?: number, memberTier?: number, reason?: string }}
 */
export function checkCommandRoleHierarchy(interaction, commandName) {
  const requiredTier = COMMAND_TIERS[commandName];
  // Lệnh tự do cho everyone (không cấu hình trong bảng COMMAND_TIERS)
  if (!requiredTier) {
    return { allowed: true };
  }

  const memberTier = getMemberRoleTier(interaction.member, interaction.guild);

  // Thỏa mãn nếu memberTier > 0 và memberTier <= requiredTier (số nhỏ hơn = cấp cao hơn)
  if (memberTier > 0 && memberTier <= requiredTier) {
    return { allowed: true, requiredTier, memberTier };
  }

  return {
    allowed: false,
    requiredTier,
    memberTier,
    reason: `❌ Bạn không có quyền sử dụng lệnh này!\nLệnh \`/${commandName}\` yêu cầu vai trò tối thiểu là **${TIER_NAMES[requiredTier]}** trở lên.`,
  };
}
