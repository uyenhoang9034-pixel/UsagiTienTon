import {
    AttachmentBuilder,
    ChannelType,
    EmbedBuilder,
    MessageFlags,
    PermissionFlagsBits,
    SlashCommandBuilder,
} from 'discord.js';

import fs from 'fs';
import path from 'path';

import {
    fileURLToPath,
} from 'url';

import {
    GAME_ROLES,
    GAME_ROLE_EMBED_COLOR,
    getEmojiDisplay,
} from '../../config/gameRoles.js';

import {
    addAllGameRoleReactions,
    getGameRolePanel,
    saveGameRolePanel,
} from '../../services/gameRoleService.js';

import {
    InteractionHelper,
} from '../../utils/interactionHelper.js';

import {
    logger,
} from '../../utils/logger.js';


const __filename =
    fileURLToPath(
        import.meta.url,
    );

const __dirname =
    path.dirname(
        __filename,
    );


/**
 * =========================================================
 * GET ROLE IMAGE
 * =========================================================
 *
 * assets/role/getrole.png
 */

const GET_ROLE_IMAGE_PATH =
    path.resolve(
        __dirname,
        '../../../assets/role/getrole.png',
    );


/**
 * =========================================================
 * PANEL TEXT
 * =========================================================
 */

const PANEL_TITLE =
    '<a:trangtrig2:1546040703375904801> 𝓖𝓸́𝓬 𝓵𝓪̂́𝔂 𝓻𝓸𝓵𝓮 ˋ°•*⁀➷ <a:trangtrig3:1546040818261954610>';


const DIVIDER =
    '‿̩͙⊱༒︎༻♱༺༒︎⊰‿̩͙';


/**
 * =========================================================
 * BUILD ROLE LIST
 * =========================================================
 *
 * Format:
 *
 * ⌞emoji⌝ │@Role
 */

function buildRoleList() {
    const gameNames = {
        tft: 'Teamfight Tactics',
        valorant: 'Valorant',
        goose_goose_duck: 'Goose Goose Duck',
        lien_quan_mobile: 'Liên Quân Mobile',
        wuthering_waves: 'Wuthering Waves',
        genshin_impact: 'Genshin Impact',
        pubg: 'PUBG',
        roblox: 'Roblox',
        minecraft: 'Minecraft',
        other_games: 'Các Game Khác',
        no_game: 'Không Thích Chơi Game',
    };

    return GAME_ROLES
        .map(
            (config) =>
                `⌞${getEmojiDisplay(config)}⌝ │${gameNames[config.key] ?? config.label}`,
        )
        .join('\n');
}


/**
 * =========================================================
 * BUILD PANEL DESCRIPTION
 * =========================================================
 */

function buildPanelDescription() {
    const roleList =
        buildRoleList();

    return [
        '<a:trangtrig30:1546905942476464178> Hãy chắc chắn bạn đã đọc kĩ rules trước khi lấy role.',

        '<a:trangtrig30:1546905942476464178> Ấn emoji để chọn game, chơi nhiều game chọn nhiều emoji, không chơi game nào thì chọn "không thích chơi game".',

        '<a:trangtrig30:1546905942476464178> Nếu không pick role sẽ không xem được kênh nào vì toàn bộ đều là kênh ẩn và cũng không chat được đâu ạ!',

        '',

        DIVIDER,

        '',

        roleList,

        '',

        DIVIDER,

        '',

        '<a:bang2:1546891483250954290> Đừng quên ghé <#1541364885789745213> để lại thông tin và nhận biệt danh siêu cấp vip pro nhé!',

        '<a:bang2:1546891483250954290> Enjoy! <a:heartg6:1546906117551030382>',
    ]
        .join('\n');
}


/**
 * =========================================================
 * BOT PERMISSION CHECK
 * =========================================================
 */

function getMissingChannelPermissions(
    channel,
    botMember,
) {
    const permissions =
        channel.permissionsFor(
            botMember,
        );

    if (!permissions) {
        return [
            'View Channel',
            'Send Messages',
            'Embed Links',
            'Add Reactions',
            'Read Message History',
        ];
    }

    const checks = [
        [
            PermissionFlagsBits.ViewChannel,
            'View Channel',
        ],

        [
            PermissionFlagsBits.SendMessages,
            'Send Messages',
        ],

        [
            PermissionFlagsBits.EmbedLinks,
            'Embed Links',
        ],

        [
            PermissionFlagsBits.AddReactions,
            'Add Reactions',
        ],

        [
            PermissionFlagsBits.ReadMessageHistory,
            'Read Message History',
        ],
    ];

    return checks
        .filter(
            ([permission]) =>
                !permissions.has(
                    permission,
                ),
        )
        .map(
            ([, label]) =>
                label,
        );
}


/**
 * =========================================================
 * VALIDATE GAME ROLES
 * =========================================================
 */

