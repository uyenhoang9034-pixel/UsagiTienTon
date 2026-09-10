import {
    AttachmentBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
} from 'discord.js';

import fs from 'fs';
import path from 'path';

import {
    fileURLToPath,
} from 'url';

import {
    GAME_ROLES,
    GAME_ROLE_NOTIFICATION_CHANNEL_ID,
    GAME_ROLE_EMBED_COLOR,
    getGameRoleByEmoji,
    getGameRoleByRoleId,
    getReactionToken,
} from '../config/gameRoles.js';

import {
    logger,
} from '../utils/logger.js';


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
 * PATHS
 * =========================================================
 */

const PROJECT_ROOT =
    path.resolve(
        __dirname,
        '../..',
    );

const ROLE_ASSET_DIRECTORY =
    path.join(
        PROJECT_ROOT,
        'assets',
        'role',
    );


/**
 * =========================================================
 * PANEL STORAGE
 * =========================================================
 */

const GAME_ROLE_PANEL_KEY_PREFIX =
    'gameRolePanel:';


function getPanelKey(
    guildId,
) {
    return `${GAME_ROLE_PANEL_KEY_PREFIX}${guildId}`;
}


/**
 * =========================================================
 * NOTIFICATION DEDUPE
 * =========================================================
 *
 * Có 2 nguồn notification:
 *
 * 1. Reaction -> add role -> gửi trực tiếp
 * 2. GuildMemberUpdate -> phát hiện role mới
 *
 * Dedupe để không gửi 2 lần.
 */

const recentRoleNotifications =
    new Map();

const ROLE_NOTIFICATION_DEDUPE_MS =
    5000;


function getNotificationDedupeKey(
    memberId,
    roleId,
) {
    return `${memberId}:${roleId}`;
}


function shouldSkipDuplicateNotification(
    memberId,
    roleId,
) {
    const key =
        getNotificationDedupeKey(
            memberId,
            roleId,
        );

    const now =
        Date.now();

    const previous =
        recentRoleNotifications.get(
            key,
        );

    if (
        previous &&
        now - previous <
            ROLE_NOTIFICATION_DEDUPE_MS
    ) {
        return true;
    }

    recentRoleNotifications.set(
        key,
        now,
    );

    setTimeout(
        () => {
            const stored =
                recentRoleNotifications.get(
                    key,
                );

            if (
                stored === now
            ) {
                recentRoleNotifications.delete(
                    key,
                );
            }
        },
        ROLE_NOTIFICATION_DEDUPE_MS +
            1000,
    );

    return false;
}


/**
 * =========================================================
 * SAVE PANEL
 * =========================================================
 */

export async function saveGameRolePanel(
    client,
    guildId,
    data,
) {
    await client.db.set(
        getPanelKey(
            guildId,
        ),
        {
            guildId,

            channelId:
                data.channelId,

            messageId:
                data.messageId,

            createdAt:
                data.createdAt ??
                new Date().toISOString(),
        },
    );
}


/**
 * =========================================================
 * GET PANEL
 * =========================================================
 */

export async function getGameRolePanel(
    client,
    guildId,
) {
    try {
        if (
            !client?.db
        ) {
            logger.warn(
                'Database unavailable while reading Game Role panel.',
            );

            return null;
        }

        const result =
            await client.db.get(
                getPanelKey(
                    guildId,
                ),
            );

        if (!result) {
            return null;
        }

        /**
         * DB wrapper:
         *
         * {
         *   ok,
         *   value
         * }
         */

        if (
            result?.ok &&
            result?.value
        ) {
            return result.value;
        }

        if (
            result?.value &&
            typeof result.value ===
                'object'
        ) {
            return result.value;
        }

        return result;

    } catch (error) {
        logger.warn(
            'Failed to read Game Role panel from DB:',
            error,
        );

        return null;
    }
}


