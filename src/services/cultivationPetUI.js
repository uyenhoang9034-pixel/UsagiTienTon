import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';

import {
  CULTIVATION_CONFIG,
} from '../config/cultivationGame.js';

import {
  getActivePet,
  getCultivationPet,
  getOwnedPets,
} from './cultivationPet.js';

const SEPARATOR =
  '꒷꒦︶꒷꒦︶ ๋ ࣭ ⭑꒷꒦';

const USER_EMOJI =
  CULTIVATION_CONFIG
    .ui
    .emojis
    .user;

const PET_BUTTON_EMOJI = {
  id:
    CULTIVATION_CONFIG
      .ui
      .buttonEmojis
      .pet,
};

const ADVENTURE_BUTTON_EMOJI = {
  id:
    CULTIVATION_CONFIG
      .ui
      .buttonEmojis
      .adventure,
};

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

function formatPercent(chance) {
  const percent = Math.max(0, Number(chance) || 0) * 100;

  if (percent >= 1) {
    return `${Number.isInteger(percent) ? percent : percent.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}%`;
  }

  if (percent >= 0.01) {
    return `${percent.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}%`;
  }

  if (percent <= 0) {
    return '0%';
  }

  return `${percent.toFixed(6).replace(/0+$/, '').replace(/\.$/, '')}%`;
}

/**
 * =========================================================
 * LINH THÚ DASHBOARD
 * =========================================================
 */