async function validateConfiguredRoles(
    guild,
) {
    const botMember =
        guild.members.me ??
        await guild.members
            .fetchMe()
            .catch(
                () =>
                    null,
            );

    if (!botMember) {
        throw new Error(
            'Không thể lấy thông tin bot member trong server.',
        );
    }

    if (
        !botMember.permissions.has(
            PermissionFlagsBits.ManageRoles,
        )
    ) {
        throw new Error(
            'Bot chưa có quyền Manage Roles.',
        );
    }

    const invalidRoles = [];

    for (
        const config
        of GAME_ROLES
    ) {
        const role =
            guild.roles.cache.get(
                config.roleId,
            ) ??
            await guild.roles
                .fetch(
                    config.roleId,
                )
                .catch(
                    () =>
                        null,
                );

        if (!role) {
            invalidRoles.push(
                `${config.label}: role không tồn tại (${config.roleId})`,
            );

            continue;
        }

        if (
            role.managed
        ) {
            invalidRoles.push(
                `${config.label}: đây là managed role`,
            );

            continue;
        }

        if (
            role.position >=
            botMember.roles.highest.position
        ) {
            invalidRoles.push(
                `${config.label}: role đang cao hơn hoặc bằng role cao nhất của bot`,
            );
        }
    }

    if (
        invalidRoles.length > 0
    ) {
        throw new Error(
            [
                'Một số game role chưa thể được bot quản lý:',
                '',
                ...invalidRoles,
            ].join('\n'),
        );
    }

    return botMember;
}


/**
 * =========================================================
 * VALIDATE CUSTOM EMOJIS
 * =========================================================
 */

async function validateCustomEmojis(
    client,
) {
    const missing = [];

    for (
        const config
        of GAME_ROLES
    ) {
        if (
            !config.emoji?.id
        ) {
            continue;
        }

        const emoji =
            client.emojis.cache.get(
                config.emoji.id,
            ) ??
            await client.emojis
                .fetch(
                    config.emoji.id,
                )
                .catch(
                    () =>
                        null,
                );

        if (!emoji) {
            missing.push(
                `${config.label}: ${config.emoji.id}`,
            );
        }
    }

    if (
        missing.length > 0
    ) {
        throw new Error(
            [
                'Bot không truy cập được một số custom emoji:',
                '',
                ...missing,
            ].join('\n'),
        );
    }
}


/**
 * =========================================================
 * DELETE OLD PANEL
 * =========================================================
 *
 * Khi chạy /reactroles setup lại:
 *
 * - panel mới được tạo
 * - lưu panel mới
 * - panel cũ được xóa
 *
 * Tránh tồn tại hai bài Get Role cùng hoạt động.
 */

async function deletePreviousPanel(
    interaction,
    previousPanel,
    newMessageId,
) {
    if (
        !previousPanel ||
        previousPanel.messageId ===
            newMessageId
    ) {
        return;
    }

    try {
        const oldChannel =
            interaction.guild.channels.cache.get(
                previousPanel.channelId,
            ) ??
            await interaction.guild.channels
                .fetch(
                    previousPanel.channelId,
                )
                .catch(
                    () =>
                        null,
                );

        if (
            !oldChannel ||
            !oldChannel.isTextBased?.()
        ) {
            return;
        }

        const oldMessage =
            await oldChannel.messages
                .fetch(
                    previousPanel.messageId,
                )
                .catch(
                    () =>
                        null,
                );

        if (
            oldMessage &&
            oldMessage.author?.id === interaction.client.user.id &&
            oldMessage.id !==
                newMessageId
        ) {
            await oldMessage
                .delete()
                .catch(
                    () =>
                        null,
                );
        }

    } catch (error) {
        logger.warn(
            'Could not delete previous Get Role panel:',
            error,
        );
    }
}


/**
 * =========================================================
 * COMMAND
 * =========================================================
 */