/**
 * =========================================================
 * CHECK GAME ROLE PANEL
 * =========================================================
 *
 * Ưu tiên:
 *
 * 1. Check messageId trong DB.
 * 2. Nếu DB mất data sau restart:
 *    nhận diện bằng message của bot + title Get Role.
 * 3. Khôi phục panel vào DB.
 */

export async function isGameRolePanelReaction(
    reaction,
    client,
) {
    try {
        const message =
            reaction?.message;

        if (
            !message?.guildId ||
            !message?.id
        ) {
            return false;
        }


        /**
         * Emoji phải thuộc 11 Game Roles.
         */

        const gameRole =
            getGameRoleByEmoji(
                reaction?.emoji,
            );

        if (!gameRole) {
            return false;
        }


        /**
         * =============================================
         * CHECK DATABASE
         * =============================================
         */

        const panel =
            await getGameRolePanel(
                client,
                message.guildId,
            );

        if (
            panel &&
            panel.messageId ===
                message.id &&
            panel.channelId ===
                message.channelId
        ) {
            return true;
        }


        /**
         * =============================================
         * FALLBACK
         * =============================================
         *
         * Panel vẫn còn trên Discord nhưng DB mất.
         */

        if (
            message.author?.id !==
            client.user?.id
        ) {
            return false;
        }


        const embed =
            message.embeds?.[0];

        if (!embed) {
            return false;
        }


        const title =
            embed.title ??
            '';


        if (
            !title.includes(
                '𝓖𝓸́𝓬 𝓵𝓪̂́𝔂 𝓻𝓸𝓵𝓮',
            )
        ) {
            return false;
        }


        logger.warn(
            `Game Role panel ${message.id} detected through fallback.`,
        );


        /**
         * Khôi phục panel vào DB.
         */

        try {
            if (
                client?.db
            ) {
                await saveGameRolePanel(
                    client,
                    message.guildId,
                    {
                        channelId:
                            message.channelId,

                        messageId:
                            message.id,

                        createdAt:
                            new Date().toISOString(),
                    },
                );

                logger.info(
                    `Recovered Game Role panel ${message.id} into database.`,
                );
            }

        } catch (saveError) {
            logger.warn(
                'Could not recover Game Role panel:',
                saveError,
            );
        }


        return true;

    } catch (error) {
        logger.error(
            'Failed to identify Game Role panel:',
            error,
        );

        return false;
    }
}


/**
 * =========================================================
 * GET CONFIG FROM REACTION
 * =========================================================
 */

export function getGameRoleConfigFromReaction(
    reaction,
) {
    return getGameRoleByEmoji(
        reaction?.emoji,
    );
}


/**
 * =========================================================
 * FETCH MEMBER
 * =========================================================
 */

async function fetchGuildMember(
    reaction,
    user,
) {
    const guild =
        reaction?.message?.guild;

    if (!guild) {
        return null;
    }

    const cached =
        guild.members.cache.get(
            user.id,
        );

    if (cached) {
        return cached;
    }

    return await guild.members
        .fetch(
            user.id,
        )
        .catch(
            () =>
                null,
        );
}


/**
 * =========================================================
 * BOT CAN MANAGE ROLE
 * =========================================================
 */

async function canBotManageRole(
    guild,
    role,
) {
    const me =
        guild.members.me ??
        await guild.members
            .fetchMe()
            .catch(
                () =>
                    null,
            );

    if (!me) {
        logger.warn(
            'Could not fetch bot guild member.',
        );

        return false;
    }


    if (
        !me.permissions.has(
            PermissionFlagsBits.ManageRoles,
        )
    ) {
        logger.warn(
            'Bot is missing Manage Roles permission.',
        );

        return false;
    }


    if (
        role.managed
    ) {
        logger.warn(
            `Role ${role.name} is managed and cannot be assigned.`,
        );

        return false;
    }


    if (
        role.position >=
        me.roles.highest.position
    ) {
        logger.warn(
            `Bot role hierarchy too low for ${role.name}. Bot=${me.roles.highest.position}, Role=${role.position}`,
        );

        return false;
    }


    return true;
}