export function buildPetEmbed(
  user,
  profile,
) {
  const owned =
    getOwnedPets(
      profile,
    );

  const active =
    getActivePet(
      profile,
    );

  const ownedText =
    owned.length > 0
      ? owned
          .map(
            (
              pet,
            ) => {
              const mark =
                active?.id ===
                pet.id
                  ? ' · **Đồng Hành**'
                  : '';

              return [
                `${pet.emoji} **${pet.name}**${mark}`,
                `Phẩm Chất: **${pet.rarity}**`,
                `Hiệu Quả: **${pet.effect}**`,
              ].join(
                '\n',
              );
            },
          )
          .join(
            '\n\n',
          )
      : '*Chưa thu phục Linh Thú nào.*';

  return applyStyle(
    new EmbedBuilder()
      .setTitle(
        'LINH THÚ · 灵兽',
      )
      .setDescription(
        [
          `${USER_EMOJI} **Đạo Hữu**: <@${user.id}>`,
          '',
          SEPARATOR,
          '',
          active
            ? `${active.emoji} **Linh Thú Đồng Hành**`
            : '**Linh Thú Đồng Hành**',
          active
            ? `**${active.name}**`
            : '**Chưa Có**',
          '',
          `**Linh Thú Đã Thu Phục**: ${owned.length}`,
          '*Sắp xếp: Tiên Phẩm → Thần Thoại → Cực Hiếm → Hiếm → Lương Phẩm → Phàm*',
          '',
          SEPARATOR,
          '',
          ownedText,
          '',
          SEPARATOR,
          '',
          '*Vạn linh hữu tính, hữu duyên tự sẽ tương phùng.*',
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildPetRows(
  ownerId,
  profile,
) {
  const owned =
    getOwnedPets(
      profile,
    );

  const rows = [];

  if (
    owned.length > 0
  ) {
    const chunks = [];

    for (let index = 0; index < owned.length; index += 25) {
      chunks.push(owned.slice(index, index + 25));
    }

    for (let index = 0; index < chunks.length; index += 1) {
      const pets = chunks[index];

      rows.push(
        new ActionRowBuilder()
          .addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(
                `tutien_pet_select:${ownerId}:${index + 1}`,
              )
              .setPlaceholder(
                chunks.length > 1
                  ? `Chọn Linh Thú Đồng Hành · ${index + 1}/${chunks.length}`
                  : 'Chọn Linh Thú Đồng Hành',
              )
              .setMinValues(
                1,
              )
              .setMaxValues(
                1,
              )
              .addOptions(
                pets.map(
                  (
                    pet,
                  ) => ({
                    label:
                      pet.name,

                    value:
                      pet.id,

                    description:
                      `${pet.rarity} · ${pet.effect}`.slice(
                        0,
                        100,
                      ),
                  }),
                ),
              ),
          ),
      );
    }
  }

  rows.push(
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:dashboard`,
          )
          .setLabel(
            'Quay lại Tiên Lộ',
          )
          .setEmoji(
            PET_BUTTON_EMOJI,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),
  );

  return rows;
}

/**
 * =========================================================
 * LINH THÚ HIỆN THẾ
 * =========================================================
 */

export function buildPetEncounterEmbed(
  petId,
) {
  const pet =
    getCultivationPet(
      petId,
    );

  if (!pet) {
    return applyStyle(
      new EmbedBuilder()
        .setTitle(
          'LINH THÚ HIỆN THẾ',
        )
        .setDescription(
          'Một luồng linh khí kỳ lạ thoáng qua rồi biến mất.',
        ),
    );
  }

  return applyStyle(
    new EmbedBuilder()
      .setTitle(
        'LINH THÚ HIỆN THẾ',
      )
      .setDescription(
        [
          'Trong sương mù, một sinh linh mang theo linh khí tinh thuần đang âm thầm quan sát đạo hữu.',
          '',
          SEPARATOR,
          '',
          `${pet.emoji} Linh Thú: **${pet.name}**`,
          `Phẩm Chất: **${pet.rarity}**`,
          `Hiệu Quả: **${pet.effect}**`,
          '',
          `Tỷ Lệ Thu Phục: **${formatPercent(pet.captureChance)}**`,
        ].join(
          '\n',
        ),
      ),
  );
}

export function buildPetEncounterRows(
  ownerId,
  petId,
) {
  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:pet_capture:${petId}`,
          )
          .setLabel(
            'Thu Phục',
          )
          .setEmoji(
            PET_BUTTON_EMOJI,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),

        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:dashboard`,
          )
          .setLabel(
            'Bỏ Qua',
          )
          .setEmoji(
            ADVENTURE_BUTTON_EMOJI,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),
  ];
}

/**
 * =========================================================
 * THU PHỤC RESULT
 * =========================================================
 */

export function buildPetCaptureResultEmbed(
  result,
) {
  const pet =
    result.pet;

  if (
    !result.ok &&
    result.reason ===
      'already_owned'
  ) {
    return applyStyle(
      new EmbedBuilder()
        .setTitle(
          'LINH THÚ ĐÃ NHẬN CHỦ',
        )
        .setDescription(
          [
            `${pet.emoji} **${pet.name}** đã có duyên với đạo hữu từ trước.`,
            '',
            '*Linh thú khẽ cọ đầu vào tay đạo hữu, dường như vẫn còn nhớ khí tức quen thuộc.*',
          ].join(
            '\n',
          ),
        ),
    );
  }

  if (
    !result.ok &&
    result.reason ===
      'not_capturable'
  ) {
    return applyStyle(
      new EmbedBuilder()
        .setTitle(
          'TIÊN DUYÊN KHÔNG THỂ CƯỠNG CẦU',
        )
        .setDescription(
          [
            pet
              ? `${pet.emoji} **${pet.name}** không thể thu phục bằng phương thức này.`
              : '**Linh Thú này không thể thu phục bằng phương thức này.**',
            '',
            '*Có những linh thú chỉ giáng thế khi tiên duyên thật sự hội tụ.*',
          ].join('\n'),
        ),
    );
  }

  if (
    !result.ok
  ) {
    return applyStyle(
      new EmbedBuilder()
        .setTitle(
          'LINH THÚ RỜI ĐI',
        )
        .setDescription(
          [
            'Linh thú cảnh giác nhìn đạo hữu một lúc rồi hóa thành một đạo lưu quang biến mất giữa núi rừng.',
            '',
            SEPARATOR,
            '',
            pet
              ? `${pet.emoji} **${pet.name}**`
              : '**Linh Thú**',
            'Thu Phục: **Thất Bại**',
            '',
            '*Hữu duyên, ngày sau ắt sẽ gặp lại.*',
          ].join(
            '\n',
          ),
        ),
    );
  }

  return applyStyle(
    new EmbedBuilder()
      .setTitle(
        'LINH THÚ NHẬN CHỦ',
      )
      .setDescription(
        [
          'Linh thú chậm rãi tiến đến, khí tức dần hòa cùng thần thức của đạo hữu.',
          '',
          SEPARATOR,
          '',
          `${pet.emoji} Thu Phục: **${pet.name}**`,
          `Phẩm Chất: **${pet.rarity}**`,
          '',
          '**Hiệu Quả**',
          `**${pet.effect}**`,
          '',
          result.autoEquipped
            ? `${pet.emoji} **Linh Thú Đồng Hành**: ${pet.name}`
            : null,
          '',
          result.autoEquipped
            ? '*Linh thú đầu tiên sẽ tự động trở thành đồng hành.*'
            : null,
        ]
          .filter(
            Boolean,
          )
          .join(
            '\n',
          ),
      ),
  );
}

export function buildPetResultRows(
  ownerId,
) {
  return [
    new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:pet`,
          )
          .setLabel(
            'Linh Thú',
          )
          .setEmoji(
            PET_BUTTON_EMOJI,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),

        new ButtonBuilder()
          .setCustomId(
            `tutien_action:${ownerId}:dashboard`,
          )
          .setLabel(
            'Quay lại Tiên Lộ',
          )
          .setEmoji(
            PET_BUTTON_EMOJI,
          )
          .setStyle(
            ButtonStyle.Secondary,
          ),
      ),
  ];
}
