import {
    Events,
    PermissionFlagsBits,
} from 'discord.js';

import {
    getGameRoleByEmoji,
} from '../config/gameRoles.js';

import {
    sendGameRoleNotification,
} from '../services/gameRoleService.js';

import {
    logger,
} from '../utils/logger.js';


export default {

    name: Events.MessageReactionAdd,

    once: false,


    async execute(
        reaction,
        user,
    ) {
        try {

            // =================================================
            // IGNORE BOT
            // =================================================

            if (
                !user ||
                user.bot
            ) {
                return;
            }


            // =================================================
            // FETCH PARTIAL REACTION
            // =================================================

            if (
                reaction.partial
            ) {
                try {
                    await reaction.fetch();
                } catch {
                    return;
                }
            }


            // =================================================
            // FETCH MESSAGE
            // =================================================

            let message =
                reaction.message;

            try {
                if (
                    message.partial
                ) {
                    message =
                        await message.fetch();
                }
            } catch {
                return;
            }


            // =================================================
            // GUILD ONLY
            // =================================================

            const guild =
                message.guild;

            if (!guild) {
                return;
            }


            // =================================================
            // MAP EMOJI -> ROLE CONFIG
            // =================================================

            const config =
                getGameRoleByEmoji(
                    reaction.emoji,
                );

            if (!config) {
                return;
            }


            // =================================================
            // CHỈ NHẬN PANEL GET ROLE CỦA BOT
            // =================================================

            const botId =
                guild.members.me?.id;

            if (
                !botId ||
                message.author?.id !==
                    botId
            ) {
                return;
            }


            const panelTitle =
                message.embeds?.[0]?.title ??
                '';

            if (
                !panelTitle.includes(
                    '𝓖𝓸́𝓬 𝓵𝓪̂́𝔂 𝓻𝓸𝓵𝓮',
                )
            ) {
                return;
            }


            // =================================================
            // FETCH MEMBER TỪ DISCORD
            // =================================================

            const member =
                await guild.members
                    .fetch(
                        user.id,
                    )
                    .catch(
                        () =>
                            null,
                    );

            if (!member) {
                logger.warn(
                    `[GAME ROLE] Không lấy được member ${user.id}.`,
                );

                return;
            }


            // =================================================
            // FETCH ROLE
            // =================================================

            const role =
                await guild.roles
                    .fetch(
                        config.roleId,
                    )
                    .catch(
                        () =>
                            null,
                    );

            if (!role || role.managed || role.id === guild.id) {
                logger.warn(
                    `[GAME ROLE] Không tìm thấy role ${config.roleId}.`,
                );

                return;
            }


            // =================================================
            // CHECK BOT MEMBER
            // =================================================

            const botMember =
                guild.members.me ??
                await guild.members
                    .fetchMe()
                    .catch(
                        () =>
                            null,
                    );

            if (!botMember) {
                return;
            }


            // =================================================
            // CHECK MANAGE ROLES
            // =================================================

            if (
                !botMember.permissions.has(
                    PermissionFlagsBits.ManageRoles,
                )
            ) {
                logger.warn(
                    '[GAME ROLE] Bot thiếu quyền Manage Roles.',
                );

                return;
            }


            // =================================================
            // CHECK ROLE HIERARCHY
            // =================================================

            if (
                role.position >=
                botMember.roles.highest.position
            ) {
                logger.warn(
                    `[GAME ROLE] Role bot thấp hơn role ${role.name}.`,
                );

                return;
            }


            // =================================================
            // ALREADY HAS ROLE
            // =================================================

            if (
                member.roles.cache.has(
                    role.id,
                )
            ) {
                return;
            }


            // =================================================
            // ADD ROLE
            // =================================================

            await member.roles.add(
                role.id,
                `Game Role reaction: ${config.label}`,
            );


            // =================================================
            // VERIFY ROLE
            // =================================================

            const freshMember =
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
                logger.warn(
                    `[GAME ROLE] Discord không giữ lại role ${role.name} sau khi add.`,
                );

                return;
            }


            // =================================================
            // SUCCESS
            // =================================================

            logger.info(
                `[GAME ROLE] Đã cấp ${role.name} cho ${freshMember.user.tag}.`,
            );


            // =================================================
            // NOTIFICATION
            // =================================================

            await sendGameRoleNotification(
                freshMember,
                role.id,
            );

        } catch (error) {
            logger.error(
                '[GAME ROLE] Lỗi cấp role từ reaction:',
                error,
            );
        }
    },
};
