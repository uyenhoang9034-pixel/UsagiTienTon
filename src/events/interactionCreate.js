import { Events } from 'discord.js';

import { logger } from '../utils/logger.js';

import {
  getGuildConfig,
} from '../services/config/guildConfig.js';

import {
  getBotMessage,
  isBotOwner,
  isCommandCategoryEnabled,
  isMaintenanceMode,
} from '../config/bot.js';

import botConfig from '../config/bot.js';

import {
  handleInteractionError,
  createError,
  ErrorTypes,
  ErrorCodes,
} from '../utils/errorHandler.js';

import {
  InteractionHelper,
} from '../utils/interactionHelper.js';

import {
  createInteractionTraceContext,
  runWithTraceContext,
} from '../utils/logger.js';

import {
  validateChatInputPayloadOrThrow,
} from '../utils/commandInputValidation.js';

import {
  enforceAbuseProtection,
  formatCooldownDuration,
} from '../utils/abuseProtection.js';

import {
  isCommandEnabled,
} from '../services/commandAccessService.js';

import {
  resolveSlashAccessKey,
} from '../utils/messageAdapter.js';

import {
  ResponseCoordinator,
} from '../utils/responseCoordinator.js';

import {
  enforceDefaultCommandPermissions,
} from '../utils/permissionGuard.js';


const COMMAND_ERROR_SUBTYPES = {
  warn: 'warn_failed',
  kick: 'kick_failed',
  ban: 'ban_failed',
  unban: 'unban_failed',
  timeout: 'timeout_failed',
  untimeout: 'untimeout_failed',
  warnings: 'warnings_view_failed',
  ticket: 'ticket_failed',
  serverstats: 'serverstats_failed',
  gcreate: 'giveaway_failed',
  gend: 'giveaway_failed',
  gdelete: 'giveaway_failed',
  greroll: 'giveaway_failed',
};


function withTraceContext(
  context = {},
  traceContext = {},
) {
  return {
    traceId:
      traceContext.traceId,

    guildId:
      context.guildId ||
      traceContext.guildId,

    userId:
      context.userId ||
      traceContext.userId,

    command:
      context.commandName ||
      traceContext.command,

    ...context,
  };
}