export default {

    data:
        new SlashCommandBuilder()
            .setName(
                'reactroles',
            )
            .setDescription(
                'Quản lý hệ thống Game Roles',
            )
            .setDefaultMemberPermissions(
                PermissionFlagsBits.Administrator,
            )
            .addSubcommand(
                (
                    subcommand,
                ) =>
                    subcommand
                        .setName(
                            'setup',
                        )
                        .setDescription(
                            'Đăng panel Get Roles',
                        )
                        .addChannelOption(
                            (
                                option,
                            ) =>
                                option
                                    .setName(
                                        'channel',
                                    )
                                    .setDescription(
                                        'Kênh đăng bảng Get Roles',
                                    )
                                    .addChannelTypes(
                                        ChannelType.GuildText,
                                        ChannelType.GuildAnnouncement,
                                    )
                                    .setRequired(
                                        true,
                                    ),
                        ),
            ),


    /**
     * =====================================================
     * EXECUTE
     * =====================================================
     */

    async execute(
        interaction,
    ) {
        const subcommand =
            interaction.options.getSubcommand();

        if (
            subcommand !==
            'setup'
        ) {
            return;
        }


        const deferred =
            await InteractionHelper.safeDefer(
                interaction,
                {
                    flags:
                        MessageFlags.Ephemeral,
                },
            );

        if (!deferred) {
            return;
        }


        try {
            if (
                !interaction.guild
            ) {
                throw new Error(
                    'Lệnh này chỉ dùng được trong server.',
                );
            }


            /**
             * =============================================
             * CHANNEL
             * =============================================
             */

            const channel =
                interaction.options.getChannel(
                    'channel',
                    true,
                );


            /**
             * =============================================
             * IMAGE
             * =============================================
             */

            if (
                !fs.existsSync(
                    GET_ROLE_IMAGE_PATH,
                )
            ) {
                throw new Error(
                    'Không tìm thấy file `assets/role/getrole.png`.',
                );
            }


            /**
             * =============================================
             * ROLE VALIDATION
             * =============================================
             */

            const botMember =
                await validateConfiguredRoles(
                    interaction.guild,
                );


            /**
             * =============================================
             * CHANNEL PERMISSIONS
             * =============================================
             */

            const missingPermissions =
                getMissingChannelPermissions(
                    channel,
                    botMember,
                );

            if (
                missingPermissions.length >
                0
            ) {
                throw new Error(
                    `Bot đang thiếu quyền trong ${channel}: ${missingPermissions.join(', ')}`,
                );
            }


            /**
             * =============================================
             * EMOJI VALIDATION
             * =============================================
             */

            await validateCustomEmojis(
                interaction.client,
            );


            /**
             * =============================================
             * OLD PANEL
             * =============================================
             */

            const previousPanel =
                await getGameRolePanel(
                    interaction.client,
                    interaction.guildId,
                );


            /**
             * =============================================
             * EMBED
             * =============================================
             */

            const embed =
                new EmbedBuilder()
                    .setTitle(
                        PANEL_TITLE,
                    )
                    .setDescription(
                        buildPanelDescription(),
                    )
                    .setColor(
                        GAME_ROLE_EMBED_COLOR,
                    )
                    .setImage(
                        'attachment://getrole.png',
                    );


            /**
             * =============================================
             * ATTACHMENT
             * =============================================
             */

            const attachment =
                new AttachmentBuilder(
                    GET_ROLE_IMAGE_PATH,
                    {
                        name:
                            'getrole.png',
                    },
                );


            /**
             * =============================================
             * SEND PANEL
             * =============================================
             */

            const message =
                await channel.send({
                    embeds: [
                        embed,
                    ],

                    files: [
                        attachment,
                    ],

                    allowedMentions: {
                        parse: [],
                    },
                });


            /**
             * =============================================
             * SAVE PANEL
             * =============================================
             */

            try {
                await saveGameRolePanel(
                    interaction.client,
                    interaction.guildId,
                    {
                        channelId:
                            channel.id,

                        messageId:
                            message.id,

                        createdAt:
                            new Date().toISOString(),
                    },
                );

            } catch (error) {
                await message
                    .delete()
                    .catch(
                        () =>
                            null,
                    );

                throw error;
            }


            /**
             * =============================================
             * ADD 11 REACTIONS
             * =============================================
             */

            await addAllGameRoleReactions(
                message,
            );


            /**
             * =============================================
             * REMOVE PREVIOUS PANEL
             * =============================================
             */

            await deletePreviousPanel(
                interaction,
                previousPanel,
                message.id,
            );


            /**
             * =============================================
             * LOG
             * =============================================
             */

            logger.info(
                `Game Role panel created by ${interaction.user.tag}: ${message.id} in ${channel.id}`,
            );


            /**
             * =============================================
             * SUCCESS
             * =============================================
             */

            await InteractionHelper.safeEditReply(
                interaction,
                {
                    embeds: [
                        new EmbedBuilder()
                            .setColor(
                                GAME_ROLE_EMBED_COLOR,
                            )
                            .setDescription(
                                `✅ Đã tạo **Get Roles** tại ${channel}.\n\n${message.url}`,
                            ),
                    ],
                },
            );

        } catch (error) {
            logger.error(
                'Failed to create Get Role panel:',
                error,
            );

            await InteractionHelper.safeEditReply(
                interaction,
                {
                    embeds: [
                        new EmbedBuilder()
                            .setColor(
                                0xed4245,
                            )
                            .setTitle(
                                '❌ Không thể tạo Get Roles',
                            )
                            .setDescription(
                                String(
                                    error?.message ??
                                    error,
                                ).slice(
                                    0,
                                    4000,
                                ),
                            ),
                    ],
                },
            );
        }
    },
};
