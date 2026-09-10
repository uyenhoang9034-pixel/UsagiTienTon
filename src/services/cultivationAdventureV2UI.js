import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from 'discord.js';

import {
  CULTIVATION_CONFIG,
} from '../config/cultivationGame.js';

import {
  getRealmDisplay,
} from './cultivationService.js';

/**
 * =========================================================
 * EMOJIS · DISPLAY
 * =========================================================
 */

const EMOJI = {
  left:
    '<a:trangtrig2:1546040703375904801>',

  right:
    '<a:trangtrig3:1546040818261954610>',

  moon:
    '<a:tttrang:1547448866440347739>',

  user:
    '<:ttdaohuu:1547296747301376130>',

  realm:
    '<a:ttcanhgioi:1547448784924180500>',

  stamina:
    '<a:tttheluc:1547448708537262090>',

  equipment:
    '<a:ttkiem:1547448386771222619>',

  technique:
    '<a:ttbikip:1547448442022797342>',

  pet:
    '<a:ttlinhthu2:1547478815452954654>',

  spirit:
    '<a:ttlinhkhi:1547485632971149442>',

  abyss:
    '<a:ttvucsau:1547481470690660433>',

  monster:
    '<a:ttyeuthu:1547477368820469780>',

  lava:
    '<a:ttdungnham:1547489239682383902>',

  combat:
    '<a:ttgiaochien:1547482030747680898>',

  light:
    '<a:ttlinhquang:1547489273949978725>',

  mist:
    '<a:ttmansuongden:1547485663065014335>',

  thunder:
    '<a:ttthienloi:1547489755724382249>',

  tablet:
    '<a:ttbiada:1547491781845717062>',

  gate:
    '<a:ttcongda:1547491949945028669>',

  flower:
    '<a:tthoadao:1547491636077142056>',

  chest:
    '<a:ttruongco:1547493008914653245>',

  assist:
    '<a:tttrochien:1547493158923927602>',

  victory:
    '<a:ttchienthang:1547493833724403722>',

  defeat:
    '<a:ttthatbai:1547495028480409783>',

  ancient:
    '<a:ttcovan:1547494884250746931>',

  danger:
    '<a:ttnguyhiem:1547495450385317928>',

  cultivation:
    '<a:tttuvi:1547448737377427550>',

  stone:
    '<a:ttlinhthach:1547448522125869126>',

  ore:
    '<a:tthuyenthiet:1547448560818065498>',

  herb:
    '<a:ttlinhthao:1547464708318167122>',
};

/**
 * =========================================================
 * EMOJIS · BUTTON
 * =========================================================
 *
 * Discord.js v14:
 * Custom emoji cho ButtonBuilder phải dùng object { id }.
 *
 * KHÔNG truyền raw string ID trực tiếp vào .setEmoji().
 */

function customButtonEmoji(
  id,
) {
  if (!id) {
    return null;
  }

  if (
    typeof id ===
      'object' &&
    id.id
  ) {
    return {
      id:
        String(
          id.id,
        ),
    };
  }

  const value =
    String(id);

  const mentionMatch =
    value.match(
      /^<a?:[^:]+:(\d+)>$/,
    );

  if (
    mentionMatch
  ) {
    return {
      id:
        mentionMatch[1],
    };
  }

  if (
    /^\d{17,20}$/.test(
      value,
    )
  ) {
    return {
      id: value,
    };
  }

  return {
    name: value,
  };
}

function setButtonEmoji(
  button,
  emoji,
) {
  const resolved =
    customButtonEmoji(
      emoji,
    );

  if (
    resolved
  ) {
    button.setEmoji(
      resolved,
    );
  }

  return button;
}

const BUTTON_EMOJI = {
  spirit:
    customButtonEmoji(
      '1547485632971149442',
    ),

  abyss:
    customButtonEmoji(
      '1547481470690660433',
    ),

  monster:
    customButtonEmoji(
      '1547477368820469780',
    ),

  combat:
    customButtonEmoji(
      '1547482030747680898',
    ),

  mist:
    customButtonEmoji(
      '1547485663065014335',
    ),

  thunder:
    customButtonEmoji(
      '1547489755724382249',
    ),

  tablet:
    customButtonEmoji(
      '1547491781845717062',
    ),

  gate:
    customButtonEmoji(
      '1547491949945028669',
    ),

  flower:
    customButtonEmoji(
      '1547491636077142056',
    ),

  chest:
    customButtonEmoji(
      '1547493008914653245',
    ),

  assist:
    customButtonEmoji(
      '1547493158923927602',
    ),

  victory:
    customButtonEmoji(
      '1547493833724403722',
    ),

  ancient:
    customButtonEmoji(
      '1547494884250746931',
    ),

  danger:
    customButtonEmoji(
      '1547495450385317928',
    ),

  pet:
    customButtonEmoji(
      '1547478815452954654',
    ),

  ore:
    customButtonEmoji(
      '1547448560818065498',
    ),

  herb:
    customButtonEmoji(
      '1547464708318167122',
    ),
};

/**
 * =========================================================
 * HELPERS
 * =========================================================
 */