/**
 * =========================================================
 * ADD ROLE FROM REACTION
 * =========================================================
 */

export async function addGameRoleFromReaction(
    reaction,
    user,
) {
    try {
        if (
            !reaction ||
            !user ||
            user.bot
        ) {
            return false;
        }


        const config =
            getGameRoleConfigFromReaction(
                reaction,
            );

        if (!config) {
            logger.warn(
                `Reaction emoji is not mapped to a Game Role: ${reaction?.emoji?.id ?? reaction?.emoji?.name}`,
            );

            return false;
        }


        const guild =
            reaction.message.guild;

        if (!guild) {
            return false;
        }


        const member =
            await fetchGuildMember(
                reaction,
                user,
            );

        if (!member) {
            logger.warn(
                `Could not fetch member ${user.id}.`,
            );

            return false;
        }


        /**
         * =============================================
         * FETCH ROLE
         * =============================================
         */

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
            logger.warn(
                `Game role does not exist: ${config.label} (${config.roleId})`,
            );

            return false;
        }


        /**
         * =============================================
         * PERMISSION CHECK
         * =============================================
         */

        const manageable =
            await canBotManageRole(
                guild,
                role,
            );

        if (!manageable) {
            return false;
        }


        /**
         * =============================================
         * MEMBER ALREADY HAS ROLE
         * =============================================
         */

        if (
            member.roles.cache.has(
                role.id,
            )
        ) {
            logger.info(
                `${member.user.tag} already has Game Role ${role.name}.`,
            );

            return true;
        }


        /**
         * =============================================
         * ADD ROLE
         * =============================================
         */

       /**
 * =============================================
 * ADD ROLE
 * =============================================
 */

await member.roles.add(
    role.id,
    `Game Role reaction: ${config.label}`,
);

logger.info(
    `Discord accepted Game Role add: ${role.name} (${role.id}) -> ${member.user.tag}.`,
);


/**
 * =============================================
 * VERIFY ROLE REALLY EXISTS
 * =============================================
 *
 * Không tin cache ngay sau khi add.
 * Fetch member mới hoàn toàn từ Discord.
 */

await new Promise(
    (resolve) =>
        setTimeout(
            resolve,
            750,
        ),
);


let freshMember =
    await guild.members
        .fetch(
            {
                user:
                    member.id,

                force:
                    true,
            },
        )
        .catch(
            () =>
                null,
        );


if (
    !freshMember
) {
    logger.error(
        `Could not refetch ${member.user.tag} after adding Game Role ${role.name}.`,
    );

    return false;
}


/**
 * Role vừa add nhưng đã biến mất.
 *
 * Có thể do:
 * - reaction bị remove ngay lập tức
 * - bot khác đang gỡ role
 * - automation khác trong server can thiệp
 */

if (
    !freshMember.roles.cache.has(
        role.id,
    )
) {
    logger.warn(
        `Game Role ${role.name} disappeared immediately after assignment for ${member.user.tag}. Retrying once...`,
    );


    /**
     * Retry một lần.
     */

    await freshMember.roles.add(
        role.id,
        `Game Role verification retry: ${config.label}`,
    );


    await new Promise(
        (resolve) =>
            setTimeout(
                resolve,
                750,
            ),
    );


    freshMember =
        await guild.members
            .fetch(
                {
                    user:
                        member.id,

                    force:
                        true,
                },
            )
            .catch(
                () =>
                    null,
            );


    if (
        !freshMember ||
        !freshMember.roles.cache.has(
            role.id,
        )
    ) {
        logger.error(
            `Game Role ${role.name} was removed again after retry for ${member.user.tag}. Another bot/system is most likely removing it.`,
        );

        return false;
    }
}


/**
 * =============================================
 * VERIFIED
 * =============================================
 */

logger.info(
    `Verified Game Role ${role.name} is present on ${member.user.tag}.`,
);


/**
 * Chỉ thông báo SAU KHI verify role còn tồn tại.
 */

await sendGameRoleNotification(
    freshMember,
    role.id,
);


return true;

    } catch (error) {
        logger.error(
            `Failed to add Game Role from reaction for ${user?.tag ?? user?.id}:`,
            error,
        );

        return false;
    }
}


