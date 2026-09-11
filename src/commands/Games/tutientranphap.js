import {
  MessageFlags,
  SlashCommandBuilder,
} from 'discord.js';

import {
  CULTIVATION_CONFIG,
} from '../../config/cultivationGame.js';

import {
  FORMATION_DEFINITIONS,
  FORMATION_ELEMENTS,
  getFormationState,
  saveFormationState,
} from '../../services/cultivationFormation.js';

const HEADER =
  '<a:trangtrig2:1546040703375904801> **TRẬN PHÁP · GM** <a:trangtrig3:1546040818261954610>';

const ERROR_EMOJI =
  '<a:angryg1:1541441195144773652>';

const FORMATION_CHOICES = [
  {
    name: 'Tiểu Ngũ Hành Trận',
    value: 'five_elements',
  },
  {
    name: 'Phong Lôi Dẫn Thiên Trận',
    value: 'wind_lightning',
  },
  {
    name: 'Huyền Băng Tỏa Linh Trận',
    value: 'frozen_spirit',
  },
  {
    name: 'Âm Dương Lưỡng Nghi Trận',
    value: 'yin_yang',
  },
  {
    name: 'Hỗn Độn Quy Nhất Trận',
    value: 'chaos_unity',
  },
];

function hasAdminRole(member) {
  const adminRoleId =
    CULTIVATION_CONFIG.adminRoleId;

  return Boolean(
    adminRoleId &&
    member?.roles?.cache?.has?.(
      adminRoleId,
    ),
  );
}

function formatError(message) {
  return `${ERROR_EMOJI} ${message}`;
}

function formatNumber(value) {
  return new Intl.NumberFormat(
    'vi-VN',
  ).format(
    Math.max(
      0,
      Math.floor(
        Number(value) || 0,
      ),
    ),
  );
}

function ensureFormationUnlocked(
  state,
  formationId,
) {
  const formation =
    FORMATION_DEFINITIONS[formationId];

  if (!formation) {
    return false;
  }

  if (
    !state.unlockedFormationIds.includes(
      formationId,
    )
  ) {
    state.unlockedFormationIds.push(
      formationId,
    );
  }

  state.formationLevels[formationId] =
    Math.max(
      1,
      Number(
        state.formationLevels?.[formationId],
      ) || 1,
    );

  state.layouts[formationId] ||= [
    ...formation.pattern,
  ];

  return true;
}

function buildStatusText(
  targetUser,
  state,
) {
  const formations =
    Object.values(
      FORMATION_DEFINITIONS,
    )
      .map(
        (formation) => {
          const unlocked =
            state.unlockedFormationIds.includes(
              formation.id,
            );

          const level =
            Math.max(
              1,
              Number(
                state.formationLevels?.[
                  formation.id
                ],
              ) || 1,
            );

          const active =
            state.activeFormationId ===
            formation.id
              ? ' · **Đang dùng**'
              : '';

          return `${unlocked ? '✅' : '➖'} **${formation.name}** · Lv.${level}${active}`;
        },
      )
      .join('\n');

  return [
    HEADER,
    '',
    `Đạo Hữu: <@${targetUser.id}>`,
    `Lĩnh Ngộ: **${formatNumber(state.insight)}**`,
    `Trận Văn: **${formatNumber(state.formationEssence)}**`,
    `Cooldown Lĩnh Ngộ: **${state.lastComprehendAt ? 'Đang ghi nhận' : 'Sẵn sàng'}**`,
    '',
    formations,
  ].join('\n');
}

