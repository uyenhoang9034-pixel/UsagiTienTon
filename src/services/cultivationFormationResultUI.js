const FORMATION_EMOJI = '<a:ttconghuong:1547830051951738960>';
const FORMATION_FRAGMENT_EMOJI = '<a:ttmanhtrando:1547960167667081276>';

function number(value) {
  return new Intl.NumberFormat('vi-VN').format(
    Math.max(0, Math.round(Number(value) || 0)),
  );
}

function percent(value) {
  return `${Math.round((Number(value) || 0) * 100)}%`;
}

function appendFragmentDropLine(lines, result) {
  const drop = result?.formationFragmentDrop;

  if (!drop?.dropped || !drop?.formation) {
    return lines;
  }

  lines.push(
    `${FORMATION_FRAGMENT_EMOJI} Mảnh Trận Đồ: **${drop.formation.name} ×${number(drop.quantity || 1)}**`,
  );

  return lines;
}

export function buildFormationCultivateLines(result) {
  const lines = [];

  if ((Number(result?.formationCultivationBonus) || 0) > 0) {
    lines.push(
      `${FORMATION_EMOJI} Cộng Hưởng Trận Pháp: **+${number(result.formationCultivationBonus)} Tu Vi**`,
    );
  }

  if ((Number(result?.formationStoneBonus) || 0) > 0) {
    lines.push(
      `${FORMATION_EMOJI} Trận Thế Tụ Linh: **+${number(result.formationStoneBonus)} Linh Thạch**`,
    );
  }

  if ((Number(result?.formationStaminaSaved) || 0) > 0) {
    lines.push(
      `${FORMATION_EMOJI} Trận Thế Điều Tức: **Giảm ${number(result.formationStaminaSaved)} Thể Lực tiêu hao**`,
    );
  }

  return lines;
}

export function buildFormationBreakthroughLines(result) {
  const bonus = Math.max(
    0,
    Number(result?.formationBreakthroughBonus) || 0,
  );

  if (bonus <= 0) {
    return [];
  }

  return [
    `${FORMATION_EMOJI} Cộng Hưởng Trận Pháp: **+${percent(bonus)} tỷ lệ Đột Phá**`,
  ];
}

export function buildFormationAdventureLines(result) {
  const lines = [];

  if ((Number(result?.formationAdventureBonus) || 0) > 0) {
    lines.push(
      `${FORMATION_EMOJI} Cộng Hưởng Thám Hiểm: **+${number(result.formationAdventureBonus)} Tu Vi**`,
    );
  }

  if ((Number(result?.formationStoneBonus) || 0) > 0) {
    lines.push(
      `${FORMATION_EMOJI} Trận Thế Tụ Linh: **+${number(result.formationStoneBonus)} Linh Thạch**`,
    );
  }

  return appendFragmentDropLine(
    lines,
    result,
  );
}

export function buildFormationSecretRealmLines(result) {
  const lines = [];

  if ((Number(result?.formationAdventureBonus) || 0) > 0) {
    lines.push(
      `${FORMATION_EMOJI} Cộng Hưởng Bí Cảnh: **+${number(result.formationAdventureBonus)} Tu Vi**`,
    );
  }

  if ((Number(result?.formationStoneBonus) || 0) > 0) {
    lines.push(
      `${FORMATION_EMOJI} Trận Thế Tụ Linh: **+${number(result.formationStoneBonus)} Linh Thạch**`,
    );
  }

  return appendFragmentDropLine(
    lines,
    result,
  );
}