/**
 * =========================================================
 * REMOVE ROLE FROM REACTION
 * =========================================================
 */

export async function removeGameRoleFromReaction(
    reaction,
    user,
) {
    try {
        if (
            !reaction ||
            !user ||
            user.bot
        ) {
            return false;
        }


        const config =
            getGameRoleConfigFromReaction(
                reaction,
            );

        if (!config) {
            return false;
        }


        const guild =
            reaction.message.guild;

        if (!guild) {
            return false;
        }


        const member =
            await fetchGuildMember(
                reaction,
                user,
            );

        if (!member) {
            return false;
        }


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
            return false;
        }


        const manageable =
            await canBotManageRole(
                guild,
                role,
            );

        if (!manageable) {
            return false;
        }


        if (
            !member.roles.cache.has(
                role.id,
            )
        ) {
            return true;
        }


        await member.roles.remove(
            role,
            `Game Role reaction removed: ${config.label}`,
        );


        logger.info(
            `Removed Game Role ${role.name} (${role.id}) from ${member.user.tag}.`,
        );


        /**
         * Gỡ role KHÔNG gửi notification.
         */

        return true;

    } catch (error) {
        logger.error(
            `Failed to remove Game Role from reaction for ${user?.tag ?? user?.id}:`,
            error,
        );

        return false;
    }
}


/**
 * =========================================================
 * ROLE IMAGE
 * =========================================================
 */

function getRoleImagePath(
    config,
) {
    if (
        !config?.image
    ) {
        return null;
    }


    const imagePath =
        path.join(
            ROLE_ASSET_DIRECTORY,
            config.image,
        );


    if (
        !fs.existsSync(
            imagePath,
        )
    ) {
        logger.warn(
            `Game Role image not found: ${imagePath}`,
        );

        return null;
    }


    return imagePath;
}


/**
 * =========================================================
 * SEND GAME ROLE NOTIFICATION
 * =========================================================
 */