function applyStyle(
  embed,
) {
  embed.setColor(
    CULTIVATION_CONFIG
      .ui
      .color,
  );

  embed.setFooter({
    text:
      CULTIVATION_CONFIG
        .ui
        .footer,
  });

  if (
    CULTIVATION_CONFIG
      .ui
      .image
  ) {
    embed.setImage(
      CULTIVATION_CONFIG
        .ui
        .image,
    );
  }

  return embed;
}

function title(
  text,
) {
  return `${EMOJI.left} **${text}** ${EMOJI.right}`;
}

function number(
  value,
) {
  return new Intl.NumberFormat(
    'vi-VN',
  ).format(
    Math.max(
      0,
      Math.round(
        Number(
          value,
        ) || 0,
      ),
    ),
  );
}

function duration(
  ms,
) {
  const seconds =
    Math.max(
      0,
      Math.ceil(
        (
          Number(ms) ||
          0
        ) /
          1000,
      ),
    );

  const minutes =
    Math.floor(
      seconds /
        60,
    );

  const remaining =
    seconds %
    60;

  if (
    minutes <=
    0
  ) {
    return `${remaining}s`;
  }

  if (
    remaining <=
    0
  ) {
    return `${minutes}m`;
  }

  return `${minutes}m ${remaining}s`;
}

function getItemEmoji(
  droppedItem,
) {
  const type =
    droppedItem
      ?.item
      ?.type;

  if (
    type ===
    'herb'
  ) {
    return EMOJI.herb;
  }

  if (
    type ===
    'ore'
  ) {
    return EMOJI.ore;
  }

  return EMOJI.light;
}

function buildDropLine(
  droppedItem,
) {
  if (
    !droppedItem
  ) {
    return null;
  }

  const item =
    droppedItem
      .item;

  if (
    !item
  ) {
    return null;
  }

  return `${getItemEmoji(
    droppedItem,
  )} **${item.name}** × **${number(
    droppedItem.quantity ||
      1,
  )}**`;
}

function getDangerStars(
  danger,
) {
  const amount =
    Math.max(
      1,
      Math.min(
        5,
        Number(
          danger,
        ) ||
          1,
      ),
    );

  return (
    '★'.repeat(
      amount,
    ) +
    '☆'.repeat(
      5 -
        amount,
    )
  );
}

/**
 * =========================================================
 * OPEN SCREEN
 * =========================================================
 */