export default {
  name: Events.InteractionCreate,

  async execute(
    interaction,
    client,
  ) {
    const interactionTraceContext =
      createInteractionTraceContext(
        interaction,
      );

    interaction.traceContext =
      interactionTraceContext;

    interaction.traceId =
      interactionTraceContext.traceId;


    return runWithTraceContext(
      interactionTraceContext,

      async () => {
        try {
          /**
           * ===============================================
           * PATCH RESPONSE HANDLING
           * ===============================================
           */

          InteractionHelper
            .patchInteractionResponses(
              interaction,
            );

          ResponseCoordinator.attach(
            interaction,
          );


          /**
           * ===============================================
           * SLASH COMMAND
           * ===============================================
           */

          if (
            interaction.isChatInputCommand()
          ) {
            try {
              logger.info(
                `Command executed: /${interaction.commandName} by ${interaction.user.tag}`,
                {
                  event:
                    'interaction.command.received',

                  traceId:
                    interactionTraceContext.traceId,

                  guildId:
                    interaction.guildId,

                  userId:
                    interaction.user?.id,

                  command:
                    interaction.commandName,
                },
              );


              validateChatInputPayloadOrThrow(
                interaction,

                withTraceContext(
                  {
                    type:
                      'command_input_validation',

                    commandName:
                      interaction.commandName,
                  },

                  interactionTraceContext,
                ),
              );


              const command =
                client.commands.get(
                  interaction.commandName,
                );


              if (!command) {
                throw createError(
                  `No command matching ${interaction.commandName} was found.`,

                  ErrorTypes.CONFIGURATION,

                  'Sorry, that command does not exist.',

                  withTraceContext(
                    {
                      commandName:
                        interaction.commandName,
                    },

                    interactionTraceContext,
                  ),
                );
              }


              /**
               * ===========================================
               * MAINTENANCE
               * ===========================================
               */

              if (
                isMaintenanceMode() &&
                !isBotOwner(
                  interaction.user.id,
                )
              ) {
                throw createError(
                  'Bot is in maintenance mode',

                  ErrorTypes.CONFIGURATION,

                  getBotMessage(
                    'maintenanceMode',
                  ),

                  withTraceContext(
                    {
                      commandName:
                        interaction.commandName,
                    },

                    interactionTraceContext,
                  ),
                );
              }


              /**
               * ===========================================
               * CATEGORY ENABLED
               * ===========================================
               */

              if (
                !isCommandCategoryEnabled(
                  command.category,
                )
              ) {
                throw createError(
                  `Feature disabled for category ${command.category}`,

                  ErrorTypes.CONFIGURATION,

                  getBotMessage(
                    'commandDisabled',
                  ),

                  withTraceContext(
                    {
                      commandName:
                        interaction.commandName,

                      category:
                        command.category,
                    },

                    interactionTraceContext,
                  ),
                );
              }


              /**
               * ===========================================
               * DEFAULT COOLDOWN
               * ===========================================
               */

              const defaultCooldownSec =
                Number(
                  botConfig.commands
                    ?.defaultCooldown,
                ) || 0;


              if (
                defaultCooldownSec > 0 &&
                !isBotOwner(
                  interaction.user.id,
                )
              ) {
                const cooldownKey =
                  `${interaction.user.id}:${interaction.commandName}`;

                const expiresAt =
                  client.cooldowns.get(
                    cooldownKey,
                  );


                if (
                  expiresAt &&
                  Date.now() < expiresAt
                ) {
                  const remainingSec =
                    Math.ceil(
                      (
                        expiresAt -
                        Date.now()
                      ) / 1000,
                    );


                  throw createError(
                    `Default command cooldown active for ${interaction.commandName}`,

                    ErrorTypes.RATE_LIMIT,

                    getBotMessage(
                      'cooldownActive',
                      {
                        time:
                          `${remainingSec}s`,
                      },
                    ),

                    withTraceContext(
                      {
                        commandName:
                          interaction.commandName,

                        remainingSec,
                      },

                      interactionTraceContext,
                    ),
                  );
                }


                client.cooldowns.set(
                  cooldownKey,

                  Date.now() +
                    defaultCooldownSec *
                      1000,
                );
              }


              /**
               * ===========================================
               * ABUSE PROTECTION
               * ===========================================
               */

              const abuseProtection =
                await enforceAbuseProtection(
                  interaction,
                  command,
                  interaction.commandName,
                );


              if (
                !abuseProtection.allowed
              ) {
                const formattedCooldown =
                  formatCooldownDuration(
                    abuseProtection
                      .remainingMs,
                  );


                throw createError(
                  `Risky command cooldown active for ${interaction.commandName}`,

                  ErrorTypes.RATE_LIMIT,

                  `This command is on cooldown. Please wait ${formattedCooldown} before trying again.`,

                  withTraceContext(
                    {
                      commandName:
                        interaction.commandName,

                      subtype:
                        'command_cooldown',

                      expected:
                        true,

                      cooldownMs:
                        abuseProtection
                          .remainingMs,

                      cooldownWindowMs:
                        abuseProtection
                          .policy?.windowMs,

                      cooldownMaxAttempts:
                        abuseProtection
                          .policy?.maxAttempts,
                    },

                    interactionTraceContext,
                  ),
                );
              }


              /**
               * ===========================================
               * GUILD CONFIG / COMMAND ACCESS
               * ===========================================
               */

              let guildConfig =
                null;


              if (
                interaction.guild
              ) {
                guildConfig =
                  await getGuildConfig(
                    client,

                    interaction.guild.id,

                    interactionTraceContext,
                  );


                const accessKey =
                  resolveSlashAccessKey(
                    interaction,
                  );


                if (
                  !(
                    await isCommandEnabled(
                      client,

                      interaction.guild.id,

                      accessKey,

                      command.category,
                    )
                  )
                ) {
                  throw createError(
                    `Command ${accessKey} is disabled in this guild`,

                    ErrorTypes.CONFIGURATION,

                    'This command has been disabled for this server.',

                    withTraceContext(
                      {
                        commandName:
                          accessKey,

                        guildId:
                          interaction.guild.id,
                      },

                      interactionTraceContext,
                    ),
                  );
                }
              }


              /**
               * ===========================================
               * PERMISSIONS
               * ===========================================
               */

              const permissionAllowed =
                await enforceDefaultCommandPermissions(
                  interaction,

                  command,

                  {
                    source:
                      'interactionCreate',

                    guildConfig,
                  },
                );


              if (
                !permissionAllowed
              ) {
                return;
              }


              /**
               * ===========================================
               * EXECUTE COMMAND
               * ===========================================
               *
               * Thứ tự này đúng với các command:
               *
               * execute(interaction, config, client)
               */

              await command.execute(
                interaction,
                guildConfig,
                client,
              );
            } catch (error) {
              await handleInteractionError(
                interaction,

                error,

                withTraceContext(
                  {
                    type:
                      'command',

                    commandName:
                      interaction.commandName,

                    subtype:
                      COMMAND_ERROR_SUBTYPES[
                        interaction
                          .commandName
                      ] ||
                      error?.context
                        ?.subtype,
                  },

                  interactionTraceContext,
                ),
              );
            }
          }


          /**
           * ===============================================
           * AUTOCOMPLETE
           * ===============================================
           */

          else if (
            interaction.isAutocomplete()
          ) {
            const command =
              client.commands.get(
                interaction.commandName,
              );


            if (
              command?.autocomplete
            ) {
              await command.autocomplete(
                interaction,
                client,
              );
            } else {
              await interaction.respond(
                [],
              );
            }
          }


          /**
           * ===============================================
           * BUTTON / SELECT MENU / MODAL
           * ===============================================
           */

          else {
            const collection =
              interaction.isButton()
                ? client.buttons

                : interaction
                    .isStringSelectMenu()
                  ? client.selectMenus

                  : interaction
                      .isModalSubmit()
                    ? client.modals

                    : null;


            if (!collection) {
              return;
            }


            /**
             * Hỗ trợ customId dạng:
             *
             * music_pause
             *
             * hoặc:
             *
             * command:argument
             */

            const [
              id,
              ...args
            ] =
              (
                interaction.customId ||
                ''
              ).split(':');


            const handler =
              collection.get(
                id,
              );


            /**
             * Nếu không có handler:
             *
             * KHÔNG reply lỗi ở đây.
             *
             * Vì component đó có thể đang được
             * MessageComponentCollector xử lý.
             */

            if (!handler) {
              return;
            }


            await handler.execute(
              interaction,
              client,
              args,
            );
          }
        } catch (error) {
          /**
           * ===============================================
           * GLOBAL INTERACTION ERROR
           * ===============================================
           */

          logger.error(
            'Unhandled error in interactionCreate:',
            {
              event:
                'interaction.unhandled_error',

              errorCode:
                ErrorCodes
                  .INTERACTION_UNHANDLED,

              error,

              traceId:
                interactionTraceContext
                  .traceId,

              interactionId:
                interaction.id,

              guildId:
                interaction.guildId,

              userId:
                interaction.user?.id,
            },
          );


          try {
            await handleInteractionError(
              interaction,

              error,

              withTraceContext(
                {
                  type:
                    'interaction',

                  commandName:
                    interaction.commandName,

                  customId:
                    interaction.customId,

                  source:
                    'interactionCreate.unhandled',
                },

                interactionTraceContext,
              ),
            );
          } catch (replyError) {
            logger.error(
              'Failed to send fallback error response:',
              {
                event:
                  'interaction.error_response_failed',

                errorCode:
                  ErrorCodes
                    .INTERACTION_RESPONSE_FAILED,

                error:
                  replyError,

                traceId:
                  interactionTraceContext
                    .traceId,
              },
            );
          }
        }
      },
    );
  },
};