export async function sendGameRoleNotification(
    member,
    roleId,
) {
    try {
        if (
            !member?.guild ||
            !member?.user
        ) {
            return false;
        }


        if (
            member.user.bot
        ) {
            return false;
        }


        /**
         * =============================================
         * DEDUPE
         * =============================================
         */

        if (
            shouldSkipDuplicateNotification(
                member.id,
                roleId,
            )
        ) {
            logger.debug(
                `Skipped duplicate Game Role notification: member=${member.id}, role=${roleId}`,
            );

            return false;
        }


        /**
         * =============================================
         * CONFIG
         * =============================================
         */

        const config =
            getGameRoleByRoleId(
                roleId,
            );

        if (!config) {
            logger.warn(
                `Notification ignored because role ${roleId} is not a configured Game Role.`,
            );

            return false;
        }


        const guild =
            member.guild;


        /**
         * =============================================
         * NOTIFICATION CHANNEL
         * =============================================
         */

        const notificationChannel =
            guild.channels.cache.get(
                GAME_ROLE_NOTIFICATION_CHANNEL_ID,
            ) ??
            await guild.channels
                .fetch(
                    GAME_ROLE_NOTIFICATION_CHANNEL_ID,
                )
                .catch(
                    () =>
                        null,
                );


        if (
            !notificationChannel ||
            !notificationChannel.isTextBased?.()
        ) {
            logger.warn(
                `Game Role notification channel not found: ${GAME_ROLE_NOTIFICATION_CHANNEL_ID}`,
            );

            return false;
        }


        /**
         * =============================================
         * BOT MEMBER
         * =============================================
         */

        const botMember =
            guild.members.me ??
            await guild.members
                .fetchMe()
                .catch(
                    () =>
                        null,
                );


        if (!botMember) {
            logger.warn(
                'Could not fetch bot member before notification.',
            );

            return false;
        }


        /**
         * =============================================
         * CHANNEL PERMISSIONS
         * =============================================
         */

        const permissions =
            notificationChannel.permissionsFor(
                botMember,
            );


        const requiredPermissions = [
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
                PermissionFlagsBits.AttachFiles,
                'Attach Files',
            ],
        ];


        const missingPermissions =
            requiredPermissions
                .filter(
                    ([permission]) =>
                        !permissions?.has(
                            permission,
                        ),
                )
                .map(
                    ([, label]) =>
                        label,
                );


        if (
            missingPermissions.length >
            0
        ) {
            logger.warn(
                `Game Role notification channel missing permissions: ${missingPermissions.join(', ')}`,
            );

            return false;
        }


        /**
         * =============================================
         * DESCRIPTION
         * =============================================
         */

        let description =
            `<a:heartg5:1546906071199907972> Chúc mừng ${member} đã được cấp role <@&${config.roleId}> và nhận được những đặc quyền liên quan đến role.`;


        /**
         * Role bình thường có channel.
         */

        if (
            config.channelId
        ) {
            description +=
                ` Đồng thời mở khóa kênh <#${config.channelId}>!`;
        }

        /**
         * Không Thích Chơi Game.
         */

        else {
            description +=
                '!';
        }


        description +=
            '\n\n<a:heartg5:1546906071199907972> Chúc bạn chơi zui zẻ ở server bọn mình và nhớ chăm chỉ up level để nhận thưởng khi đạt mốc 300 nhé!';


        /**
         * =============================================
         * EMBED
         * =============================================
         */

        const embed =
            new EmbedBuilder()
                .setTitle(
                    '<a:trangtrig2:1546040703375904801> 𝓡𝓸𝓵𝓮𝓼 𝓱𝓪𝓿𝓮 𝓬𝓱𝓪𝓷𝓰𝓮𝓭 <a:trangtrig3:1546040818261954610>',
                )
                .setDescription(
                    description,
                )
                .setColor(
                    GAME_ROLE_EMBED_COLOR,
                );


        /**
         * =============================================
         * IMAGE
         * =============================================
         */

        const imagePath =
            getRoleImagePath(
                config,
            );


        const files = [];


        if (
            imagePath
        ) {
            const attachmentName =
                `game-role-${config.key}.png`;


            files.push(
                new AttachmentBuilder(
                    imagePath,
                    {
                        name:
                            attachmentName,
                    },
                ),
            );


            embed.setImage(
                `attachment://${attachmentName}`,
            );
        }


        /**
         * =============================================
         * SEND
         * =============================================
         */

        await notificationChannel.send({
            embeds: [
                embed,
            ],

            files,

            allowedMentions: {
                users: [
                    member.id,
                ],

                roles: [],
            },
        });


        logger.info(
            `Sent Game Role notification: ${member.user.tag} -> ${config.label}`,
        );


        return true;

    } catch (error) {
        logger.error(
            `Failed to send Game Role notification for member=${member?.id}, role=${roleId}:`,
            error,
        );

        return false;
    }
}


/**
 * =========================================================
 * ADD ALL PANEL REACTIONS
 * =========================================================
 */

export async function addAllGameRoleReactions(
    message,
) {
    for (
        const config
        of GAME_ROLES
    ) {
        try {
            await message.react(
                getReactionToken(
                    config,
                ),
            );


            logger.debug(
                `Added panel emoji ${config.label}: ${config.emoji.id ?? config.emoji.name}`,
            );

        } catch (error) {
            logger.error(
                `Failed to react ${config.label} (${config.emoji.id ?? config.emoji.name}):`,
                error,
            );
        }
    }
}