export default {
  data:
    new SlashCommandBuilder()
      .setName(
        'tutientranphap',
      )
      .setDescription(
        'GM: Chỉnh dữ liệu Trận Pháp để test toàn bộ hệ thống.',
      )
      .addStringOption(
        (option) =>
          option
            .setName('action')
            .setDescription(
              'Thao tác GM Trận Pháp.',
            )
            .setRequired(true)
            .addChoices(
              {
                name: 'Xem trạng thái',
                value: 'status',
              },
              {
                name: 'Full Test · mở hết + max tài nguyên',
                value: 'full_test',
              },
              {
                name: 'Mở toàn bộ Trận Đồ',
                value: 'unlock_all',
              },
              {
                name: 'Mở một Trận Đồ',
                value: 'unlock_one',
              },
              {
                name: 'Cộng Lĩnh Ngộ',
                value: 'add_insight',
              },
              {
                name: 'Cộng Trận Văn',
                value: 'add_essence',
              },
              {
                name: 'Đặt cấp Trận Đồ',
                value: 'set_level',
              },
              {
                name: 'Chọn Trận Đồ đang dùng',
                value: 'set_active',
              },
              {
                name: 'Reset cooldown Lĩnh Ngộ',
                value: 'reset_cooldown',
              },
              {
                name: 'Reset toàn bộ Trận Pháp',
                value: 'reset_all',
              },
            ),
      )
      .addStringOption(
        (option) =>
          option
            .setName('tran')
            .setDescription(
              'Trận Đồ áp dụng cho thao tác.',
            )
            .addChoices(
              ...FORMATION_CHOICES,
            ),
      )
      .addIntegerOption(
        (option) =>
          option
            .setName('amount')
            .setDescription(
              'Số lượng/cấp muốn đặt hoặc cộng.',
            )
            .setMinValue(1)
            .setMaxValue(1000000000),
      )
      .addUserOption(
        (option) =>
          option
            .setName('member')
            .setDescription(
              'Đạo hữu muốn chỉnh. Để trống = chính bạn.',
            ),
      ),

  category: 'Games',

  async execute(interaction) {
    try {
      if (
        !interaction.guildId ||
        !interaction.guild
      ) {
        return interaction.reply({
          content:
            'Lệnh này chỉ có thể sử dụng trong server.',
          flags:
            MessageFlags.Ephemeral,
        });
      }

      if (
        !hasAdminRole(
          interaction.member,
        )
      ) {
        return interaction.reply({
          content:
            formatError(
              'Bạn không có quyền sử dụng lệnh GM Trận Pháp.',
            ),
          flags:
            MessageFlags.Ephemeral,
        });
      }

      if (!interaction.client?.db) {
        return interaction.reply({
          content:
            formatError(
              'Database chưa sẵn sàng.',
            ),
          flags:
            MessageFlags.Ephemeral,
        });
      }

      const action =
        interaction.options.getString(
          'action',
          true,
        );

      const formationId =
        interaction.options.getString(
          'tran',
        );

      const amount =
        interaction.options.getInteger(
          'amount',
        );

      const targetUser =
        interaction.options.getUser(
          'member',
        ) || interaction.user;

      if (targetUser.bot) {
        return interaction.reply({
          content:
            formatError(
              'Không thể chỉnh Trận Pháp cho bot.',
            ),
          flags:
            MessageFlags.Ephemeral,
        });
      }

      await interaction.deferReply();

      const guildId =
        interaction.guildId;

      const userId =
        targetUser.id;

      let state =
        await getFormationState(
          interaction.client,
          guildId,
          userId,
        );

      if (action === 'status') {
        return interaction.editReply({
          content:
            buildStatusText(
              targetUser,
              state,
            ),
        });
      }

      if (action === 'full_test') {
        state.insight = 1000000;
        state.formationEssence = 1000000;
        state.lastComprehendAt = null;

        state.slotLevels ||= {};
        state.formationFragments ||= {};
        state.elementCrystals ||= {};
        state.formationEyes ||= {};

        for (
          const elementId of
          Object.keys(
            FORMATION_ELEMENTS,
          )
        ) {
          state.elementCrystals[
            elementId
          ] = 1000000;
        }

        for (
          const formation of
          Object.values(
            FORMATION_DEFINITIONS,
          )
        ) {
          ensureFormationUnlocked(
            state,
            formation.id,
          );

          state.formationLevels[
            formation.id
          ] = 10;

          state.layouts[
            formation.id
          ] = [
            ...formation.pattern,
          ];

          state.slotLevels[
            formation.id
          ] = Array.from(
            {
              length:
                formation.slots,
            },
            () => 10,
          );

          state.formationFragments[
            formation.id
          ] = 1000000;

          state.formationEyes[
            formation.id
          ] = {
            elementId: 'spirit',
            level: 10,
          };
        }

        state =
          await saveFormationState(
            interaction.client,
            guildId,
            userId,
            state,
          );

        return interaction.editReply({
          content: [
            HEADER,
            '',
            `Đã bật **FULL TEST V2** cho <@${userId}>.`,
            '• Mở toàn bộ Trận Đồ',
            '• Tất cả Trận Đồ Lv.10',
            '• Tất cả Trận Vị Lv.10',
            '• Tất cả Mắt Trận Lv.10',
            '• 1.000.000 Lĩnh Ngộ',
            '• 1.000.000 Trận Văn',
            '• 1.000.000 Mảnh Trận Đồ mỗi loại',
            '• 1.000.000 Tinh Thạch mỗi hệ',
            '• Reset cooldown Lĩnh Ngộ',
            '• Bố cục chuẩn cho toàn bộ Trận Đồ',
          ].join('\n'),
        });
      }

      if (action === 'unlock_all') {
        for (
          const formation of
          Object.values(
            FORMATION_DEFINITIONS,
          )
        ) {
          ensureFormationUnlocked(
            state,
            formation.id,
          );
        }

        state =
          await saveFormationState(
            interaction.client,
            guildId,
            userId,
            state,
          );

        return interaction.editReply({
          content:
            `${HEADER}\n\nĐã mở khóa **toàn bộ Trận Đồ** cho <@${userId}>.`,
        });
      }

      if (action === 'unlock_one') {
        if (
          !formationId ||
          !FORMATION_DEFINITIONS[
            formationId
          ]
        ) {
          return interaction.editReply({
            content:
              formatError(
                'Hãy chọn Trận Đồ ở mục `tran`.',
              ),
          });
        }

        ensureFormationUnlocked(
          state,
          formationId,
        );

        state =
          await saveFormationState(
            interaction.client,
            guildId,
            userId,
            state,
          );

        return interaction.editReply({
          content:
            `${HEADER}\n\nĐã mở khóa **${FORMATION_DEFINITIONS[formationId].name}** cho <@${userId}>.`,
        });
      }

      if (action === 'add_insight') {
        if (!amount) {
          return interaction.editReply({
            content:
              formatError(
                'Hãy nhập số điểm ở `amount`.',
              ),
          });
        }

        state.insight =
          Math.max(
            0,
            Number(state.insight) || 0,
          ) + amount;

        for (
          const formation of
          Object.values(
            FORMATION_DEFINITIONS,
          )
        ) {
          if (
            state.insight >=
            formation.unlockInsight
          ) {
            ensureFormationUnlocked(
              state,
              formation.id,
            );
          }
        }

        state =
          await saveFormationState(
            interaction.client,
            guildId,
            userId,
            state,
          );

        return interaction.editReply({
          content:
            `${HEADER}\n\nĐã cộng **+${formatNumber(amount)} Lĩnh Ngộ** cho <@${userId}>.\nHiện có: **${formatNumber(state.insight)}**.`,
        });
      }

      if (action === 'add_essence') {
        if (!amount) {
          return interaction.editReply({
            content:
              formatError(
                'Hãy nhập số Trận Văn ở `amount`.',
              ),
          });
        }

        state.formationEssence =
          Math.max(
            0,
            Number(
              state.formationEssence,
            ) || 0,
          ) + amount;

        state =
          await saveFormationState(
            interaction.client,
            guildId,
            userId,
            state,
          );

        return interaction.editReply({
          content:
            `${HEADER}\n\nĐã cộng **+${formatNumber(amount)} Trận Văn** cho <@${userId}>.\nHiện có: **${formatNumber(state.formationEssence)}**.`,
        });
      }

      if (action === 'set_level') {
        if (
          !formationId ||
          !FORMATION_DEFINITIONS[
            formationId
          ]
        ) {
          return interaction.editReply({
            content:
              formatError(
                'Hãy chọn Trận Đồ ở mục `tran`.',
              ),
          });
        }

        if (
          !amount ||
          amount < 1 ||
          amount > 10
        ) {
          return interaction.editReply({
            content:
              formatError(
                'Cấp Trận Đồ chỉ từ 1 đến 10.',
              ),
          });
        }

        ensureFormationUnlocked(
          state,
          formationId,
        );

        state.formationLevels[
          formationId
        ] = amount;

        state =
          await saveFormationState(
            interaction.client,
            guildId,
            userId,
            state,
          );

        return interaction.editReply({
          content:
            `${HEADER}\n\nĐã đặt **${FORMATION_DEFINITIONS[formationId].name}** thành **Lv.${amount}** cho <@${userId}>.`,
        });
      }

      if (action === 'set_active') {
        if (
          !formationId ||
          !FORMATION_DEFINITIONS[
            formationId
          ]
        ) {
          return interaction.editReply({
            content:
              formatError(
                'Hãy chọn Trận Đồ ở mục `tran`.',
              ),
          });
        }

        ensureFormationUnlocked(
          state,
          formationId,
        );

        state.activeFormationId =
          formationId;

        state =
          await saveFormationState(
            interaction.client,
            guildId,
            userId,
            state,
          );

        return interaction.editReply({
          content:
            `${HEADER}\n\nĐã chọn **${FORMATION_DEFINITIONS[formationId].name}** làm Trận Đồ đang dùng của <@${userId}>.`,
        });
      }

      if (
        action ===
        'reset_cooldown'
      ) {
        state.lastComprehendAt = null;

        state =
          await saveFormationState(
            interaction.client,
            guildId,
            userId,
            state,
          );

        return interaction.editReply({
          content:
            `${HEADER}\n\nĐã reset cooldown **Lĩnh Ngộ** cho <@${userId}>. Có thể test lại ngay.`,
        });
      }

      if (action === 'reset_all') {
        state =
          await saveFormationState(
            interaction.client,
            guildId,
            userId,
            {
              insight: 0,
              formationEssence: 30,
              lastComprehendAt: null,
              activeFormationId:
                'five_elements',
              unlockedFormationIds: [
                'five_elements',
              ],
              formationLevels: {
                five_elements: 1,
              },
              layouts: {
                five_elements: [
                  'metal',
                  'water',
                  'wood',
                  'fire',
                  'earth',
                ],
              },
            },
          );

        return interaction.editReply({
          content:
            `${HEADER}\n\nĐã reset toàn bộ dữ liệu Trận Pháp của <@${userId}> về trạng thái ban đầu.`,
        });
      }

      return interaction.editReply({
        content:
          formatError(
            'Không tìm thấy thao tác GM tương ứng.',
          ),
      });
    } catch (error) {
      console.error(
        '[TU TIEN TRAN PHAP GM ERROR]',
        error,
      );

      const message =
        formatError(
          `Lệnh GM Trận Pháp bị lỗi: \`${error?.message || 'Unknown error'}\``,
        );

      if (
        interaction.deferred ||
        interaction.replied
      ) {
        return interaction
          .editReply({
            content: message,
          })
          .catch(
            () => {},
          );
      }

      return interaction
        .reply({
          content: message,
          flags:
            MessageFlags.Ephemeral,
        })
        .catch(
          () => {},
        );
    }
  },
};