export function buildAdventureV2PreviewEmbed(
  user,
  result,
) {
  if (
    !result.ok &&
    result.reason ===
      'cooldown'
  ) {
    return applyStyle(
      new EmbedBuilder()
        .setDescription(
          [
            title(
              '静心 · ĐẠO TÂM CHƯA ỔN ĐỊNH',
            ),

            '',

            `${EMOJI.moon} *Vừa trải qua một chuyến thám hiểm, khí tức của đạo hữu vẫn chưa hoàn toàn bình phục.*`,

            '',

            '**Có thể tiếp tục sau**',

            `\`${duration(
              result.cooldownRemaining,
            )}\``,
          ].join(
            '\n',
          ),
        ),
    );
  }

  const profile =
    result.profile ||
    {};

  const equipment =
    result.equipment;

  const technique =
    result.technique;

  const pet =
    result.pet;

  return applyStyle(
    new EmbedBuilder()
      .setDescription(
        [
          title(
            '探索 · THÁM HIỂM',
          ),

          '',

          `${EMOJI.moon} *Sơn hà vô tận, cơ duyên ẩn hiện giữa thiên địa.*`,

          '',

          `${EMOJI.user} **Đạo hữu**`,
          `<@${user.id}>`,

          '',

          `${EMOJI.realm} **Cảnh giới**`,
          getRealmDisplay(
            profile,
          ),

          '',

          `${EMOJI.stamina} **Thể Lực**`,
          `${number(
            profile.stamina,
          )}/${number(
            profile.maxStamina ||
              CULTIVATION_CONFIG
                .gameplay
                ?.maxStamina ||
              100,
          )}`,

          '',

          `${EMOJI.equipment} **Pháp Khí**`,
          equipment
            ? equipment.name
            : '*Chưa trang bị*',

          '',

          `${EMOJI.technique} **Công Pháp**`,
          technique
            ? technique.name
            : '*Chưa kích hoạt*',

          '',

          `${EMOJI.pet} **Linh Thú**`,
          pet
            ? `${pet.emoji || EMOJI.pet} ${pet.name}`
            : '*Chưa có Linh Thú xuất chiến*',

          '',

          '*Đạo hữu rời động phủ, bước vào con đường tìm kiếm cơ duyên...*',
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildAdventureV2PreviewRows(
  ownerId,
  canStart = true,
) {
  const startButton =
    new ButtonBuilder()
      .setCustomId(
        `tutien_action:${ownerId}:adventure_v2_start`,
      )
      .setLabel(
        'Bắt đầu thám hiểm',
      )
      .setStyle(
        ButtonStyle.Secondary,
      )
      .setDisabled(
        !canStart,
      );

  setButtonEmoji(
    startButton,
    BUTTON_EMOJI.spirit,
  );

  return [
    new ActionRowBuilder()
      .addComponents(
        startButton,

        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:dashboard`,
          )
          .setLabel(
            'Quay lại',
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),
  ];
}

/**
 * =========================================================
 * LOCATION
 * =========================================================
 */

export function buildAdventureV2LocationEmbed(
  location,
) {
  const lines = [
    title(
      `探索 · ${location.name}`,
    ),

    '',
  ];

  if (
    location.id ===
    'thanh_van_son'
  ) {
    lines.push(
      `${EMOJI.moon} *${location.description}*`,
      '',
      'Phía trước xuất hiện hai con đường.',
      '',
      `${EMOJI.spirit} Một con đường tỏa ra linh khí thanh thuần.`,
      '',
      `${EMOJI.monster} Con đường còn lại vang lên tiếng gầm trầm thấp của yêu thú.`,
    );
  } else if (
    location.id ===
    'u_minh_coc'
  ) {
    lines.push(
      `${EMOJI.mist} *${location.description}*`,
      '',
      `${EMOJI.light} Một luồng linh quang yếu ớt lóe lên sâu trong màn sương.`,
      '',
      `${EMOJI.abyss} Từ phía vực sâu truyền tới một luồng yêu khí lạnh lẽo.`,
    );
  } else if (
    location.id ===
    'xich_viem_dong'
  ) {
    lines.push(
      `${EMOJI.lava} *${location.description}*`,
      '',
      `${EMOJI.ore} Trong vách đá lộ ra một mạch khoáng đỏ rực.`,
      '',
      `${EMOJI.monster} Phía sâu trong hang động vang lên tiếng móng vuốt cào vào đá.`,
    );
  } else if (
    location.id ===
    'dao_hoa_coc'
  ) {
    lines.push(
      `${EMOJI.flower} *${location.description}*`,
      '',
      `${EMOJI.herb} Một vùng linh thảo mọc giữa rừng hoa.`,
      '',
      `${EMOJI.light} Xa xa, bên cổ đình thấp thoáng một bóng người áo trắng giữa linh quang nhàn nhạt.`,
    );
  } else if (
    location.id ===
    'loi_vuc'
  ) {
    lines.push(
      `${EMOJI.thunder} *${location.description}*`,
      '',
      `${EMOJI.ore} Một khối khoáng vật hấp thu lôi điện đang phát sáng.`,
      '',
      `${EMOJI.pet} Linh Thú của đạo hữu dường như cảm nhận được thứ gì đó phía trước.`,
    );
  } else if (
    location.id ===
    'thuong_co_di_tich'
  ) {
    lines.push(
      `${EMOJI.ancient} *${location.description}*`,
      '',
      `${EMOJI.gate} Một cánh cổng đá bị phong ấn xuất hiện trước mặt.`,
      '',
      `${EMOJI.tablet} Bên cạnh là một bia đá phủ đầy cổ văn.`,
    );
  } else {
    lines.push(
      `${EMOJI.moon} *${location.description || 'Một vùng đất xa lạ hiện ra trước mắt.'}*`,
    );
  }

  return applyStyle(
    new EmbedBuilder()
      .setDescription(
        lines.join(
          '\n',
        ),
      ),
  );
}

export function buildAdventureV2LocationRows(
  ownerId,
  location,
) {
  const row =
    new ActionRowBuilder();

  for (
    const choice of
      location.choices ||
    []
  ) {
    const button =
      new ButtonBuilder()
        .setCustomId(
          `tutien_action:${ownerId}:adventure_v2_choice:${choice.id}`,
        )
        .setLabel(
          choice.label,
        )
        .setStyle(
          ButtonStyle.Secondary,
        );

    setButtonEmoji(
      button,
      choice.emoji,
    );

    row.addComponents(
      button,
    );
  }

  row.addComponents(
    new ButtonBuilder()
      .setCustomId(
        `tutien_action:${ownerId}:dashboard`,
      )
      .setLabel(
        'Rời đi',
      )
      .setStyle(
        ButtonStyle.Secondary,
      ),
  );

  return [
    row,
  ];
}

/**
 * =========================================================
 * MONSTER
 * =========================================================
 */

export function buildAdventureV2MonsterEmbed(
  result,
) {
  const monster =
    result.monster ||
    {};

  return applyStyle(
    new EmbedBuilder()
      .setDescription(
        [
          title(
            '妖兽 · YÊU THÚ XUẤT HIỆN',
          ),

          '',

          `${EMOJI.mist} *Màn sương rung chuyển, yêu khí bùng lên dữ dội.*`,

          '',

          `${EMOJI.monster} **${monster.name || 'Yêu Thú'}**`,

          '',

          `${EMOJI.danger} **Mức nguy hiểm**`,
          getDangerStars(
            monster.danger,
          ),

          '',

          `${EMOJI.combat} *Một trận chiến dường như không thể tránh khỏi...*`,
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildAdventureV2MonsterRows(
  ownerId,
) {
  const fight =
    new ButtonBuilder()
      .setCustomId(
        `tutien_action:${ownerId}:adventure_v2_fight`,
      )
      .setLabel(
        'Giao chiến',
      )
      .setStyle(
        ButtonStyle.Secondary,
      );

  const assist =
    new ButtonBuilder()
      .setCustomId(
        `tutien_action:${ownerId}:adventure_v2_assist`,
      )
      .setLabel(
        'Linh Thú trợ chiến',
      )
      .setStyle(
        ButtonStyle.Secondary,
      );

  const retreat =
    new ButtonBuilder()
      .setCustomId(
        `tutien_action:${ownerId}:adventure_v2_retreat`,
      )
      .setLabel(
        'Rút lui',
      )
      .setStyle(
        ButtonStyle.Secondary,
      );

  setButtonEmoji(
    fight,
    BUTTON_EMOJI.combat,
  );

  setButtonEmoji(
    assist,
    BUTTON_EMOJI.assist,
  );

  setButtonEmoji(
    retreat,
    BUTTON_EMOJI.danger,
  );

  return [
    new ActionRowBuilder()
      .addComponents(
        fight,
        assist,
        retreat,
      ),
  ];
}

/**
 * =========================================================
 * PET ASSIST
 * =========================================================
 */

export function buildAdventureV2AssistEmbed(
  result,
) {
  if (
    !result.pet
  ) {
    return applyStyle(
      new EmbedBuilder()
        .setDescription(
          [
            title(
              '灵兽 · LINH THÚ TRỢ CHIẾN',
            ),

            '',

            `${EMOJI.pet} *Hiện tại không có Linh Thú nào đang xuất chiến.*`,

            '',

            'Đạo hữu chỉ có thể tự mình đối mặt với yêu thú.',
          ].join(
            '\n',
          ),
        ),
    );
  }

  return applyStyle(
    new EmbedBuilder()
      .setDescription(
        [
          title(
            '灵兽 · LINH THÚ TRỢ CHIẾN',
          ),

          '',

          `${result.pet.emoji || EMOJI.pet} **${result.pet.name}**`,

          '',

          `${EMOJI.assist} *Linh thú bước lên phía trước, khí tức nhanh chóng khóa chặt yêu thú.*`,

          '',

          `${EMOJI.assist} **Hiệu quả trợ chiến**`,
          'Tăng **10%** tỷ lệ chiến thắng trong trận này.',

          '',

          `${EMOJI.combat} **Tỷ lệ chiến thắng**`,
          `**${Math.round(
            (
              Number(
                result.winChance,
              ) ||
              0
            ) *
              100,
          )}%**`,
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildAdventureV2AssistRows(
  ownerId,
  hasPet,
) {
  const assistFight =
    new ButtonBuilder()
      .setCustomId(
        `tutien_action:${ownerId}:adventure_v2_fight_assist`,
      )
      .setLabel(
        'Giao chiến',
      )
      .setStyle(
        ButtonStyle.Secondary,
      )
      .setDisabled(
        !hasPet,
      );

  const soloFight =
    new ButtonBuilder()
      .setCustomId(
        `tutien_action:${ownerId}:adventure_v2_fight`,
      )
      .setLabel(
        'Tự mình giao chiến',
      )
      .setStyle(
        ButtonStyle.Secondary,
      );

  setButtonEmoji(
    assistFight,
    BUTTON_EMOJI.combat,
  );

  setButtonEmoji(
    soloFight,
    BUTTON_EMOJI.combat,
  );

  return [
    new ActionRowBuilder()
      .addComponents(
        assistFight,
        soloFight,

        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:adventure_v2_retreat`,
          )
          .setLabel(
            'Rút lui',
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),
  ];
}

/**
 * =========================================================
 * COMBAT RESULT
 * =========================================================
 */

export function buildAdventureV2CombatResultEmbed(
  result,
) {
  if (
    result.success
  ) {
    const lines = [
      title(
        '胜利 · CHIẾN THẮNG',
      ),

      '',

      `${EMOJI.victory} *Yêu khí tan biến, sơn lâm dần trở lại yên tĩnh.*`,

      '',

      `Đạo hữu đã đánh bại ${EMOJI.monster} **${result.monster?.name || 'Yêu Thú'}**.`,

      '',

      `${EMOJI.cultivation} **Tu Vi**`,
      `+${number(
        result.cultivationDelta,
      )}`,

      '',

      `${EMOJI.stone} **Linh Thạch**`,
      `+${number(
        result.stoneDelta,
      )}`,
    ];

    if (
      result.petAssist &&
      result.pet
    ) {
      lines.push(
        '',
        `${result.pet.emoji || EMOJI.pet} **${result.pet.name}** đã trợ chiến.`,
      );
    }

    const dropLine =
      buildDropLine(
        result.droppedItem,
      );

    if (
      dropLine
    ) {
      lines.push(
        '',
        `${EMOJI.victory} **Chiến lợi phẩm**`,
        dropLine,
      );
    }

    return applyStyle(
      new EmbedBuilder()
        .setDescription(
          lines.join(
            '\n',
          ),
        ),
    );
  }

  return applyStyle(
    new EmbedBuilder()
      .setDescription(
        [
          title(
            '败北 · GIAO CHIẾN THẤT BẠI',
          ),

          '',

          `${EMOJI.defeat} *Thế công tan vỡ, linh lực trong cơ thể đạo hữu trở nên hỗn loạn.*`,

          '',

          `${EMOJI.cultivation} **Tu Vi tổn thất**`,
          `-${number(
            Math.abs(
              Number(
                result.cultivationDelta,
              ) ||
                0,
            ),
          )}`,

          '',

          `${EMOJI.stamina} **Thể Lực**`,
          `-${number(
            Math.abs(
              Number(
                result.staminaDelta,
              ) ||
                0,
            ),
          )}`,

          '',

          '*May mắn đạo cơ chưa bị tổn hại.*',
        ].join(
          '\n',
        ),
      ),
  );
}

/**
 * =========================================================
 * RETREAT
 * =========================================================
 */

export function buildAdventureV2RetreatEmbed(
  result,
) {
  if (
    result.success
  ) {
    return applyStyle(
      new EmbedBuilder()
        .setDescription(
          [
            title(
              '退 · RỜI KHỎI NGUY HIỂM',
            ),

            '',

            `${EMOJI.danger} *Biết tiến biết lui cũng là một phần của tiên đạo.*`,

            '',

            `Đạo hữu rời khỏi khu vực trước khi ${EMOJI.monster} yêu thú kịp truy đuổi.`,

            '',

            '**Không nhận được chiến lợi phẩm.**',
          ].join(
            '\n',
          ),
        ),
    );
  }

  return applyStyle(
    new EmbedBuilder()
      .setDescription(
        [
          title(
            '追击 · YÊU THÚ TRUY KÍCH',
          ),

          '',

          `${EMOJI.monster} *Yêu thú phát hiện khí tức của đạo hữu và lập tức lao tới.*`,

          '',

          `${EMOJI.danger} Không thể tiếp tục rút lui.`,
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildAdventureV2RetreatRows(
  ownerId,
  success,
) {
  if (
    success
  ) {
    return [
      new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(
              `tutien_action:${ownerId}:dashboard`,
            )
            .setLabel(
              'Trở về',
            )
            .setStyle(
              ButtonStyle.Secondary,
            ),
        ),
    ];
  }

  const fight =
    new ButtonBuilder()
      .setCustomId(
        `tutien_action:${ownerId}:adventure_v2_fight`,
      )
      .setLabel(
        'Giao chiến',
      )
      .setStyle(
        ButtonStyle.Secondary,
      );

  setButtonEmoji(
    fight,
    BUTTON_EMOJI.combat,
  );

  return [
    new ActionRowBuilder()
      .addComponents(
        fight,
      ),
  ];
}

/**
 * =========================================================
 * NORMAL RESULTS
 * =========================================================
 */

export function buildAdventureV2ResultEmbed(
  result,
) {
  let heading =
    '奇遇 · KỲ NGỘ';

  let intro =
    `${EMOJI.light} *Một cơ duyên bất ngờ xuất hiện trên Tiên Lộ.*`;

  if (
    result.type ===
    'spirit_fortune'
  ) {
    intro =
      `${EMOJI.spirit} *Thiên địa linh khí bất ngờ hội tụ quanh đạo hữu.*`;
  } else if (
    result.type ===
    'black_mist'
  ) {
    heading =
      '幽雾 · U MINH KỲ NGỘ';

    intro =
      `${EMOJI.mist} *Xuyên qua màn sương đen, đạo hữu phát hiện một vùng linh khí ẩn giấu.*`;
  } else if (
    result.type ===
      'ore' ||
    result.type ===
      'thunder_ore'
  ) {
    heading =
      '灵矿 · LINH KHOÁNG HIỆN THẾ';

    intro =
      result.type ===
      'thunder_ore'
        ? `${EMOJI.thunder} *Thiên lôi vừa tan, lôi khoáng ẩn dưới mặt đất hoàn toàn hiện rõ.*`
        : `${EMOJI.ore} *Một luồng kim khí sắc bén phát ra từ sâu trong vách đá.*`;
  } else if (
    result.type ===
    'herb'
  ) {
    heading =
      '灵草 · LINH THẢO HIỆN THẾ';

    intro =
      `${EMOJI.flower} *Giữa rừng hoa đào, linh thảo hấp thu tinh hoa nhật nguyệt đang khẽ lay động.*`;
  } else if (
    result.type ===
    'pavilion'
  ) {
    heading =
      '奇遇 · CỔ ĐÌNH KỲ NGỘ';

    intro =
      `${EMOJI.flower} *Bóng người áo trắng đã biến mất, chỉ còn một luồng đạo vận lưu lại trong cổ đình.*`;
  } else if (
    result.type ===
    'ancient_gate'
  ) {
    heading =
      '古遗迹 · CỔNG ĐÁ ĐÃ MỞ';

    intro =
      `${EMOJI.gate} *Phong ấn tan biến, linh quang cổ xưa tràn ra từ phía sau cổng đá.*`;
  } else if (
    result.type ===
    'insight_success'
  ) {
    heading =
      '悟道 · NGỘ ĐẠO';

    intro =
      `${EMOJI.ancient} *Cổ văn trên bia đá hóa thành thần niệm, dung nhập vào thức hải.*`;
  } else if (
    result.type ===
    'insight_failed'
  ) {
    heading =
      '悟 · ĐẠO VẬN KHÓ HIỂU';

    intro =
      `${EMOJI.ancient} *Cổ văn quá huyền ảo, đạo hữu nhất thời chưa thể lĩnh ngộ.*`;
  } else if (
    result.type ===
    'pet_trail_empty'
  ) {
    heading =
      '灵兽 · LINH DẤU';

    intro =
      `${EMOJI.pet} *Dấu vết Linh Thú dần biến mất, nhưng linh khí còn sót lại vẫn mang tới một chút cơ duyên.*`;
  }

  const lines = [
    title(
      heading,
    ),

    '',

    intro,
  ];

  if (
    Number(
      result.cultivationDelta,
    ) >
    0
  ) {
    lines.push(
      '',
      `${EMOJI.cultivation} **Tu Vi**`,
      `+${number(
        result.cultivationDelta,
      )}`,
    );
  }

  if (
    Number(
      result.stoneDelta,
    ) >
    0
  ) {
    lines.push(
      '',
      `${EMOJI.stone} **Linh Thạch**`,
      `+${number(
        result.stoneDelta,
      )}`,
    );
  }

  const dropLine =
    buildDropLine(
      result.droppedItem,
    );

  if (
    dropLine
  ) {
    lines.push(
      '',
      '**Nhận được**',
      dropLine,
    );
  }

  if (
    result.type ===
    'insight_failed'
  ) {
    lines.push(
      '',
      `${EMOJI.defeat} Không nhận được cơ duyên.`,
    );
  }

  return applyStyle(
    new EmbedBuilder()
      .setDescription(
        lines.join(
          '\n',
        ),
      ),
  );
}

export function buildAdventureV2ResultRows(
  ownerId,
) {
  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:dashboard`,
          )
          .setLabel(
            'Trở về động phủ',
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),
  ];
}

/**
 * =========================================================
 * ERROR
 * =========================================================
 */

export function buildAdventureV2ErrorEmbed() {
  return applyStyle(
    new EmbedBuilder()
      .setDescription(
        [
          title(
            '探索 · HÀNH TRÌNH ĐÃ KHÉP LẠI',
          ),

          '',

          `${EMOJI.moon} *Dấu vết của chuyến thám hiểm này đã tan biến.*`,

          '',

          'Hãy quay lại Tiên Lộ và bắt đầu một chuyến Thám Hiểm mới.',
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildAdventureV2ErrorRows(
  ownerId,
) {
  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:dashboard`,
          )
          .setLabel(
            'Quay lại Tiên Lộ',
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),
  ];
}

/**
 * =========================================================
 * V2.9.2 · BIA ĐÁ / CỔ VĂN
 * =========================================================
 */

export function buildAncientTabletEmbed() {
  return applyStyle(
    new EmbedBuilder()
      .setDescription(
        [
          title(
            '上古石碑 · THƯỢNG CỔ THẠCH BI',
          ),

          '',

          `${EMOJI.tablet} *Một bia đá cổ xưa đứng lặng giữa tàn tích.*`,

          '',

          `${EMOJI.ancient} Những dòng cổ văn trên bề mặt dần phát sáng khi đạo hữu tới gần.`,

          '',

          `${EMOJI.light} Một luồng thần niệm cổ xưa truyền vào thức hải.`,

          '',

          '*Những đạo văn này dường như đang chờ người hữu duyên lĩnh ngộ...*',
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildAncientTabletRows(
  ownerId,
) {
  const comprehend =
    new ButtonBuilder()
      .setCustomId(
        `tutien_action:${ownerId}:adventure_v2_comprehend`,
      )
      .setLabel(
        'Tham ngộ cổ văn',
      )
      .setStyle(
        ButtonStyle.Secondary,
      );

  setButtonEmoji(
    comprehend,
    BUTTON_EMOJI.ancient,
  );

  return [
    new ActionRowBuilder()
      .addComponents(
        comprehend,

        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:dashboard`,
          )
          .setLabel(
            'Rời đi',
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),
  ];
}

/**
 * =========================================================
 * V2.9.2 · CỔNG ĐÁ
 * =========================================================
 */

export function buildAncientGateEmbed() {
  return applyStyle(
    new EmbedBuilder()
      .setDescription(
        [
          title(
            '古门 · THƯỢNG CỔ THẠCH MÔN',
          ),

          '',

          `${EMOJI.gate} *Một cánh cổng đá khổng lồ chắn ngang con đường phía trước.*`,

          '',

          `${EMOJI.ancient} Cổ văn chạy dọc theo khe cửa, tạo thành một lớp phong ấn đã tồn tại không biết bao nhiêu năm.`,

          '',

          `${EMOJI.light} Từ phía sau cánh cổng truyền ra từng đợt linh quang yếu ớt.`,

          '',

          `${EMOJI.danger} *Phá giải phong ấn có thể mở ra cơ duyên... nhưng cũng có thể đánh thức thứ đang ngủ bên trong.*`,
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildAncientGateRows(
  ownerId,
) {
  const open =
    new ButtonBuilder()
      .setCustomId(
        `tutien_action:${ownerId}:adventure_v2_gate_open`,
      )
      .setLabel(
        'Phá giải phong ấn',
      )
      .setStyle(
        ButtonStyle.Secondary,
      );

  setButtonEmoji(
    open,
    BUTTON_EMOJI.gate,
  );

  return [
    new ActionRowBuilder()
      .addComponents(
        open,

        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:dashboard`,
          )
          .setLabel(
            'Rời đi',
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),
  ];
}

export function buildAncientGateFailedEmbed(
  result,
) {
  return applyStyle(
    new EmbedBuilder()
      .setDescription(
        [
          title(
            '禁制 · PHONG ẤN PHẢN PHỆ',
          ),

          '',

          `${EMOJI.defeat} *Cổ văn trên cổng đá đột nhiên bùng sáng.*`,

          '',

          `${EMOJI.danger} Một luồng lực lượng cổ xưa phản chấn thẳng vào kinh mạch.`,

          '',

          `${EMOJI.cultivation} **Tu Vi tổn thất**`,
          `-${number(
            Math.abs(
              Number(
                result.cultivationDelta,
              ) ||
                0,
            ),
          )}`,

          '',

          '*Phong ấn vẫn chưa thể phá giải.*',
        ].join(
          '\n',
        ),
      ),
  );
}

/**
 * =========================================================
 * V2.9.2 · RƯƠNG CỔ
 * =========================================================
 */

export function buildAncientChestEmbed() {
  return applyStyle(
    new EmbedBuilder()
      .setDescription(
        [
          title(
            '宝箱 · BẢO RƯƠNG',
          ),

          '',

          `${EMOJI.gate} *Cổng đá chậm rãi mở ra, bụi thời gian rơi xuống từng lớp.*`,

          '',

          `${EMOJI.chest} Một chiếc rương cổ bị dây leo bao phủ nằm giữa gian thạch thất.`,

          '',

          `${EMOJI.light} Linh quang từ bên trong rương không ngừng dao động.`,

          '',

          `${EMOJI.danger} *Không ai biết bên dưới lớp bụi kia có ẩn giấu cấm chế hay không...*`,
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildAncientChestRows(
  ownerId,
) {
  const open =
    new ButtonBuilder()
      .setCustomId(
        `tutien_action:${ownerId}:adventure_v2_chest_open`,
      )
      .setLabel(
        'Mở bảo rương',
      )
      .setStyle(
        ButtonStyle.Secondary,
      );

  const inspect =
    new ButtonBuilder()
      .setCustomId(
        `tutien_action:${ownerId}:adventure_v2_chest_inspect`,
      )
      .setLabel(
        'Kiểm tra trước',
      )
      .setStyle(
        ButtonStyle.Secondary,
      );

  setButtonEmoji(
    open,
    BUTTON_EMOJI.chest,
  );

  setButtonEmoji(
    inspect,
    BUTTON_EMOJI.danger,
  );

  return [
    new ActionRowBuilder()
      .addComponents(
        open,
        inspect,

        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:adventure_v2_chest_leave`,
          )
          .setLabel(
            'Bỏ qua',
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),
  ];
}

export function buildAncientChestInspectEmbed(
  result,
) {
  if (
    result.trapped
  ) {
    return applyStyle(
      new EmbedBuilder()
        .setDescription(
          [
            title(
              '禁制 · PHÁT HIỆN CẤM CHẾ',
            ),

            '',

            `${EMOJI.danger} *Thần thức vừa chạm tới chiếc rương, những đường trận văn ẩn giấu lập tức hiện lên.*`,

            '',

            `${EMOJI.chest} **Rương Cổ**`,

            `${EMOJI.ancient} Một lớp cấm chế cổ xưa đang bảo vệ vật phẩm bên trong.`,

            '',

            '*Nếu muốn mở rương, đạo hữu cần phá giải cấm chế trước.*',
          ].join(
            '\n',
          ),
        ),
    );
  }

  return applyStyle(
    new EmbedBuilder()
      .setDescription(
        [
          title(
            '宝箱 · KIỂM TRA BẢO RƯƠNG',
          ),

          '',

          `${EMOJI.light} *Thần thức quét qua từng đường vân trên chiếc rương.*`,

          '',

          `${EMOJI.victory} Không phát hiện cấm chế nguy hiểm.`,

          '',

          `${EMOJI.chest} **Có thể mở bảo rương an toàn.**`,
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildAncientChestInspectRows(
  ownerId,
  trapped,
) {
  if (
    trapped
  ) {
    const disarm =
      new ButtonBuilder()
        .setCustomId(
          `tutien_action:${ownerId}:adventure_v2_chest_disarm`,
        )
        .setLabel(
          'Phá giải cấm chế',
        )
        .setStyle(
          ButtonStyle.Secondary,
        );

    setButtonEmoji(
      disarm,
      BUTTON_EMOJI.ancient,
    );

    return [
      new ActionRowBuilder()
        .addComponents(
          disarm,

          new ButtonBuilder()
            .setCustomId(
              `tutien_action:${ownerId}:adventure_v2_chest_leave`,
            )
            .setLabel(
              'Bỏ qua',
            )
            .setStyle(
              ButtonStyle.Secondary,
            ),
        ),
    ];
  }

  const open =
    new ButtonBuilder()
      .setCustomId(
        `tutien_action:${ownerId}:adventure_v2_chest_open`,
      )
      .setLabel(
        'Mở bảo rương',
      )
      .setStyle(
        ButtonStyle.Secondary,
      );

  setButtonEmoji(
    open,
    BUTTON_EMOJI.chest,
  );

  return [
    new ActionRowBuilder()
      .addComponents(
        open,

        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:adventure_v2_chest_leave`,
          )
          .setLabel(
            'Bỏ qua',
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),
  ];
}

/**
 * =========================================================
 * V2.9.2 · GỠ CẤM CHẾ
 * =========================================================
 */

export function buildChestDisarmEmbed(
  result,
) {
  if (
    result.success
  ) {
    return applyStyle(
      new EmbedBuilder()
        .setDescription(
          [
            title(
              '解禁 · CẤM CHẾ ĐÃ PHÁ',
            ),

            '',

            `${EMOJI.ancient} *Từng đường cổ văn lần lượt mờ đi.*`,

            '',

            `${EMOJI.light} Linh quang bao quanh chiếc rương dần ổn định.`,

            '',

            `${EMOJI.victory} **Đã phá giải cấm chế thành công.**`,

            '',

            `${EMOJI.chest} Bảo rương hiện đã có thể mở.`,
          ].join(
            '\n',
          ),
        ),
    );
  }

  return applyStyle(
    new EmbedBuilder()
      .setDescription(
        [
          title(
            '禁制 · CẤM CHẾ BÙNG NỔ',
          ),

          '',

          `${EMOJI.defeat} *Một nét cổ văn bị phá sai, toàn bộ trận pháp lập tức mất kiểm soát.*`,

          '',

          `${EMOJI.cultivation} **Tu Vi tổn thất**`,
          `-${number(
            Math.abs(
              Number(
                result.cultivationDelta,
              ) ||
                0,
            ),
          )}`,

          '',

          `${EMOJI.stamina} **Thể Lực**`,
          `-${number(
            Math.abs(
              Number(
                result.staminaDelta,
              ) ||
                0,
            ),
          )}`,
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildChestDisarmRows(
  ownerId,
  success,
) {
  if (
    success
  ) {
    const open =
      new ButtonBuilder()
        .setCustomId(
          `tutien_action:${ownerId}:adventure_v2_chest_open`,
        )
        .setLabel(
          'Mở bảo rương',
        )
        .setStyle(
          ButtonStyle.Secondary,
        );

    setButtonEmoji(
      open,
      BUTTON_EMOJI.chest,
    );

    return [
      new ActionRowBuilder()
        .addComponents(
          open,

          new ButtonBuilder()
            .setCustomId(
              `tutien_action:${ownerId}:adventure_v2_chest_leave`,
            )
            .setLabel(
              'Bỏ qua',
            )
            .setStyle(
              ButtonStyle.Secondary,
            ),
        ),
    ];
  }

  return buildAdventureV2ResultRows(
    ownerId,
  );
}

/**
 * =========================================================
 * V2.9.2 · MỞ RƯƠNG
 * =========================================================
 */

export function buildAncientChestResultEmbed(
  result,
) {
  if (
    result.type ===
    'chest_trap'
  ) {
    return applyStyle(
      new EmbedBuilder()
        .setDescription(
          [
            title(
              '禁制 · CẤM CHẾ KÍCH HOẠT',
            ),

            '',

            `${EMOJI.danger} *Ngay khi chạm vào bảo rương, trận văn bên dưới đột nhiên bùng sáng.*`,

            '',

            `${EMOJI.defeat} Linh lực hỗn loạn đánh thẳng vào kinh mạch.`,

            '',

            `${EMOJI.cultivation} **Tu Vi tổn thất**`,
            `-${number(
              Math.abs(
                Number(
                  result.cultivationDelta,
                ) ||
                  0,
              ),
            )}`,

            '',

            `${EMOJI.stamina} **Thể Lực**`,
            `-${number(
              Math.abs(
                Number(
                  result.staminaDelta,
                ) ||
                  0,
              ),
            )}`,
          ].join(
            '\n',
          ),
        ),
    );
  }

  const dropLine =
    buildDropLine(
      result.droppedItem,
    );

  const lines = [
    title(
      '宝箱 · BẢO RƯƠNG ĐÃ MỞ',
    ),

    '',

    `${EMOJI.light} *Linh quang bùng lên khi nắp rương chậm rãi mở ra.*`,

    '',

    `${EMOJI.chest} **Chiến lợi phẩm**`,

    '',

    `${EMOJI.cultivation} **Tu Vi**`,
    `+${number(
      result.cultivationDelta,
    )}`,

    '',

    `${EMOJI.stone} **Linh Thạch**`,
    `+${number(
      result.stoneDelta,
    )}`,
  ];

  if (
    dropLine
  ) {
    lines.push(
      '',
      '**Vật phẩm**',
      dropLine,
    );
  }

  lines.push(
    '',
    `${EMOJI.victory} *Cơ duyên trong Thượng Cổ Di Tích đã thuộc về đạo hữu.*`,
  );

  return applyStyle(
    new EmbedBuilder()
      .setDescription(
        lines.join(
          '\n',
        ),
      ),
  );
}

/**
 * =========================================================
 * V2.9.2 · BỎ QUA RƯƠNG
 * =========================================================
 */

export function buildAncientChestLeaveEmbed() {
  return applyStyle(
    new EmbedBuilder()
      .setDescription(
        [
          title(
            '退 · RỜI KHỎI DI TÍCH',
          ),

          '',

          `${EMOJI.danger} *Đạo hữu quan sát chiếc rương một lúc rồi quyết định không mạo hiểm.*`,

          '',

          'Biết tiến biết lui cũng là một phần của Tiên Đạo.',

          '',

          '**Không nhận được chiến lợi phẩm.**',
        ].join(
          '\n',
        ),
      ),
  );
}
