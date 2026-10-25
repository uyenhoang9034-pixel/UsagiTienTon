import fs from 'fs';
import path from 'path';
import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';

import {
  getUserMarriage,
  createMarriage,
  deleteMarriage,
  interactMarriage,
  dailyLoveCheckIn,
  sendLoveGift,
  updateMarriageBio,
  getTopMarriages,
  getLoveLevel,
  areMarried,
  getSpouseList,
  LOVE_GIFTS,
} from '../../services/marriageService.js';

import { logger } from '../../utils/logger.js';
import { MARRIAGE_CONFIG } from '../../config/marriageConfig.js';

const activeProposals = new Set();

function formatRemainingTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours} giờ ${minutes} phút`;
  }
  if (minutes > 0) {
    return `${minutes} phút ${seconds} giây`;
  }
  return `${seconds} giây`;
}

function getInteractionQuote(action, senderId, spouseId) {
  const quoteFns = MARRIAGE_CONFIG.interact.quotes[action] || MARRIAGE_CONFIG.interact.quotes.hon;
  const chosenFn = quoteFns[Math.floor(Math.random() * quoteFns.length)];
  return chosenFn(senderId, spouseId);
}

function isMarryAdmin(interaction) {
  const member = interaction?.member;
  if (!member) return false;

  const ownerId = interaction.guild?.ownerId;
  if (ownerId && (member.id === ownerId || interaction.user?.id === ownerId)) {
    return true;
  }

  const perms = interaction.memberPermissions || member.permissions;
  if (perms?.has?.(PermissionFlagsBits.Administrator)) return true;
  if (perms?.has?.(PermissionFlagsBits.ManageGuild)) return true;

  const configuredOwnerIds = (process.env.OWNER_IDS || '')
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);
  if (configuredOwnerIds.includes(interaction.user?.id) || configuredOwnerIds.includes(member.id)) {
    return true;
  }

  const adminRoleId = process.env.ADMIN_ROLE_ID || MARRIAGE_CONFIG.adminRoleId;
  const memberRoles = member.roles;
  if (Array.isArray(memberRoles) && memberRoles.includes(adminRoleId)) {
    return true;
  }
  if (Array.isArray(member._roles) && member._roles.includes(adminRoleId)) {
    return true;
  }
  if (memberRoles?.cache?.has?.(adminRoleId)) {
    return true;
  }
  if (memberRoles?.cache?.some?.((r) =>
    /^(admin|administrator|quản lý|quản trị viên|quan ly|quan tri vien|mod|moderator)$/i.test(r.name?.trim())
  )) {
    return true;
  }
  return false;
}

function resolveTargetSpouse(userData, specifiedUser, isAdmin = false) {
  if (specifiedUser?.bot && isAdmin) {
    return {
      spouseId: specifiedUser.id,
      spouse: {
        spouseId: specifiedUser.id,
        marriedAt: Date.now() - 30 * 86400000,
        lovePoints: 520,
        bio: 'Lời thề ước mẫu: Yêu em bot mãi mãi 💕 (Test Mode)',
        ring: '💍 Nhẫn Ước Hẹn Vĩnh Cửu',
        streak: 7,
        lastInteractedAt: null,
        lastDailyAt: null,
        lastGiftAt: null,
        isMock: true,
      },
    };
  }

  const spouseList = getSpouseList(userData);
  if (spouseList.length === 0) {
    return { error: 'NO_SPOUSE' };
  }

  if (specifiedUser) {
    const found = userData?.spouses?.[specifiedUser.id];
    if (!found) {
      return { error: 'NOT_MARRIED_TO_USER' };
    }
    return { spouse: found, spouseId: specifiedUser.id };
  }

  if (spouseList.length === 1) {
    return { spouse: spouseList[0], spouseId: spouseList[0].spouseId };
  }

  return { error: 'MULTIPLE_SPOUSES', list: spouseList };
}

export default {
  data: new SlashCommandBuilder()
    .setName('marry')
    .setDescription('Hệ thống kết hôn lãng mạn, đa phu thê (hậu cung) và chăm sóc tình yêu!')
    // 1. Cầu hôn
    .addSubcommand((sub) =>
      sub
        .setName('cauhon')
        .setDescription('Cầu hôn một người trong server (có thể cưới nhiều người, trừ bot) 💕')
        .addUserOption((opt) =>
          opt
            .setName('doiphuong')
            .setDescription('Thành viên bạn muốn ngỏ lời cầu hôn')
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName('loinhac')
            .setDescription('Lời ngỏ lời ngọt ngào muốn gửi gắm (tối đa 150 ký tự)')
            .setRequired(false)
            .setMaxLength(150),
        ),
    )
    // 2. Xem giấy kết hôn / Danh sách bạn đời
    .addSubcommand((sub) =>
      sub
        .setName('xem')
        .setDescription('Xem Giấy Chứng Nhận Kết Hôn hoặc danh sách bạn đời trong hậu cung')
        .addUserOption((opt) =>
          opt
            .setName('thanhvien')
            .setDescription('Thành viên muốn xem (để trống xem của bạn)')
            .setRequired(false),
        )
        .addUserOption((opt) =>
          opt
            .setName('bandoi')
            .setDescription('Bạn đời cụ thể muốn xem thiệp cưới đôi')
            .setRequired(false),
        ),
    )
    // 3. Tương tác tăng điểm
    .addSubcommand((sub) =>
      sub
        .setName('tuongtac')
        .setDescription('Tương tác hâm nóng tình cảm cùng bạn đời để tăng Điểm Thân Mật 💕')
        .addStringOption((opt) =>
          opt
            .setName('hanhdong')
            .setDescription('Chọn hành động ngọt ngào')
            .setRequired(true)
            .addChoices(
              { name: '💋 Hôn nồng cháy (+25 💕)', value: 'hon' },
              { name: '🤗 Ôm ấm áp (+20 💕)', value: 'om' },
              { name: '🌹 Đi hẹn hò lãng mạn (+30 💕)', value: 'date' },
              { name: '🎁 Tặng quà bất ngờ (+35 💕)', value: 'tangqua' },
              { name: '🐰 Xoa đầu cưng nựng (+20 💕)', value: 'xoadau' },
            ),
        )
        .addUserOption((opt) =>
          opt
            .setName('bandoi')
            .setDescription('Chọn bạn đời muốn tương tác (nếu cưới nhiều người)')
            .setRequired(false),
        ),
    )
    // 4. Điểm danh uyên ương hàng ngày
    .addSubcommand((sub) =>
      sub
        .setName('diemdanh')
        .setDescription('Điểm danh tình yêu hàng ngày nhận +50 đến +100 Điểm Thân Mật 💕')
        .addUserOption((opt) =>
          opt
            .setName('bandoi')
            .setDescription('Chọn bạn đời muốn điểm danh cùng (nếu cưới nhiều người)')
            .setRequired(false),
        ),
    )
    // 5. Tặng quà tình yêu
    .addSubcommand((sub) =>
      sub
        .setName('tangqua')
        .setDescription('Tặng vật phẩm tình yêu để tăng vọt Điểm Thân Mật 💕')
        .addStringOption((opt) =>
          opt
            .setName('vatpham')
            .setDescription('Chọn món quà tình yêu')
            .setRequired(true)
            .addChoices(
              { name: '🥤 Trà Sữa Trân Châu (+20 💕)', value: 'trasua' },
              { name: '💐 Bó Hoa Hồng Đỏ (+40 💕)', value: 'hoahong' },
              { name: '🍫 Hộp Socola Trái Tim (+65 💕)', value: 'socola' },
              { name: '💎 Nhẫn Kim Cương Lấp Lánh (+150 💕)', value: 'kimcuong' },
            ),
        )
        .addUserOption((opt) =>
          opt
            .setName('bandoi')
            .setDescription('Chọn bạn đời muốn tặng quà (nếu cưới nhiều người)')
            .setRequired(false),
        ),
    )
    // 6. Lời nhắc / Thề ước
    .addSubcommand((sub) =>
      sub
        .setName('loinhac')
        .setDescription('Cập nhật lời thề nguyện trên Giấy Kết Hôn')
        .addStringOption((opt) =>
          opt
            .setName('noidung')
            .setDescription('Nội dung lời thề nguyện mới (tối đa 120 ký tự)')
            .setRequired(true)
            .setMaxLength(120),
        )
        .addUserOption((opt) =>
          opt
            .setName('bandoi')
            .setDescription('Chọn bạn đời muốn cập nhật lời thề ước')
            .setRequired(false),
        ),
    )
    // 7. Ly hôn
    .addSubcommand((sub) =>
      sub
        .setName('lyhon')
        .setDescription('Thủ tục chia tay, giải trừ hôn nhân với một bạn đời 💔')
        .addUserOption((opt) =>
          opt
            .setName('bandoi')
            .setDescription('Chọn người bạn đời muốn ly hôn (nếu cưới nhiều người)')
            .setRequired(false),
        ),
    )
    // 8. Bảng xếp hạng
    .addSubcommand((sub) =>
      sub
        .setName('bxh')
        .setDescription('Bảng vàng vinh danh những cặp đôi hạnh phúc nhất server 🏆'),
    ),

  category: 'Games',

  async execute(interaction, client) {
    try {
      const botClient = client || interaction.client;
      const guildId = interaction.guildId;

      if (!guildId) {
        return interaction.reply({
          content: 'Lệnh này chỉ có thể sử dụng trong server thôi nha! 🐰',
          flags: MessageFlags.Ephemeral,
        });
      }

      const isAdmin = isMarryAdmin(interaction);

      // Kiểm tra kênh lệnh: Người bình thường chỉ dùng tại kênh MARRY_CONFIG.marryChannelId, admin dùng ở bất kì kênh nào
      // Nếu kênh không tồn tại trong server hoặc không cấu hình thì cho phép dùng tự do
      const targetChannelId = MARRIAGE_CONFIG.marryChannelId;
      if (targetChannelId && !isAdmin && interaction.channelId !== targetChannelId) {
        const channelExists = interaction.guild?.channels?.cache?.has?.(targetChannelId);
        if (channelExists) {
          return interaction.reply({
            content: MARRIAGE_CONFIG.channelErrorMessage(targetChannelId),
            flags: MessageFlags.Ephemeral,
          });
        }
      }

      const subcommand = interaction.options.getSubcommand();
      // 1. CẦU HÔN (HỖ TRỢ CƯỚI NHIỀU NGƯỜI, TRỪ BOT)
      if (subcommand === 'cauhon') {
        const targetUser = interaction.options.getUser('doiphuong');
        const proposalMessage = interaction.options.getString('loinhac') || '';

        if (targetUser.id === interaction.user.id) {
          return interaction.reply({
            content: MARRIAGE_CONFIG.proposal.errorSelf,
            flags: MessageFlags.Ephemeral,
          });
        }

        if (targetUser.bot && !isAdmin) {
          return interaction.reply({
            content: MARRIAGE_CONFIG.proposal.errorBot,
            flags: MessageFlags.Ephemeral,
          });
        }

        // Lấy thông tin hôn nhân của người gọi lệnh
        const authorMarriage = await getUserMarriage(botClient, guildId, interaction.user.id);
        if (!targetUser.bot && areMarried(authorMarriage, targetUser.id)) {
          return interaction.reply({
            content: MARRIAGE_CONFIG.proposal.errorAlreadyMarried(targetUser.id),
            flags: MessageFlags.Ephemeral,
          });
        }

        const proposalKey = `${guildId}:${interaction.user.id}:${targetUser.id}`;
        if (activeProposals.has(proposalKey) || activeProposals.has(`${guildId}:${targetUser.id}:${interaction.user.id}`)) {
          return interaction.reply({
            content: MARRIAGE_CONFIG.proposal.errorPending,
            flags: MessageFlags.Ephemeral,
          });
        }

        activeProposals.add(proposalKey);

        const acceptBtnId = `marry_accept_${interaction.id}`;
        const declineBtnId = `marry_decline_${interaction.id}`;

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(acceptBtnId)
            .setLabel(MARRIAGE_CONFIG.proposal.buttonAccept.label)
            .setEmoji(MARRIAGE_CONFIG.proposal.buttonAccept.emoji)
            .setStyle(ButtonStyle.Success),
          new ButtonBuilder()
            .setCustomId(declineBtnId)
            .setLabel(MARRIAGE_CONFIG.proposal.buttonDecline.label)
            .setEmoji(MARRIAGE_CONFIG.proposal.buttonDecline.emoji)
            .setStyle(ButtonStyle.Danger),
        );

        const proposalEmbed = new EmbedBuilder()
          .setColor(MARRIAGE_CONFIG.colors.proposal)
          .setTitle(MARRIAGE_CONFIG.proposal.embedTitle)
          .setDescription(
            MARRIAGE_CONFIG.proposal.embedDescription(
              interaction.user.id,
              targetUser.id,
              proposalMessage,
            ),
          )
          .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
          .setFooter({
            text: MARRIAGE_CONFIG.proposal.embedFooter,
          })
          .setTimestamp();

        const response = await interaction.reply({
          content: MARRIAGE_CONFIG.proposal.embedContent(targetUser.id, interaction.user.id),
          embeds: [proposalEmbed],
          components: [row],
        });

        // 20 phút thời gian thực (1,200,000 ms)
        const collector = response.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: MARRIAGE_CONFIG.proposal.timeoutMs,
        });

        collector.on('collect', async (btnInteraction) => {
          const isTarget = btnInteraction.user.id === targetUser.id;
          const isBotAdminTest = targetUser.bot && isAdmin && btnInteraction.user.id === interaction.user.id;

          if (!isTarget && !isBotAdminTest) {
            return btnInteraction.reply({
              content: MARRIAGE_CONFIG.proposal.errorNotTarget,
              flags: MessageFlags.Ephemeral,
            });
          }

          if (btnInteraction.customId === acceptBtnId) {
            if (!targetUser.bot) {
              // Kiểm tra lại tránh race condition
              const checkData = await getUserMarriage(botClient, guildId, interaction.user.id);
              if (areMarried(checkData, targetUser.id)) {
                activeProposals.delete(proposalKey);
                collector.stop('already_married');
                return btnInteraction.update({
                  content: MARRIAGE_CONFIG.proposal.errorRaceCondition,
                  embeds: [],
                  components: [],
                });
              }

              await createMarriage(botClient, guildId, interaction.user.id, targetUser.id, {
                proposalMessage,
              });
            }

            activeProposals.delete(proposalKey);
            collector.stop('accepted');

            const weddingEmbed = new EmbedBuilder()
              .setColor(MARRIAGE_CONFIG.colors.wedding)
              .setTitle(MARRIAGE_CONFIG.proposal.weddingSuccessTitle)
              .setDescription(
                MARRIAGE_CONFIG.proposal.weddingSuccessDescription(
                  interaction.user.id,
                  targetUser.id,
                ),
              )
              .setFooter({
                text: MARRIAGE_CONFIG.proposal.weddingSuccessFooter,
              })
              .setTimestamp();

            const weddingFiles = [];
            const gifPath = path.resolve(process.cwd(), 'assets/marry/marry.gif');
            if (fs.existsSync(gifPath)) {
              weddingEmbed.setImage('attachment://marry.gif');
              weddingFiles.push({ attachment: gifPath, name: 'marry.gif' });
            } else {
              weddingEmbed.setImage(MARRIAGE_CONFIG.images.weddingGif);
            }

            return btnInteraction.update({
              content: MARRIAGE_CONFIG.proposal.weddingSuccessContent,
              embeds: [weddingEmbed],
              components: [],
              files: weddingFiles,
            });
          }

          if (btnInteraction.customId === declineBtnId) {
            activeProposals.delete(proposalKey);
            collector.stop('declined');

            const declineEmbed = new EmbedBuilder()
              .setColor(MARRIAGE_CONFIG.colors.rejected)
              .setTitle(MARRIAGE_CONFIG.proposal.weddingDeclinedTitle)
              .setDescription(
                MARRIAGE_CONFIG.proposal.weddingDeclinedDescription(
                  interaction.user.id,
                  targetUser.id,
                ),
              )
              .setFooter({
                text: MARRIAGE_CONFIG.proposal.weddingDeclinedFooter,
              });

            return btnInteraction.update({
              content: null,
              embeds: [declineEmbed],
              components: [],
            });
          }
        });

        collector.on('end', async (_collected, reason) => {
          activeProposals.delete(proposalKey);

          if (reason === 'time') {
            const timeoutEmbed = new EmbedBuilder()
              .setColor(MARRIAGE_CONFIG.colors.timeout)
              .setTitle(MARRIAGE_CONFIG.proposal.weddingTimeoutTitle)
              .setDescription(
                MARRIAGE_CONFIG.proposal.weddingTimeoutDescription(
                  interaction.user.id,
                  targetUser.id,
                ),
              );

            try {
              await interaction.editReply({
                content: null,
                embeds: [timeoutEmbed],
                components: [],
              });
            } catch (err) {
              logger.debug('Could not edit expired proposal message:', err.message);
            }
          }
        });

        return;
      }

      // 2. XEM THÔNG TIN KẾT HÔN / DANH SÁCH HẬU CUNG
      if (subcommand === 'xem') {
        const targetUser = interaction.options.getUser('thanhvien') || interaction.user;
        const specifiedSpouse = interaction.options.getUser('bandoi');

        // Trường hợp admin muốn test xem giấy kết hôn với bot
        if (specifiedSpouse?.bot && isAdmin) {
          const spouseId = specifiedSpouse.id;
          const marriedTimestamp = Math.floor((Date.now() - 30 * 86400000) / 1000);
          const daysTogether = 30;
          const levelInfo = getLoveLevel(520);

          const profileEmbed = new EmbedBuilder()
            .setColor(MARRIAGE_CONFIG.colors.profile)
            .setTitle(MARRIAGE_CONFIG.profile.certTitle)
            .setDescription(
              MARRIAGE_CONFIG.profile.certDescription(
                targetUser.id,
                spouseId,
                'Lời thề ước mẫu: Yêu em bot mãi mãi 💕 (Test Mode)',
              ),
            )
            .addFields(
              MARRIAGE_CONFIG.profile.certFields(
                marriedTimestamp,
                daysTogether,
                520,
                `${levelInfo.icon} ${levelInfo.name} (${levelInfo.title})`,
                7,
              ),
            )
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setFooter({
              text: MARRIAGE_CONFIG.profile.certFooter,
            })
            .setTimestamp();

          return interaction.reply({ embeds: [profileEmbed] });
        }

        const userData = await getUserMarriage(botClient, guildId, targetUser.id);
        const spouseList = getSpouseList(userData);

        if (spouseList.length === 0) {
          const isSelf = targetUser.id === interaction.user.id;
          return interaction.reply({
            content: isSelf
              ? MARRIAGE_CONFIG.profile.singleSelf
              : MARRIAGE_CONFIG.profile.singleOther(targetUser.id),
          });
        }

        // Trường hợp muốn xem thiệp cưới đôi cụ thể
        let targetSpouseRel = null;
        if (specifiedSpouse) {
          targetSpouseRel = userData.spouses[specifiedSpouse.id];
          if (!targetSpouseRel) {
            return interaction.reply({
              content: MARRIAGE_CONFIG.profile.notMarriedToSpecified(targetUser.id, specifiedSpouse.id),
              flags: MessageFlags.Ephemeral,
            });
          }
        } else if (spouseList.length === 1) {
          targetSpouseRel = spouseList[0];
        }

        // Nếu có nhiều hơn 1 bạn đời và không chỉ định -> Hiện danh sách HẬU CUNG
        if (!targetSpouseRel) {
          const haremLines = spouseList.map((rel, index) => {
            const levelInfo = getLoveLevel(rel.lovePoints || 0);
            const daysTogether = Math.max(1, Math.floor((Date.now() - rel.marriedAt) / 86400000));
            return MARRIAGE_CONFIG.profile.formatHaremItem(index, rel, levelInfo, daysTogether);
          });

          const haremEmbed = new EmbedBuilder()
            .setColor(MARRIAGE_CONFIG.colors.harem)
            .setTitle(MARRIAGE_CONFIG.profile.haremTitle)
            .setDescription(
              haremLines.join('\n\n') +
                `\n\n💡 *Mẹo: Dùng \`/marry xem thanhvien:@${targetUser.username} bandoi:@tên_bạn_đời\` để xem Giấy Chứng Nhận Kết Hôn chi tiết nhé!*`,
            )
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .setFooter({
              text: MARRIAGE_CONFIG.profile.haremFooter,
            })
            .setTimestamp();

          return interaction.reply({ embeds: [haremEmbed] });
        }

        // Hiển thị Giấy Chứng Nhận Kết Hôn chi tiết
        const spouseId = targetSpouseRel.spouseId;
        const marriedTimestamp = Math.floor(targetSpouseRel.marriedAt / 1000);
        const daysTogether = Math.max(1, Math.floor((Date.now() - targetSpouseRel.marriedAt) / 86400000));
        const levelInfo = getLoveLevel(targetSpouseRel.lovePoints || 0);

        const profileEmbed = new EmbedBuilder()
          .setColor(MARRIAGE_CONFIG.colors.profile)
          .setTitle(MARRIAGE_CONFIG.profile.certTitle)
          .setDescription(
            MARRIAGE_CONFIG.profile.certDescription(
              targetUser.id,
              spouseId,
              targetSpouseRel.bio,
            ),
          )
          .addFields(
            {
              name: '<a:heartg1:1545307544808071258> Ngày Thành Hôn',
              value: `<t:${marriedTimestamp}:D> (<t:${marriedTimestamp}:R>)`,
              inline: true,
            },
            {
              name: '<a:heartg1:1545307544808071258> Thời Gian Bên Nhau',
              value: `${daysTogether} ngày hạnh phúc`,
              inline: true,
            },
            {
              name: '<a:trangtrig46:1547240249761996812> Điểm Thân Mật',
              value: `${(targetSpouseRel.lovePoints || 0).toLocaleString()} điểm`,
              inline: true,
            },
            {
              name: '<a:heartg1:1545307544808071258> Cấp Bậc Tình Yêu',
              value: `${levelInfo.icon} **${levelInfo.name}**\n*(Danh hiệu: ${levelInfo.title})*`,
              inline: true,
            },
            {
              name: '<a:trangtrig45:1547239010190237819> Chuỗi Điểm Danh',
              value: `${targetSpouseRel.streak || 0} ngày liên tục`,
              inline: true,
            },
          )
          .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
          .setFooter({
            text: MARRIAGE_CONFIG.profile.certFooter,
          })
          .setTimestamp();

        return interaction.reply({
          embeds: [profileEmbed],
        });
      }

      // 3. TƯƠNG TÁC CẶP ĐÔI
      if (subcommand === 'tuongtac') {
        const action = interaction.options.getString('hanhdong');
        const specifiedSpouse = interaction.options.getUser('bandoi');

        const userData = await getUserMarriage(botClient, guildId, interaction.user.id);
        const resolved = resolveTargetSpouse(userData, specifiedSpouse, isAdmin);

        if (resolved.error === 'NO_SPOUSE') {
          return interaction.reply({
            content: 'Bạn chưa kết hôn với ai cả! Hãy dùng `/marry cauhon` để tìm một nửa yêu thương nha! 🐰',
            flags: MessageFlags.Ephemeral,
          });
        }

        if (resolved.error === 'NOT_MARRIED_TO_USER') {
          return interaction.reply({
            content: `Bạn chưa kết hôn với <@${specifiedSpouse.id}> đâu nha! Hãy chọn đúng bạn đời nè! 🌸`,
            flags: MessageFlags.Ephemeral,
          });
        }

        if (resolved.error === 'MULTIPLE_SPOUSES') {
          const listNames = resolved.list.map((r) => `<@${r.spouseId}>`).join(', ');
          return interaction.reply({
            content:
              `Bạn đang có nhiều bạn đời (${listNames})! Hãy chọn bạn đời muốn tương tác ở ô **bandoi** trong lệnh nha! 🐰💕`,
            flags: MessageFlags.Ephemeral,
          });
        }

        const spouseId = resolved.spouseId;
        let result;

        if (resolved.spouse?.isMock) {
          result = {
            pointsGained: 25,
            totalPoints: 545,
            level: getLoveLevel(545),
          };
        } else {
          result = await interactMarriage(botClient, guildId, interaction.user.id, spouseId, action);

          if (result?.error === 'COOLDOWN') {
            return interaction.reply({
              content: MARRIAGE_CONFIG.interact.cooldownMessage(
                spouseId,
                formatRemainingTime(result.remainingMs),
              ),
              flags: MessageFlags.Ephemeral,
            });
          }
        }

        const quote = getInteractionQuote(action, interaction.user.id, spouseId);

        const interactEmbed = new EmbedBuilder()
          .setColor(MARRIAGE_CONFIG.colors.interact)
          .setTitle(MARRIAGE_CONFIG.interact.embedTitle)
          .setDescription(
            `${quote}\n\n` +
              `> <:jz1:1546149460751552572> Hai bạn được cộng **+${result.pointsGained} <a:trangtrig46:1547240249761996812> Điểm Thân Mật**!\n` +
              `> <:jz1:1546149460751552572> Tổng điểm hiện tại: **${result.totalPoints.toLocaleString()}** điểm (${result.level.icon} ${result.level.name})`,
          )
          .setFooter({
            text: MARRIAGE_CONFIG.interact.embedFooter,
          })
          .setTimestamp();

        return interaction.reply({
          embeds: [interactEmbed],
        });
      }

      // 4. ĐIỂM DANH TÌNH YÊU HÀNG NGÀY
      if (subcommand === 'diemdanh') {
        const specifiedSpouse = interaction.options.getUser('bandoi');
        const userData = await getUserMarriage(botClient, guildId, interaction.user.id);
        const resolved = resolveTargetSpouse(userData, specifiedSpouse, isAdmin);

        if (resolved.error === 'NO_SPOUSE') {
          return interaction.reply({
            content: 'Bạn chưa kết hôn với ai cả! Hãy dùng `/marry cauhon` để tìm một nửa yêu thương nha! 🐰',
            flags: MessageFlags.Ephemeral,
          });
        }

        if (resolved.error === 'NOT_MARRIED_TO_USER') {
          return interaction.reply({
            content: `Bạn chưa kết hôn với <@${specifiedSpouse.id}> đâu nha! 🌸`,
            flags: MessageFlags.Ephemeral,
          });
        }

        if (resolved.error === 'MULTIPLE_SPOUSES') {
          const listNames = resolved.list.map((r) => `<@${r.spouseId}>`).join(', ');
          return interaction.reply({
            content:
              `Bạn đang có nhiều bạn đời (${listNames})! Hãy chọn bạn đời muốn điểm danh cùng ở ô **bandoi** nha! 🐰💕`,
            flags: MessageFlags.Ephemeral,
          });
        }

        const spouseId = resolved.spouseId;
        let result;

        if (resolved.spouse?.isMock) {
          result = {
            pointsGained: 85,
            basePoints: 50,
            streakBonus: 35,
            streak: 8,
            totalPoints: 605,
            level: getLoveLevel(605),
          };
        } else {
          result = await dailyLoveCheckIn(botClient, guildId, interaction.user.id, spouseId);

          if (result?.error === 'COOLDOWN') {
            return interaction.reply({
              content: MARRIAGE_CONFIG.checkIn.cooldownMessage(
                spouseId,
                formatRemainingTime(result.remainingMs),
              ),
              flags: MessageFlags.Ephemeral,
            });
          }
        }

        const checkInEmbed = new EmbedBuilder()
          .setColor(MARRIAGE_CONFIG.colors.checkIn)
          .setTitle(MARRIAGE_CONFIG.checkIn.embedTitle)
          .setDescription(
            MARRIAGE_CONFIG.checkIn.description(
              interaction.user.id,
              spouseId,
              result.pointsGained,
              result.basePoints,
              result.streakBonus,
              result.streak,
              result.totalPoints,
              `${result.level.icon} ${result.level.name}`,
            ),
          )
          .setFooter({
            text: MARRIAGE_CONFIG.checkIn.embedFooter,
          })
          .setTimestamp();

        return interaction.reply({ embeds: [checkInEmbed] });
      }

      // 5. TẶNG QUÀ TÌNH YÊU
      if (subcommand === 'tangqua') {
        const giftKey = interaction.options.getString('vatpham');
        const specifiedSpouse = interaction.options.getUser('bandoi');
        const userData = await getUserMarriage(botClient, guildId, interaction.user.id);
        const resolved = resolveTargetSpouse(userData, specifiedSpouse, isAdmin);

        if (resolved.error === 'NO_SPOUSE') {
          return interaction.reply({
            content: 'Bạn chưa kết hôn với ai cả! Hãy dùng `/marry cauhon` để tìm một nửa yêu thương nha! 🐰',
            flags: MessageFlags.Ephemeral,
          });
        }

        if (resolved.error === 'NOT_MARRIED_TO_USER') {
          return interaction.reply({
            content: `Bạn chưa kết hôn với <@${specifiedSpouse.id}> đâu nha! 🌸`,
            flags: MessageFlags.Ephemeral,
          });
        }

        if (resolved.error === 'MULTIPLE_SPOUSES') {
          const listNames = resolved.list.map((r) => `<@${r.spouseId}>`).join(', ');
          return interaction.reply({
            content:
              `Bạn đang có nhiều bạn đời (${listNames})! Hãy chọn bạn đời muốn tặng quà ở ô **bandoi** nha! 🐰💕`,
            flags: MessageFlags.Ephemeral,
          });
        }

        const spouseId = resolved.spouseId;
        let result;

        if (resolved.spouse?.isMock) {
          const gift = LOVE_GIFTS[giftKey];
          result = {
            gift,
            pointsGained: gift.points,
            totalPoints: 520 + gift.points,
            level: getLoveLevel(520 + gift.points),
          };
        } else {
          result = await sendLoveGift(botClient, guildId, interaction.user.id, spouseId, giftKey);

          if (result?.error === 'COOLDOWN') {
            const remainingMinutes = Math.max(1, Math.ceil(result.remainingMs / (60 * 1000)));
            return interaction.reply({
              content: MARRIAGE_CONFIG.gifts.cooldownMessage(
                spouseId,
                `${remainingMinutes} phút`,
              ),
              flags: MessageFlags.Ephemeral,
            });
          }
        }

        const giftEmbed = new EmbedBuilder()
          .setColor(MARRIAGE_CONFIG.colors.gift || '#FFB6C1')
          .setTitle(MARRIAGE_CONFIG.gifts.embedTitle)
          .setDescription(
            `<@${interaction.user.id}> đã gửi tặng đến <@${spouseId}> một món quà ngọt ngào!\n\n` +
              `${result.gift.icon} **${result.gift.name}** (+${result.pointsGained} <a:trangtrig46:1547240249761996812>): *${result.gift.desc}*\n\n` +
              `> <:jz1:1546149460751552572> Nhận ngay: **+${result.pointsGained} <a:trangtrig46:1547240249761996812> Điểm Thân Mật**\n` +
              `> <:jz1:1546149460751552572> Tổng Điểm Thân Mật: **${result.totalPoints.toLocaleString()}** điểm (${result.level.icon} ${result.level.name})`,
          )
          .setFooter({
            text: MARRIAGE_CONFIG.gifts.embedFooter,
          })
          .setTimestamp();

        return interaction.reply({ embeds: [giftEmbed] });
      }

      // 6. LỜI NHẮC / LỜI THỀ ƯỚC
      if (subcommand === 'loinhac') {
        const newBio = interaction.options.getString('noidung');
        const specifiedSpouse = interaction.options.getUser('bandoi');
        const userData = await getUserMarriage(botClient, guildId, interaction.user.id);
        const resolved = resolveTargetSpouse(userData, specifiedSpouse, isAdmin);

        if (resolved.error === 'NO_SPOUSE') {
          return interaction.reply({
            content: 'Bạn chưa kết hôn với ai cả nên chưa thể đặt lời thề ước được nha! 🐰',
            flags: MessageFlags.Ephemeral,
          });
        }

        if (resolved.error === 'NOT_MARRIED_TO_USER') {
          return interaction.reply({
            content: `Bạn chưa kết hôn với <@${specifiedSpouse.id}> đâu nha! 🌸`,
            flags: MessageFlags.Ephemeral,
          });
        }

        if (resolved.error === 'MULTIPLE_SPOUSES') {
          const listNames = resolved.list.map((r) => `<@${r.spouseId}>`).join(', ');
          return interaction.reply({
            content:
              `Bạn đang có nhiều bạn đời (${listNames})! Hãy chọn bạn đời muốn đổi lời thề ước ở ô **bandoi** nha! 🐰💕`,
            flags: MessageFlags.Ephemeral,
          });
        }

        const spouseId = resolved.spouseId;
        if (!resolved.spouse?.isMock) {
          await updateMarriageBio(botClient, guildId, interaction.user.id, spouseId, newBio);
        }

        return interaction.reply({
          content: MARRIAGE_CONFIG.vows.success(spouseId, newBio),
        });
      }

      // 7. LY HÔN (CÓ CHỌN BẠN ĐỜI NẾU CÓ NHIỀU HƠN 1)
      if (subcommand === 'lyhon') {
        const specifiedSpouse = interaction.options.getUser('bandoi');
        const userData = await getUserMarriage(botClient, guildId, interaction.user.id);
        const resolved = resolveTargetSpouse(userData, specifiedSpouse, isAdmin);

        if (resolved.error === 'NO_SPOUSE') {
          return interaction.reply({
            content: 'Bạn đang độc thân thì làm sao mà ly hôn được nè! 🐰',
            flags: MessageFlags.Ephemeral,
          });
        }

        if (resolved.error === 'NOT_MARRIED_TO_USER') {
          return interaction.reply({
            content: `Bạn chưa kết hôn với <@${specifiedSpouse.id}> nên không thể ly hôn người này nha! 🌸`,
            flags: MessageFlags.Ephemeral,
          });
        }

        if (resolved.error === 'MULTIPLE_SPOUSES') {
          const listNames = resolved.list.map((r) => `<@${r.spouseId}>`).join(', ');
          return interaction.reply({
            content:
              `Bạn đang có nhiều bạn đời (${listNames})! Hãy chọn người muốn ly hôn ở ô **bandoi** để tránh ly hôn nhầm người nha! 💔`,
            flags: MessageFlags.Ephemeral,
          });
        }

        const spouseId = resolved.spouseId;
        const isMock = Boolean(resolved.spouse?.isMock);
        const confirmBtnId = `marry_divorce_confirm_${interaction.id}`;
        const cancelBtnId = `marry_divorce_cancel_${interaction.id}`;

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(confirmBtnId)
            .setLabel(MARRIAGE_CONFIG.divorce.buttonConfirm.label)
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId(cancelBtnId)
            .setLabel(MARRIAGE_CONFIG.divorce.buttonCancel.label)
            .setEmoji(MARRIAGE_CONFIG.divorce.buttonCancel.emoji)
            .setStyle(ButtonStyle.Secondary),
        );

        const confirmEmbed = new EmbedBuilder()
          .setColor(MARRIAGE_CONFIG.colors.divorceConfirm)
          .setTitle(MARRIAGE_CONFIG.divorce.confirmTitle)
          .setDescription(MARRIAGE_CONFIG.divorce.confirmDescription(spouseId))
          .setFooter({ text: MARRIAGE_CONFIG.divorce.confirmFooter });

        const response = await interaction.reply({
          embeds: [confirmEmbed],
          components: [row],
          flags: MessageFlags.Ephemeral,
        });

        const collector = response.createMessageComponentCollector({
          componentType: ComponentType.Button,
          time: 60_000,
        });

        collector.on('collect', async (btnInteraction) => {
          if (btnInteraction.user.id !== interaction.user.id) {
            return;
          }

          if (btnInteraction.customId === confirmBtnId) {
            collector.stop('divorced');
            if (!isMock) {
              await deleteMarriage(botClient, guildId, interaction.user.id, spouseId);
            }

            const announcementEmbed = new EmbedBuilder()
              .setColor(MARRIAGE_CONFIG.colors.divorced)
              .setTitle(MARRIAGE_CONFIG.divorce.announcementTitle)
              .setDescription(
                MARRIAGE_CONFIG.divorce.announcementDescription(
                  interaction.user.id,
                  spouseId,
                ),
              )
              .setFooter({ text: MARRIAGE_CONFIG.divorce.announcementFooter })
              .setTimestamp();

            await btnInteraction.update({
              content: 'Đã hoàn tất thủ tục ly hôn.',
              embeds: [],
              components: [],
            });

            return interaction.channel?.send({
              embeds: [announcementEmbed],
            }).catch(() => {});
          }

          if (btnInteraction.customId === cancelBtnId) {
            collector.stop('cancelled');
            return btnInteraction.update({
              content: MARRIAGE_CONFIG.divorce.cancelledMessage,
              embeds: [],
              components: [],
            });
          }
        });

        return;
      }

      // 8. BẢNG XẾP HẠNG
      if (subcommand === 'bxh') {
        const topList = await getTopMarriages(botClient, guildId, 10);

        if (!topList || topList.length === 0) {
          return interaction.reply({
            content: MARRIAGE_CONFIG.leaderboard.emptyMessage,
          });
        }

        const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];

        const lines = topList.map((item, index) => {
          const medal = medals[index] || `#${index + 1}`;
          const daysTogether = Math.max(1, Math.floor((Date.now() - item.marriedAt) / 86400000));
          return (
            `${medal} **<@${item.user1Id}>** ❤️ **<@${item.user2Id}>**\n` +
            `> <a:trangtrig46:1547240249761996812> **${item.lovePoints.toLocaleString()}** điểm · ${item.level.icon} *${item.level.name}* (${item.level.title}) · **${daysTogether}** ngày bên nhau (<a:trangtrig45:1547239010190237819> Chuỗi: **${item.streak || 0}** ngày)`
          );
        });

        const bxhEmbed = new EmbedBuilder()
          .setColor(MARRIAGE_CONFIG.colors.leaderboard)
          .setTitle(MARRIAGE_CONFIG.leaderboard.embedTitle)
          .setDescription(lines.join('\n\n'))
          .setFooter({
            text: MARRIAGE_CONFIG.leaderboard.embedFooter,
          })
          .setTimestamp();

        return interaction.reply({
          embeds: [bxhEmbed],
        });
      }
    } catch (error) {
      logger.error('Lỗi khi thực thi lệnh marry:', error);
      const errorPayload = {
        content: 'Đã có lỗi xảy ra trong quá trình xử lý lệnh kết hôn. Hãy thử lại sau nhé! 🐰💦',
        flags: MessageFlags.Ephemeral,
      };

      if (interaction.replied || interaction.deferred) {
        return interaction.followUp(errorPayload);
      }
      return interaction.reply(errorPayload);
    }
  },
};
